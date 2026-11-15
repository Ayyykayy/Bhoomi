
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.health import router as health_router
from app.routers.observations import router as observations_router
from app.routers.geocoding import router as geocoding_router
from app.routers.climate import router as climate_router

app = FastAPI(
    title="BHOOMI API",
    description="NASA-powered Agricultural Intelligence Backend",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(observations_router, prefix="/api")
app.include_router(geocoding_router, prefix="/api")
app.include_router(climate_router, prefix="/api")
