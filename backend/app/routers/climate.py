from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query
from app.services.nasa_power import fetch_nasa_power

router = APIRouter(prefix="/climate", tags=["Climate"])

@router.get("")
async def get_climate(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    end_date = date.today() - timedelta(days=3)
    start_date = end_date - timedelta(days=30)
    try:
        data = await fetch_nasa_power(lat, lon, start_date, end_date)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
