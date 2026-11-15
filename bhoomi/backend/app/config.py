import os
from dotenv import load_dotenv

load_dotenv()

def normalize_origins(value):
    return list(dict.fromkeys(origin.strip().rstrip('/') for origin in value.split(',') if origin.strip()))

class Settings:
    PROJECT_NAME: str = "BHOOMI NASA Space Apps Backend"
    VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    ALLOWED_ORIGINS: list = normalize_origins(os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
    ))

settings = Settings()
