"""Global MODIS point NDVI through NASA ORNL; no image-color estimates or gap filling."""
import math
from datetime import datetime, timedelta, timezone
from threading import RLock
import requests
from cachetools import TTLCache
from fastapi import HTTPException

BASE = "https://modis.ornl.gov/rst/api/v1/MOD13Q1/"
CACHE = TTLCache(maxsize=256, ttl=3600)
LOCK = RLock()
BANDS = {"250m_16_days_NDVI": "raw", "250m_16_days_VI_Quality": "qa", "250m_16_days_pixel_reliability": "reliability"}

def _date(value):
    try:
        return datetime.strptime(value.replace("-", ""), "%Y%m%d").date()
    except (ValueError, AttributeError):
        raise HTTPException(422, "Dates must use YYYYMMDD or YYYY-MM-DD")

def _request(resource, params):
    try:
        response = requests.get(BASE + resource, params=params, headers={"Accept": "application/json"}, timeout=(5, 20))
        response.raise_for_status()
        return response.json(), response.url
    except requests.Timeout:
        raise HTTPException(504, "NASA NDVI service timed out. Please try again.")
    except (requests.RequestException, ValueError):
        raise HTTPException(502, "NASA NDVI service is unavailable or returned an invalid response. Please try again.")

def normalize(payload):
    if payload.get("nrows") != 1 or payload.get("ncols") != 1 or not isinstance(payload.get("subset"), list):
        raise HTTPException(502, "NASA did not return the requested single-pixel subset")
    grouped = {}
    for item in payload["subset"]:
        name = BANDS.get(item.get("band"))
        if not name: continue
        date = item.get("calendar_date")
        if not isinstance(date, str): continue
        row = grouped.setdefault(date, {"date": date, "tile": item.get("tile")})
        values = item.get("data")
        row[name] = values[0] if isinstance(values, list) and len(values) == 1 else None
    result = []
    for date, row in sorted(grouped.items()):
        raw, qa, rel = row.get("raw"), row.get("qa"), row.get("reliability")
        reasons = []
        if not isinstance(raw, (int, float)) or isinstance(raw, bool) or not math.isfinite(raw) or not -2000 <= raw <= 10000:
            reasons.append("missing_or_invalid_ndvi")
        if type(rel) is not int or rel not in (0, 1): reasons.append("cloud_snow_or_unreliable")
        if type(qa) is not int or not 0 <= qa <= 65534:
            reasons.append("missing_quality")
        else:
            if (qa & 3) > 1: reasons.append("poor_modland_quality")
            if ((qa >> 2) & 15) > 2: reasons.append("low_usefulness")
            if ((qa >> 6) & 3) == 3: reasons.append("high_aerosol")
            if qa & (1 << 8): reasons.append("adjacent_cloud")
            if qa & (1 << 10): reasons.append("mixed_cloud")
            if qa & (1 << 14): reasons.append("snow")
            if qa & (1 << 15): reasons.append("shadow")
            if ((qa >> 11) & 7) != 1: reasons.append("non_land")
        result.append({"date": date, "value": None if reasons else round(raw * 0.0001, 4),
                       "rawValue": raw, "qa": qa, "pixelReliability": rel, "tile": row.get("tile"),
                       "quality": "rejected" if reasons else "good" if rel == 0 and (qa & 3) == 0 else "marginal", "reasons": reasons})
    return result

def get_ndvi(lat, lon, start=None, end=None):
    if not math.isfinite(lat) or not math.isfinite(lon) or not -90 <= lat <= 90 or not -180 <= lon <= 180:
        raise HTTPException(422, "Invalid coordinates")
    today = datetime.now(timezone.utc).date()
    start = _date(start) if start else today - timedelta(days=120)
    end = _date(end) if end else today
    if start > end or (end-start).days > 366 or end > today:
        raise HTTPException(422, "Use a completed date range of at most 366 days")
    key = (lat, lon, start.isoformat(), end.isoformat())
    with LOCK:
        if key in CACHE: return CACHE[key]
    params = {"latitude": lat, "longitude": lon}
    date_key = (lat, lon, "dates")
    with LOCK: dates = CACHE.get(date_key)
    if dates is None:
        payload, _ = _request("dates", params)
        dates = payload.get("dates")
        if not isinstance(dates, list): raise HTTPException(502, "NASA returned an invalid composite-date list")
        with LOCK: CACHE[date_key] = dates
    selected = sorted([d for d in dates if isinstance(d, dict) and isinstance(d.get("calendar_date"), str) and start.isoformat() <= d["calendar_date"] <= end.isoformat() and isinstance(d.get("modis_date"), str)], key=lambda d: d["calendar_date"])
    records, urls = [], []
    # ORNL accepts at most ten composites per synchronous subset request.
    for offset in range(0, len(selected), 10):
        chunk = selected[offset:offset+10]
        payload, url = _request("subset", {**params, "startDate": chunk[0]["modis_date"], "endDate": chunk[-1]["modis_date"], "kmAboveBelow": 0, "kmLeftRight": 0})
        records.extend(normalize(payload)); urls.append(url)
    records = sorted({r["date"]: r for r in records if start.isoformat() <= r["date"] <= end.isoformat()}.values(), key=lambda r: r["date"])
    valid = [r for r in records if r["value"] is not None]
    latest = valid[-1] if valid else None
    result = {"success": True, "status": ("available_with_caution" if latest["quality"] == "marginal" else "available") if latest else "no_valid_observations",
              "mode": "automatic_point", "latest": latest, "records": records,
              "source": "NASA MODIS Terra via ORNL DAAC", "sourceUrl": urls[-1] if urls else BASE+"dates", "requestUrls": urls,
              "product": "MOD13Q1", "location": {"latitude": lat, "longitude": lon},
              "requestedPeriod": {"start": start.isoformat(), "end": end.isoformat()}, "compositeDays": 16, "resolution": "250 m nominal",
              "retrievedAt": datetime.now(timezone.utc).isoformat(), "acceptedCount": len(valid), "sampleCount": len(records),
              "qualityPolicy": "Reliability 0 or 1, MODLAND 0 or 1, usefulness 0–2; exclude high aerosol, clouds, snow, shadow and non-land. No gap filling.",
              "message": "Automatically retrieved point sample, not a polygon average. Dates are 16-day composite start dates. Cloudy, missing and low-quality samples are excluded." if latest else "No usable NDVI samples in this period. The location may have missing coverage, non-land pixels or quality-filtered observations."}
    with LOCK: CACHE[key] = result
    return result
