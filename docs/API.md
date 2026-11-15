# Backend API

Local base URL: `http://127.0.0.1:8000`. Interactive schema: `/docs`. Machine-readable schema: `/openapi.json`.

| Method | Route | Parameters | Purpose |
|---|---|---|---|
| GET | `/api/health` | None | Service status |
| GET | `/api/climate` | `lat`, `lon` | Recent historical POWER observations |
| GET | `/api/observations` | `lat`, `lon`, `start`, `end` | POWER observations for a date range |
| GET | `/api/ndvi` | `lat`, `lon`, optional `start`, `end` | Quality-filtered MODIS point observations |
| GET | `/api/geocode` | `q` | Location search |
| GET | `/api/reverse` | `lat`, `lon` | Reverse geocoding |

Dates accept `YYYYMMDD` or `YYYY-MM-DD`. NDVI defaults to a recent 120-day period, supports at most a 366-day difference, and rejects future end dates. Only published composites are returned; latest usable data may be older than weather observations.

## Examples

```text
/api/climate?lat=26.8381&lon=80.9346
/api/observations?lat=26.8381&lon=80.9346&start=20260901&end=20261031
/api/ndvi?lat=26.8381&lon=80.9346
/api/geocode?q=Lucknow
/api/reverse?lat=26.8381&lon=80.9346
```

## Reading responses

POWER responses include nested `records`, `latestByParameter`, `completenessByParameter`, source URLs and units. Weather completeness does not establish availability of all other datasets.

NDVI responses include `latest`, `records`, `acceptedCount`, `sampleCount`, source URLs, quality flags and composite dates. `latest` is null if no usable observation passes the filter. The result is one nominal 250 m point pixel, not a polygon average.

Invalid requests and upstream failures use error responses with `success: false`, `error` and `status_code`. External service failures should be retried; missing observations must not be interpreted as zero.

There are no backend crop-model, account or experiment-database routes in the current implementation.
