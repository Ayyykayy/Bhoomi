# Deployment

Deploy branch `main`. This application needs two services: a static frontend and a running Python backend. Publishing only the frontend will not deploy the API.

## Backend service

- Working/root directory: `bhoomi/backend`.
- Python: 3.11.
- Install: `pip install -r requirements.txt`.
- Start: `uvicorn app.main:app --host 0.0.0.0 --port <PORT>`.
- Replace `<PORT>` with the hosting platform's assigned port using its environment-variable syntax.
- Health path: `/api/health`.
- Set `DEBUG=False`.
- Set `ALLOWED_ORIGINS` to your exact HTTPS frontend origin. Multiple origins are comma-separated, with no trailing slash.
- Permit outgoing HTTPS requests to NASA data services and Nominatim.

## Frontend service

- Working/root directory: `bhoomi`.
- Install: `npm ci`.
- Build: `npm run build`.
- Publish directory: `dist` relative to the frontend root.
- Set `VITE_BACKEND_URL` to the deployed HTTPS backend base URL, without `/api`.
- Set `VITE_MAPTILER_KEY` to your browser key and permit the deployed frontend origin in MapTiler.
- Rebuild after changing either Vite environment variable.

Use a Node.js version compatible with the installed Vite version. Routes use URL hashes such as `/#/globe`.

## Before sharing the live URL

1. Confirm the deployed backend health endpoint succeeds.
2. Open the globe and search for a location.
3. Confirm weather and NDVI responses; allow time for initial external requests.
4. Switch scientific map layers and verify displayed imagery dates and legends.
5. Draw a polygon, save an experiment and open results and its action plan.
6. Verify JSON export and printing.
7. Confirm there are no browser requests to `localhost` or mixed HTTP content.

Browser experiments do not transfer automatically between localhost, deployment domains or devices. External outages and missing-quality data remain possible. Scientific limitations in the README still apply after deployment.

No production URL has been configured in this document; add the actual frontend and backend URLs after deployment is verified.
