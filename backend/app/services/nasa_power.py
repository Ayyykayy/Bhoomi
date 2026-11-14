
from datetime import date
from math import isfinite

import httpx

from app.services.data_processor import summarize_observations


NASA_POWER_URL = (
    "https://power.larc.nasa.gov"
    "/api/temporal/daily/point"
)


async def fetch_nasa_power(
    lat: float,
    lon: float,
    start: date,
    end: date,
):
    """
    Fetch historical daily temperature and precipitation
    data from NASA POWER.
    """

    params = {
        "latitude": lat,
        "longitude": lon,
        "start": start.strftime("%Y%m%d"),
        "end": end.strftime("%Y%m%d"),
        "parameters": "T2M,PRECTOTCORR",
        "community": "AG",
        "format": "JSON",
        "time-standard": "UTC",
    }

    # STEP 1: Request data from NASA POWER

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(
            NASA_POWER_URL,
            params=params,
        )

        response.raise_for_status()
        payload = response.json()

    # STEP 2: Validate NASA response

    if not isinstance(payload, dict):
        raise ValueError("Invalid NASA response")

    properties = payload.get("properties")

    if not isinstance(properties, dict):
        raise ValueError("Missing NASA properties")

    parameters = properties.get("parameter")

    if not isinstance(parameters, dict):
        raise ValueError("Missing NASA parameters")

    for name in ("T2M", "PRECTOTCORR"):
        if name not in parameters:
            raise ValueError(f"Missing parameter: {name}")

        if not isinstance(parameters[name], dict):
            raise ValueError(f"Invalid parameter: {name}")

    # STEP 3: Extract measurements

    temperature = parameters["T2M"]
    precipitation = parameters["PRECTOTCORR"]

    metadata = payload.get("parameters", {})

    if not isinstance(metadata, dict):
        metadata = {}

    header = payload.get("header", {})

    if not isinstance(header, dict):
        header = {}

    fill_value = header.get("fill_value", -999)

    # STEP 4: Clean invalid measurements

    def clean(value):
        if value is None or isinstance(value, bool):
            return None

        if not isinstance(value, (int, float)):
            return None

        if not isfinite(value):
            return None

        if value == fill_value or value <= -900:
            return None

        return float(value)

    # STEP 5: Convert NASA dates into daily records

    records = []

    all_dates = sorted(
        set(temperature.keys()) | set(precipitation.keys())
    )

    for day in all_dates:
        formatted_date = date.fromisoformat(
            f"{day[:4]}-{day[4:6]}-{day[6:]}"
        ).isoformat()

        records.append(
            {
                "date": formatted_date,
                "temperature_c": clean(
                    temperature.get(day)
                ),
                "precipitation_mm_day": clean(
                    precipitation.get(day)
                ),
            }
        )

    # STEP 6: Calculate summary statistics

    summary = summarize_observations(records)

    # STEP 7: Extract parameter units

    temperature_info = metadata.get("T2M", {})
    precipitation_info = metadata.get("PRECTOTCORR", {})

    if not isinstance(temperature_info, dict):
        temperature_info = {}

    if not isinstance(precipitation_info, dict):
        precipitation_info = {}

    temperature_unit = temperature_info.get(
        "units", "C"
    )

    precipitation_unit = precipitation_info.get(
        "units", "mm/day"
    )

    # STEP 8: Return structured JSON

    return {
        "location": {
            "latitude": lat,
            "longitude": lon,
        },
        "period": {
            "start": start.isoformat(),
            "end": end.isoformat(),
        },
        "source": "NASA POWER",
        "time_standard": "UTC",
        "units": {
            "temperature": temperature_unit,
            "precipitation": precipitation_unit,
        },
        "summary": summary,
        "records": records,
    }
