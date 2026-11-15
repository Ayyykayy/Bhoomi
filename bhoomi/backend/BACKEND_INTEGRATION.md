# Backend consolidation

Canonical app: `bhoomi/backend`; run `app.main:app`. The uploaded ZIP was inspected as data without running it.

## Included
- Reused the teammate summary processor and date-format support.
- Adapted weather validation and parsing to the existing nested frontend response.
- Added humidity, complete calendar records, per-measurement coverage and latest dates, caching and safe upstream errors.
- Preserved existing geocoding and CORS configuration rather than replacing them with the ZIP versions.
- Kept current requirements to avoid overwriting the working Python 3.11 environment with a frozen dependency dump.

The archive's `temperature_c`/`precipitation_mm_day` records are available as `flatRecords`; current frontend uses nested `records`. `summary` retains the teammate format.

## Current APIs
- GET /api/health
- GET /api/ndvi?lat=...&lon=...&start=YYYYMMDD&end=YYYYMMDD (dates optional; maximum 366 days)
- GET /api/climate?lat=...&lon=...
- GET /api/observations?lat=...&lon=...&start=YYYYMMDD&end=YYYYMMDD (also accepts ISO dates)
- GET /api/geocode?q=...
- GET /api/reverse?lat=...&lon=...

## Still to develop
Direct SMAP numerical retrieval, crop parameter catalog, documented agricultural simulation and crop comparison, recommendations. POWER modeled wetness and global MODIS point NDVI are connected; they are distinct products. No scientific predictions have been added or implied by this consolidation.

Weather availability does not establish soil/NDVI availability. Weather completeness explicitly excludes unconnected datasets. Existing frontend simulation and area-analysis previews remain illustrative; they are not upgraded by connecting weather.

## Follow-up
Agree dataset access and crop-model scope before implementing scientific outputs. Verify live weather plus search/reverse routes after restarting the correct server. Keep independent dataset failures from breaking weather. Numerical dataset access and display-map overlays are separate integrations.

## Soil wetness connected
The AG daily request now includes GWETTOP and GWETROOT, verified live for Lucknow and Punjab. These are model-based relative saturation (0–1), not volumetric soil moisture or direct SMAP retrievals. Metadata preserves upstream source names, source URL, dates, depth descriptions, returned geometry, per-field coverage, and independent latest values. Missing or invalid soil values remain null while valid weather records remain usable. Global NDVI retrieval is now connected through ORNL DAAC; agricultural simulation remains illustrative. Eight mocked checks pass; live Lucknow 2026-11-10 returned 0.58 surface and 0.63 root-zone wetness. The documented HY community was rejected by the live API during verification and is not used.

## Global NDVI
`app/ndvi_service.py` queries MOD13Q1 dates and one-pixel subsets from NASA ORNL DAAC for the requested coordinates. Raw NDVI is scaled once by 0.0001. Cloud, snow, shadow, non-land and poor-quality observations remain null. Results retain source URLs, dates, quality flags and separate accepted/sample counts. Imported Lucknow JSON is retained as historical reference; automatic retrieval no longer depends on that file. Source readings are saved separately from experiment inputs. Fifteen backend integration checks pass.
