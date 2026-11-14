
from datetime import date
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from app.services.nasa_power import fetch_nasa_power


@pytest.mark.asyncio
async def test_nasa_power_success():
    sample_payload = {
        "header": {"fill_value": -999},
        "parameters": {
            "T2M": {"units": "C"},
            "PRECTOTCORR": {"units": "mm/day"},
        },
        "properties": {
            "parameter": {
                "T2M": {
                    "20260101": 24.0,
                    "20260102": 26.0,
                },
                "PRECTOTCORR": {
                    "20260101": 2.0,
                    "20260102": 3.0,
                },
            }
        },
    }

    response = httpx.Response(
        200,
        json=sample_payload,
        request=httpx.Request(
            "GET", "https://power.larc.nasa.gov"
        ),
    )

    with patch(
        "app.services.nasa_power.httpx.AsyncClient"
    ) as mock_client:
        client = AsyncMock()
        client.get.return_value = response

        mock_client.return_value.__aenter__.return_value = (
            client
        )

        result = await fetch_nasa_power(
            16.3,
            80.4,
            date(2026, 1, 1),
            date(2026, 1, 2),
        )

    assert len(result["records"]) == 2
    assert result["records"][0]["temperature_c"] == 24.0
    assert result["records"][1]["precipitation_mm_day"] == 3.0
    assert result["source"] == "NASA POWER"
