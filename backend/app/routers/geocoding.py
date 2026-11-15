from fastapi import APIRouter, Query
from app.services.geocoding import fetch_nominatim_search, fetch_nominatim_reverse

router = APIRouter(tags=["Geocoding"])

@router.get("/geocode")
async def geocode_search(q: str = Query(..., description="Search query")):
    results = await fetch_nominatim_search(q)
    return {"success": True, "results": results}

@router.get("/reverse")
async def geocode_reverse(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180)
):
    result = await fetch_nominatim_reverse(lat, lon)
    return {"success": True, "location": result}
