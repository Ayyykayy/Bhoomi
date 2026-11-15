import logging
import requests
from datetime import datetime, timedelta
from cachetools import TTLCache, cached
from fastapi import HTTPException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bhoomi.nasa_power")

# Cache requests for 1 hour to prevent redundant API calls
nasa_cache = TTLCache(maxsize=100, ttl=3600)

def validate_coordinates(lat: float, lon: float):
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid geographic coordinates: lat={lat}, lon={lon}. Lat must be [-90, 90], Lon must be [-180, 180]."
        )

def generate_date_range(start_str: str, end_str: str):
    try:
        start_date = datetime.strptime(start_str, "%Y%m%d")
        end_date = datetime.strptime(end_str, "%Y%m%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Expected YYYYMMDD."
        )

    if start_date > end_date:
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date."
        )

    dates = []
    curr = start_date
    while curr <= end_date:
        dates.append(curr.strftime("%Y%m%d"))
        curr += timedelta(days=1)
    return dates

@cached(nasa_cache)
def fetch_nasa_power_range(lat: float, lon: float, start: str, end: str):
    """
    Fetch historical daily climate observations from NASA POWER API for a given date range (YYYYMMDD).
    Parameters:
      - lat: Latitude (-90 to 90)
      - lon: Longitude (-180 to 180)
      - start: Start date YYYYMMDD
      - end: End date YYYYMMDD
    Parameters requested:
      - T2M: Temperature at 2 Meters (°C)
      - PRECTOTCORR: Corrected Precipitation (mm/day)
      - RH2M: Relative Humidity at 2 Meters (%)
      - GWETTOP: Surface Soil Wetness (0-1 fraction, root zone top)
      - GWETROOT: Root Zone Soil Moisture (0-1 fraction)
    """
    validate_coordinates(lat, lon)
    expected_dates = generate_date_range(start, end)

    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params = {
        "parameters": "T2M,PRECTOTCORR,RH2M,GWETTOP,GWETROOT",
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": start,
        "end": end,
        "format": "JSON",
        "time-standard": "UTC"
    }

    logger.info(f"Querying NASA POWER API for lat={lat}, lon={lon}, start={start}, end={end}")

    try:
        # Bounded upstream request budget: 12 seconds
        response = requests.get(url, params=params, timeout=12)

        if response.status_code != 200:
            logger.error(f"NASA POWER API returned status {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"NASA POWER API returned error status {response.status_code}"
            )

        data = response.json()
        properties = data.get("properties", {})
        parameter_data = properties.get("parameter", {})

        t2m_dict = parameter_data.get("T2M", {})
        prec_dict = parameter_data.get("PRECTOTCORR", {})
        rh_dict = parameter_data.get("RH2M", {})
        gwettop_dict = parameter_data.get("GWETTOP", {})
        gwetroot_dict = parameter_data.get("GWETROOT", {})

        records = []
        valid_count = 0
        total_count = len(expected_dates)

        for d in expected_dates:
            # Format date YYYYMMDD -> YYYY-MM-DD
            formatted_date = f"{d[:4]}-{d[4:6]}-{d[6:]}"

            t2m_val = t2m_dict.get(d)
            prec_val = prec_dict.get(d)
            rh_val = rh_dict.get(d)
            gwettop_val = gwettop_dict.get(d)
            gwetroot_val = gwetroot_dict.get(d)

            # Handle missing values (-999 or None) without fabricating data
            temp = t2m_val if t2m_val is not None and t2m_val != -999 else None
            prec = prec_val if prec_val is not None and prec_val != -999 else None
            rh = rh_val if rh_val is not None and rh_val != -999 else None
            gwettop = gwettop_val if gwettop_val is not None and gwettop_val != -999 else None
            gwetroot = gwetroot_val if gwetroot_val is not None and gwetroot_val != -999 else None

            if temp is not None or prec is not None or rh is not None or gwettop is not None:
                valid_count += 1

            records.append({
                "date": formatted_date,
                "temperature": {
                    "value": temp,
                    "unit": "°C",
                    "description": "Temperature at 2 Meters"
                },
                "precipitation": {
                    "value": prec,
                    "unit": "mm/day",
                    "description": "Corrected Precipitation"
                },
                "relativeHumidity": {
                    "value": rh,
                    "unit": "%",
                    "description": "Relative Humidity at 2 Meters"
                },
                "soilMoistureTop": {
                    "value": gwettop,
                    "unit": "1",
                    "description": "NASA POWER GWETTOP Surface Soil Wetness (0-1 fraction)"
                },
                "soilMoistureRoot": {
                    "value": gwetroot,
                    "unit": "1",
                    "description": "NASA POWER GWETROOT Root Zone Soil Wetness (0-1 fraction)"
                }
            })

        completeness_pct = round((valid_count / total_count) * 100, 2) if total_count > 0 else 0.0

        return {
            "latitude": lat,
            "longitude": lon,
            "startDate": f"{start[:4]}-{start[4:6]}-{start[6:]}",
            "endDate": f"{end[:4]}-{end[4:6]}-{end[6:]}",
            "timeStandard": "UTC",
            "dataSource": "NASA POWER API (Agroclimatology Community - GEOS-5 FP)",
            "sourceUrl": f"https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR,RH2M,GWETTOP,GWETROOT&community=AG&longitude={lon}&latitude={lat}&start={start}&end={end}&format=JSON&time-standard=UTC",
            "retrievedAt": datetime.utcnow().isoformat() + "Z",
            "completenessPercentage": completeness_pct,
            "records": records
        }

    except requests.exceptions.Timeout as e:
        logger.error(f"NASA POWER API request timed out: {e}")
        raise HTTPException(
            status_code=504,
            detail="NASA POWER telemetry service timed out upstream."
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error communicating with NASA POWER API: {e}")
        raise HTTPException(
            status_code=503,
            detail="Failed to connect to NASA POWER telemetry service."
        )

def fetch_nasa_power_climate(lat: float, lon: float):
    """
    Convenience method for GET /api/climate using a documented recent historical default period
    (past 30 completed days from 35 days ago to 5 days ago).
    """
    end_date = datetime.utcnow() - timedelta(days=5)
    start_date = end_date - timedelta(days=30)

    start_str = start_date.strftime("%Y%m%d")
    end_str = end_date.strftime("%Y%m%d")

    result = fetch_nasa_power_range(lat, lon, start_str, end_str)

    # Return latest available record or summary for /api/climate without fabricating missing values
    records = result.get("records", [])
    valid_records = [r for r in records if r["temperature"]["value"] is not None or r["precipitation"]["value"] is not None or r["relativeHumidity"]["value"] is not None or r["soilMoistureTop"]["value"] is not None]
    latest = valid_records[-1] if valid_records else (records[-1] if records else None)

    return {
        "latitude": lat,
        "longitude": lon,
        "defaultPeriod": {
            "startDate": result["startDate"],
            "endDate": result["endDate"]
        },
        "timeStandard": result["timeStandard"],
        "observationDate": latest["date"] if latest else None,
        "dataSource": result["dataSource"],
        "sourceUrl": result["sourceUrl"],
        "retrievedAt": result["retrievedAt"],
        "latestMeasurement": latest,
        "records": records
    }
