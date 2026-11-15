import logging
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.nasa_service import fetch_nasa_power_climate, fetch_nasa_power_range
from app.geocoding_service import fetch_nominatim_search, fetch_nominatim_reverse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bhoomi.api")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Unified Backend API for BHOOMI NASA Space Apps Challenge 2026 - Field Shift: Adapting Farms with NASA Data."
)

# Configure CORS restricted to configured local frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Centralized Exception Handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.warning(f"HTTP error {exc.status_code} on {request.url}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "status_code": 500}
    )

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION
    }

@app.get("/api/geocode")
def geocode_search(
    q: str = Query(..., description="Search query string for locations")
):
    """
    Backend-proxied geocoding route with identification, 24-hour caching, and 1 request/sec rate limiting.
    """
    results = fetch_nominatim_search(q)
    return {
        "success": True,
        "results": results
    }

@app.get("/api/reverse")
def geocode_reverse(
    lat: float = Query(..., description="Latitude between -90 and 90"),
    lon: float = Query(..., description="Longitude between -180 and 180")
):
    """
    Backend-proxied reverse geocoding route for globe clicks.
    """
    result = fetch_nominatim_reverse(lat=lat, lon=lon)
    return {
        "success": True,
        "location": result
    }

@app.get("/api/observations")
def get_observations(
    lat: float = Query(..., description="Latitude between -90 and 90"),
    lon: float = Query(..., description="Longitude between -180 and 180"),
    start: str = Query(..., description="Start date in YYYYMMDD format"),
    end: str = Query(..., description="End date in YYYYMMDD format")
):
    """
    Retrieve historical daily climate observations for explicit start and end dates (YYYYMMDD).
    Includes completeness percentage, units, observation dates, and source traceability.
    """
    result = fetch_nasa_power_range(lat=lat, lon=lon, start=start, end=end)
    return {
        "success": True,
        **result
    }

@app.get("/api/climate")
def get_climate_data(
    lat: float = Query(..., description="Latitude between -90 and 90"),
    lon: float = Query(..., description="Longitude between -180 and 180")
):
    """
    Retrieve climate observations using a documented recent historical default period (past 30 completed days).
    """
    climate_result = fetch_nasa_power_climate(lat=lat, lon=lon)
    return {
        "success": True,
        **climate_result
    }


@app.get("/api/ndvi")
def get_ndvi_data(
    lat: float = Query(...), lon: float = Query(...),
    start: str | None = Query(None), end: str | None = Query(None)
):
    from app.ndvi_service import get_ndvi
    return get_ndvi(lat, lon, start, end)
