# Architecture

## Data flow

1. A user selects a point through the globe or place search.
2. React requests weather and NDVI from FastAPI.
3. FastAPI validates inputs, requests NASA data, normalizes observations and caches responses.
4. Leaflet loads map imagery directly from the selected map provider. Map images and numerical observations are separate integrations.
5. The user draws a polygon and edits scenario assumptions. Frontend calculations produce illustrative comparisons.
6. Saving writes the scenario, results and available source snapshots into browser local storage. Reports can be exported as JSON or printed.

## Components

| Location | Responsibility |
|---|---|
| `bhoomi/src/components/Globe` | MapLibre globe |
| `bhoomi/src/components/Dashboard` | Regional observations, charts and map layers |
| `bhoomi/src/components/Strategy` | Simulator, results, action plan, saved experiments and source pages |
| `bhoomi/src/services` | API clients, simulation calculations and experiment storage |
| `bhoomi/src/hooks/useGibsLayer.js` | NASA imagery catalog, available dates, tile templates and legends |
| `bhoomi/backend/app/main.py` | FastAPI routes and error handling |
| `bhoomi/backend/app/nasa_service.py` | POWER data retrieval and normalization |
| `bhoomi/backend/app/ndvi_service.py` | MODIS point retrieval and quality filtering |
| `bhoomi/backend/tests` | Backend integration checks |

## Quality and scope

- NDVI retains per-sample quality information. Excluded observations remain missing; no invented replacement values are used.
- POWER relative wetness, SMAP map water content and editable simulator moisture are different quantities.
- Polygon drawing does not perform field-wide numerical satellite aggregation.
- Crop outcomes and area-analysis previews remain illustrative. A calibrated crop model, verified recommendations and crop-risk thresholds are future work.
- Saved experiments are browser-local. There are no user accounts or cloud experiment database.
