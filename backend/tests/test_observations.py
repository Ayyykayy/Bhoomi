
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_invalid_latitude():
    response = client.get(
        "/api/observations",
        params={
            "lat": 100,
            "lon": 80.4,
            "start": "2026-01-01",
            "end": "2026-01-07",
        },
    )

    assert response.status_code == 422


def test_invalid_date_range():
    response = client.get(
        "/api/observations",
        params={
            "lat": 16.3,
            "lon": 80.4,
            "start": "2026-01-07",
            "end": "2026-01-01",
        },
    )

    assert response.status_code == 422


def test_missing_coordinates():
    response = client.get(
        "/api/observations",
        params={
            "start": "2026-01-01",
            "end": "2026-01-07",
        },
    )

    assert response.status_code == 422
