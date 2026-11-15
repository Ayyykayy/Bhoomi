
from datetime import date, datetime

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.services.nasa_power import fetch_nasa_power

router = APIRouter(
    prefix="/observations",
    tags=["NASA Observations"],
)


def parse_date(date_str: str) -> date:
    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    raise HTTPException(
        status_code=422,
        detail=f"Invalid date format: {date_str}. Expected YYYY-MM-DD or YYYYMMDD.",
    )


@router.get("")
async def get_observations(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start: str = Query(...),
    end: str = Query(...),
):
    start_date = parse_date(start)
    end_date = parse_date(end)

    if start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="Start date must be before end date.",
        )

    if end_date >= date.today():
        raise HTTPException(
            status_code=422,
            detail="Use historical dates before today.",
        )

    if (end_date - start_date).days > 366:
        raise HTTPException(
            status_code=422,
            detail="Maximum date range is 366 days.",
        )

    try:
        return await fetch_nasa_power(
            lat, lon, start_date, end_date
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
