
from fastapi import APIRouter

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "application": "BHOOMI",
        "version": "0.1.0"
    }
