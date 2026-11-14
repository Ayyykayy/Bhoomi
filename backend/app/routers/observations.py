
from datetime import date

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.services.nasa_power import fetch_nasa_power

router = APIRouter(
    prefix="/observations",
    tags=["NASA Observations"],
)


@router.get("")
async def get_observations(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start: date = Query(...),
    end: date = Query(...),
):
    if start > end:
        raise HTTPException(
            status_code=422,
            detail="Start date must be before end date.",
        )

    if end >= date.today():
        raise HTTPException(
            status_code=422,
            detail="Use historical dates before today.",
        )

    if (end - start).days > 366:
        raise HTTPException(
            status_code=422,
            detail="Maximum date range is 366 days.",
        )

    try:
        return await fetch_nasa_power(
            lat, lon, start, end
        )

    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="NASA POWER returned an error.",
        )

    except (httpx.RequestError, ValueError, KeyError, TypeError):
        raise HTTPException(
            status_code=502,
            detail="NASA POWER data could not be retrieved.",
        )
