# Troubleshooting

## Backend is not running

From the repository root, open a terminal:

```powershell
cd bhoomi/backend
.\.venv-clean\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

If the virtual environment does not exist, follow the first-time setup in the root README. Stop a previous instance with Ctrl+C before restarting. Use the canonical `bhoomi/backend` directory, not the extracted reference archive.

## Data could not load

Check `/api/health`, then the relevant API request. Confirm `VITE_BACKEND_URL`, CORS origins and internet access. NDVI has automatic retries and a retry button in the simulator. A missing or quality-rejected observation is not a zero value.

## MapTiler configuration error

Set `VITE_MAPTILER_KEY` in frontend `.env.local` or hosting build settings. Confirm its allowed origins. Restart Vite locally or rebuild the deployed frontend after changes.

## Rainfall map looks like a street map

NASA precipitation tiles can be transparent where no colored data is mapped. Try the rainfall date selector or zoom out. Transparency alone does not confirm zero rainfall or complete data coverage.

## Soil readings disagree

POWER modeled relative wetness, SMAP imagery and editable simulation assumptions are separate measures. Check each source, date and unit before comparing them.

## Old results say no readings were saved

Return to the simulator, wait for observations to load and save a new experiment. Older browser records cannot recover source data that was never stored.

## An experiment is missing on another device

Experiments are stored in the browser for that origin. Export JSON for a portable report. The application does not currently provide JSON re-import or account-based synchronization.

## The build warns about large chunks

This is a bundle-size advisory. The production build succeeds, but further code splitting could improve loading performance.
