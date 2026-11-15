"""NASA POWER integration, consolidating the reviewed teammate backend.
Preserves BHOOMI's frontend contract and the teammate's flat records/summary.
"""
from datetime import datetime, timedelta, timezone
from math import isfinite
from threading import RLock
from urllib.parse import urlencode

import requests
from cachetools import TTLCache
from fastapi import HTTPException
from app.services.data_processor import summarize_observations

NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
_cache = TTLCache(maxsize=100, ttl=3600)
_cache_lock = RLock()
_FIELDS = {
    "temperature": ("T2M", "°C", "Air temperature at 2 metres"),
    "precipitation": ("PRECTOTCORR", "mm/day", "Corrected daily precipitation"),
    "relativeHumidity": ("RH2M", "%", "Relative humidity at 2 metres"),
    "soilMoistureTop": ("GWETTOP", "1", "Surface soil wetness; relative saturation, not volumetric water content"),
    "soilMoistureRoot": ("GWETROOT", "1", "Root-zone soil wetness; relative saturation, not volumetric water content"),
}

_WEATHER_FIELDS = ("temperature", "precipitation", "relativeHumidity")
_SOIL_FIELDS = ("soilMoistureTop", "soilMoistureRoot")

def validate_coordinates(lat, lon):
    if any(isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v) for v in (lat, lon)) or not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise HTTPException(422, "Latitude must be -90 to 90 and longitude -180 to 180.")

def parse_date(value):
    for fmt in ("%Y%m%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date()
        except (ValueError, TypeError):
            pass
    raise HTTPException(422, "Use YYYYMMDD or YYYY-MM-DD dates.")

def generate_date_range(start, end):
    first, last = parse_date(start), parse_date(end)
    count = (last - first).days + 1
    if count < 1 or count > 366:
        raise HTTPException(422, "Choose an ordered range of 1 to 366 days.")
    if last >= datetime.now(timezone.utc).date():
        raise HTTPException(422, "Use completed historical dates before today.")
    return [(first + timedelta(days=i)).strftime("%Y%m%d") for i in range(count)]

def clean_number(value, fill_value=-999):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not isfinite(value):
        return None
    return None if value == fill_value or value <= -900 else float(value)

def normalize_payload(payload, lat, lon, dates, source_url):
    if not isinstance(payload, dict):
        raise ValueError("Response is not an object")
    parameters = payload.get("properties", {}).get("parameter")
    if not isinstance(parameters, dict):
        raise ValueError("NASA response has no parameter data")
    # Temperature and rainfall are the teammate's required core parameters.
    for name in ("T2M", "PRECTOTCORR"):
        if not isinstance(parameters.get(name), dict):
            raise ValueError("Missing required parameter")
    header = payload.get("header") or {}
    metadata = payload.get("parameters") or {}
    if not isinstance(header, dict) or not isinstance(metadata, dict):
        raise ValueError("Invalid response metadata")
    records, flat_records = [], []
    for day in dates:
        row = {"date": datetime.strptime(day, "%Y%m%d").date().isoformat()}
        for field, (parameter, fallback_unit, description) in _FIELDS.items():
            values = parameters.get(parameter, {})
            info = metadata.get(parameter, {})
            if not isinstance(values, dict) or not isinstance(info, dict):
                if field in _SOIL_FIELDS:
                    values, info = {}, {}
                else:
                    raise ValueError("Invalid parameter data")
            value = clean_number(values.get(day), header.get("fill_value", -999))
            if field in _SOIL_FIELDS and value is not None and not 0 <= value <= 1:
                value = None
            row[field] = {"value": value, "unit": info.get("units") or fallback_unit,
                          "description": description}
        records.append(row)
        flat_records.append({"date": row["date"], "temperature_c": row["temperature"]["value"],
                             "precipitation_mm_day": row["precipitation"]["value"]})
    coverage = {field: round(100 * sum(r[field]["value"] is not None for r in records) / len(records), 2)
                for field in _FIELDS}
    latest_by_parameter = {field: next(({"date": r["date"], **r[field]} for r in reversed(records)
                                      if r[field]["value"] is not None), None)
                           for field in coverage}
    valid = [r for r in records if any(r[field]["value"] is not None for field in _WEATHER_FIELDS)]
    latest = valid[-1] if valid else None
    complete_weather_days = sum(all(r[f]["value"] is not None for f in _WEATHER_FIELDS) for r in records)
    return {
        "latitude": lat, "longitude": lon, "startDate": records[0]["date"], "endDate": records[-1]["date"],
        "timeStandard": "UTC", "dataSource": "NASA POWER (Agroclimatology)", "sourceUrl": source_url,
        "retrievedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "observationDate": latest["date"] if latest else None, "latestMeasurement": latest,
        "latestByParameter": latest_by_parameter, "completenessByParameter": coverage,
        "completenessPercentage": round(100 * complete_weather_days / len(records), 2),
        "completenessScope": "Days with temperature, rainfall and humidity; excludes unconnected datasets",
        "datasetStatus": {"weather": "connected", "soilMoisture": "available" if any(coverage[f] > 0 for f in _SOIL_FIELDS) else "unavailable", "ndvi": "not_connected"},
        "soilMetadata": {
            "source": "NASA POWER model-based land analysis",
            "upstreamSources": header.get("sources", []),
            "kind": "relative_saturation", "unit": "1", "validRange": [0, 1],
            "parameters": {"surface": "GWETTOP", "rootZone": "GWETROOT"},
            "surfaceDepthCm": [0, 5], "rootZoneDepthCm": [0, 100],
            "limitations": "Model-based grid-area estimates, not field measurements or direct SMAP retrievals. Not volumetric moisture. No per-sample quality flags supplied by this POWER response.",
            "returnedGeometry": payload.get("geometry"),
            "sourceUrl": source_url,
        },
        "records": records, "summary": summarize_observations(flat_records),
        "flatRecords": flat_records,
        "location": {"latitude": lat, "longitude": lon},
        "period": {"start": records[0]["date"], "end": records[-1]["date"]},
        "source": "NASA POWER", "time_standard": "UTC",
    }

def fetch_nasa_power_range(lat, lon, start, end):
    validate_coordinates(lat, lon)
    dates = generate_date_range(start, end)
    key = (lat, lon, dates[0], dates[-1])
    with _cache_lock:
        if key in _cache:
            return _cache[key]
    params = {"latitude": lat, "longitude": lon, "start": dates[0], "end": dates[-1],
              "parameters": "T2M,PRECTOTCORR,RH2M,GWETTOP,GWETROOT", "community": "AG", "format": "JSON", "time-standard": "UTC"}
    try:
        response = requests.get(NASA_POWER_URL, params=params, timeout=(3, 10))
        response.raise_for_status()
        result = normalize_payload(response.json(), lat, lon, dates, NASA_POWER_URL + "?" + urlencode(params))
    except requests.exceptions.Timeout as error:
        raise HTTPException(504, "NASA POWER did not respond in time.") from error
    except requests.exceptions.HTTPError as error:
        raise HTTPException(502, "NASA POWER rejected the request.") from error
    except requests.exceptions.RequestException as error:
        raise HTTPException(503, "Could not connect to NASA POWER.") from error
    except (ValueError, TypeError, KeyError, AttributeError) as error:
        raise HTTPException(502, "NASA POWER returned an invalid response.") from error
    with _cache_lock:
        _cache[key] = result
    return result

def fetch_nasa_power_climate(lat, lon):
    end = datetime.now(timezone.utc).date() - timedelta(days=5)
    start = end - timedelta(days=29)
    result = fetch_nasa_power_range(lat, lon, start.isoformat(), end.isoformat())
    return {**result, "defaultPeriod": {"startDate": result["startDate"], "endDate": result["endDate"]}}
