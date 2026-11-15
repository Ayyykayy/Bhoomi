import logging
import time
import requests
from cachetools import TTLCache, cached
from fastapi import HTTPException, Query

logger = logging.getLogger("bhoomi.geocoding")

# Cache geocoding requests for 24 hours to prevent redundant upstream calls
geocoding_cache = TTLCache(maxsize=300, ttl=86400)

last_request_time = 0

@cached(geocoding_cache)
def fetch_nominatim_search(query: str):
    global last_request_time

    # Enforce strict 1 request per second shared rate limit policy
    now = time.time()
    diff = now - last_request_time
    if diff < 1.0:
        time.sleep(1.0 - diff)
    last_request_time = time.time()

    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "format": "json",
        "q": query,
        "limit": 6,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "BhoomiNASAApp/1.0 (Educational Climate Research Platform - Space Apps Challenge)",
        "Accept-Language": "en"
    }

    logger.info(f"Querying Nominatim geocoding API for query: '{query}'")

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code != 200:
            logger.error(f"Nominatim API returned status {response.status_code}: {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"Geocoding upstream service returned error status {response.status_code}"
            )

        data = response.json()
        results = []
        for item in data:
            lat = float(item.get("lat", 0))
            lon = float(item.get("lon", 0))
            address = item.get("address", {})
            country_or_region = address.get("country") or address.get("state") or address.get("region") or item.get("type") or "World"
            display_name = item.get("display_name", "").split(",")[0]
            is_country = bool(address.get("country") and not address.get("city") and not address.get("town") and not address.get("village"))

            results.append({
                "id": f"nominatim-{item.get('place_id')}",
                "name": display_name,
                "country": country_or_region,
                "fullName": item.get("display_name"),
                "lat": lat,
                "lng": lon,
                "isCustom": True,
                "description": (
                    f"Representative center coordinate for {country_or_region} ({lat:.2f}°N, {lon:.2f}°E). Note: Measurements apply to this specific point, not the entire country."
                    if is_country else
                    f"{item.get('display_name')}. Gridded NASA POWER observations will be queried for this location."
                )
            })
        return results

    except requests.exceptions.Timeout:
        logger.error("Nominatim geocoding request timed out after 10 seconds.")
        raise HTTPException(
            status_code=504,
            detail="Geocoding service timed out. Please try again."
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Nominatim network error: {e}")
        raise HTTPException(
            status_code=503,
            detail="Failed to connect to geocoding service."
        )

@cached(geocoding_cache)
def fetch_nominatim_reverse(lat: float, lon: float):
    global last_request_time

    # Enforce strict 1 request per second shared rate limit policy
    now = time.time()
    diff = now - last_request_time
    if diff < 1.0:
        time.sleep(1.0 - diff)
    last_request_time = time.time()

    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "format": "json",
        "lat": lat,
        "lon": lon,
        "zoom": 10,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "BhoomiNASAApp/1.0 (Educational Climate Research Platform - Space Apps Challenge)",
        "Accept-Language": "en"
    }

    logger.info(f"Querying Nominatim reverse geocoding API for lat={lat}, lon={lon}")

    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)

        if response.status_code != 200:
            logger.error(f"Nominatim reverse API returned status {response.status_code}: {response.text}")
            return None

        item = response.json()
        if not item or "error" in item:
            return None

        address = item.get("address", {})
        locality = address.get("city") or address.get("town") or address.get("village") or address.get("hamlet") or address.get("county") or address.get("municipality") or item.get("name") or "Selected Location"
        district = address.get("state_district") or address.get("county") or ""
        state = address.get("state") or address.get("region") or ""
        country = address.get("country") or ""

        parts = [locality]
        if district and district != locality:
            parts.append(district)
        if state and state != district:
            parts.append(state)
        if country:
            parts.append(country)

        display_name = ", ".join(parts)
        country_or_region = state or country or "World"

        return {
            "name": display_name,
            "country": country_or_region,
            "fullName": item.get("display_name", display_name),
            "lat": lat,
            "lng": lon,
            "isCustom": True,
            "description": f"Gridded NASA POWER observations retrieved for exact coordinates ({lat:.4f}, {lon:.4f})."
        }

    except Exception as e:
        logger.error(f"Nominatim reverse network/parsing error: {e}")
        return None
