# BHOOMI

**[Open the live BHOOMI app](https://bhoomi-1-ht53.onrender.com/)**

[![Live demo](https://img.shields.io/badge/Live_Demo-Open_BHOOMI-4285f4)](https://bhoomi-1-ht53.onrender.com/)

Explore agricultural conditions with NASA data, draw a field boundary, compare farming scenarios, and save experiments and action plans.

**Workflow:** Globe → Regional Research → Scenario Lab → Experiment Results → Farm Action Plan.

BHOOMI connects environmental observations to an interactive planning workspace. Farming outcome calculations are currently illustrative, not validated agricultural predictions.

## Try the deployed project

1. Open [BHOOMI](https://bhoomi-1-ht53.onrender.com/).
2. Search for a location or select a point on the globe.
3. Review regional observations and map layers, then open the farming simulator.
4. Draw a polygon, adjust the experiment settings and save to view results and the action plan.

The free backend can sleep after inactivity, so the first API request may take about a minute. Experiments are saved only in the current browser. Crop outcome calculations remain illustrative.

- Website: https://bhoomi-1-ht53.onrender.com/
- Backend health: https://bhoomi-v1bt.onrender.com/api/health
- API documentation: https://bhoomi-v1bt.onrender.com/docs

## Documentation

- [Architecture and technology](docs/ARCHITECTURE.md)
- [Backend API](docs/API.md)
- [Deployment checklist](docs/DEPLOYMENT.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Backend integration notes](bhoomi/backend/BACKEND_INTEGRATION.md)

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

## Configuration

| Setting | Where | Purpose |
|---|---|---|
| `VITE_BACKEND_URL` | Frontend `.env.local` or hosting build settings | Backend address; use HTTPS in production |
| `VITE_MAPTILER_KEY` | Frontend `.env.local` or hosting build settings | MapTiler browser key; restrict permitted origins in your account |
| `ALLOWED_ORIGINS` | Backend environment | Comma-separated frontend origins, with no trailing slash |
| `DEBUG` | Backend environment | Set `False` in production |

`VITE_` settings are included in the browser bundle. Never place a private server credential in them. The connected POWER, ORNL and GIBS integrations do not require the user's Earthdata password.

## Technology

React, Vite, JavaScript, CSS, Lucide, MapLibre GL, MapTiler, Leaflet, Recharts, Python, FastAPI, Requests and Cachetools. GitHub stores source; browser local storage stores experiments.

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

## Data acknowledgements

- [NASA POWER](https://power.larc.nasa.gov/)
- [ORNL DAAC MODIS subsetting service](https://modis.ornl.gov/data/modis_webservice.html)
- [NASA GIBS](https://www.earthdata.nasa.gov/engage/open-data-services-and-software/earthdata-developer-portal/gibs-api)
- [OpenStreetMap](https://www.openstreetmap.org/copyright), Nominatim, MapTiler and Esri World Imagery.

External services retain their own attribution and usage requirements. A deployment needs internet access to those services.
