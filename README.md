# BHOOMI

Explore agricultural conditions with NASA data, draw a field boundary, compare farming scenarios, and save experiments and action plans.

## Project layout

- `bhoomi/`: React + Vite frontend.
- `bhoomi/backend/`: canonical Python FastAPI backend (`app.main:app`).
- The separate local `Backend/` archive is a reference copy, not the running backend.

## Run locally (Windows PowerShell)

Python 3.11 and a Node.js version supported by Vite 8 are required.

Backend, in one terminal:

```powershell
cd bhoomi/backend
py -3.11 -m venv .venv-clean
.\.venv-clean\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-clean\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend, in another terminal from the repository root:

```powershell
cd bhoomi
npm ci
Copy-Item .env.example .env.local
# Set your MapTiler key in .env.local.
npm run dev
```

Open the local URL printed by Vite. Backend CORS defaults allow frontend ports 5173 and 5174. Keep keys and local environment files out of Git.

## Connected data

- NASA POWER: daily temperature, rainfall, humidity and modeled relative soil wetness.
- NASA ORNL DAAC MODIS: automatic point NDVI with quality filtering, composite dates, caching and retries.
- NASA GIBS: SMAP modeled soil-moisture, MODIS NDVI and IMERG precipitation map imagery, with available dates and legends.
- Nominatim search/reverse geocoding, MapLibre/MapTiler globe and Leaflet/Esri detailed maps.

## Features

Regional research, polygon field drawing, collapsible map panels and map-focus mode, editable farming scenarios, baseline comparisons, saved experiments, results, action checklists, source snapshots, JSON export and printing. Experiments are stored in the current browser, not a cloud database.

## Scientific scope

Satellite imagery, point observations and edited scenario inputs are separate. Point readings are not averages across the drawn polygon. MODIS data can be missing or excluded by quality flags; its 16-day composite dates are not real-time weather. POWER relative wetness is not a direct SMAP measurement or root-zone volumetric water content.

Crop harvest, water-demand, stress comparisons and action plans currently use illustrative frontend calculations; they are not validated agricultural predictions. The area-analysis preview is also illustrative. Connecting NASA observations does not validate those calculations.

## Verification

```powershell
cd bhoomi
npm run build
cd backend
.\.venv-clean\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv-clean\Scripts\python.exe -m unittest discover -s tests -p 'test_*integration.py'
```

Final publication checks: frontend production build and 15 backend integration tests passed. Vite reports a bundle-size advisory.
