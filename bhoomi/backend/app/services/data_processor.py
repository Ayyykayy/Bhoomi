
from statistics import mean
from math import isfinite


def valid_number(value):
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and isfinite(value)
    )


def summarize_observations(records):
    temperatures = [
        row["temperature_c"]
        for row in records
        if valid_number(row.get("temperature_c"))
    ]

    precipitation = [
        row["precipitation_mm_day"]
        for row in records
        if valid_number(row.get("precipitation_mm_day"))
    ]

    return {
        "average_temperature_c": (
            round(mean(temperatures), 2)
            if temperatures else None
        ),
        "total_precipitation_mm": (
            round(sum(precipitation), 2)
            if precipitation else None
        ),
        "valid_temperature_days": len(temperatures),
        "valid_precipitation_days": len(precipitation),
        "requested_days": len(records),
        "precipitation_complete": (
            len(precipitation) == len(records)
            and len(records) > 0
        ),
    }
