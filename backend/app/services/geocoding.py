import httpx
from fastapi import HTTPException

async def fetch_nominatim_search(query: str):
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
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                raise HTTPException(status_code=502, detail="Geocoding service upstream error")
            data = response.json()
        except Exception:
            raise HTTPException(status_code=503, detail="Failed to connect to geocoding service")

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
                    f"Representative center coordinate for {country_or_region} ({lat:.2f}°N, {lon:.2f}°E)."
                    if is_country else
                    f"{item.get('display_name')}. Gridded NASA POWER observations will be queried for this location."
                )
            })
        return results

async def fetch_nominatim_reverse(lat: float, lon: float):
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
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code != 200:
                return None
            item = response.json()
        except Exception:
            return None

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
