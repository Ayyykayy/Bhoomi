
from app.services.data_processor import (
    summarize_observations,
)


def test_valid_observations():
    records = [
        {
            "temperature_c": 24.0,
            "precipitation_mm_day": 2.0,
        },
        {
            "temperature_c": 26.0,
            "precipitation_mm_day": 3.0,
        },
    ]

    result = summarize_observations(records)

    assert result["average_temperature_c"] == 25.0
    assert result["total_precipitation_mm"] == 5.0
    assert result["valid_temperature_days"] == 2
    assert result["precipitation_complete"] is True


def test_missing_observations():
    records = [
        {
            "temperature_c": 24.0,
            "precipitation_mm_day": None,
        },
        {
            "temperature_c": None,
            "precipitation_mm_day": 3.0,
        },
    ]

    result = summarize_observations(records)

    assert result["average_temperature_c"] == 24.0
    assert result["total_precipitation_mm"] == 3.0
    assert result["valid_temperature_days"] == 1
    assert result["valid_precipitation_days"] == 1
    assert result["precipitation_complete"] is False


def test_empty_observations():
    result = summarize_observations([])

    assert result["average_temperature_c"] is None
    assert result["total_precipitation_mm"] is None
    assert result["requested_days"] == 0
