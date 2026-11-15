# BHOOMI frontend

The React + Vite application is in this directory. The FastAPI backend is in `backend/`.

See the [project README](../README.md) for setup, configuration, features, scientific limitations and testing.

- [Architecture](../docs/ARCHITECTURE.md)
- [API](../docs/API.md)
- [Deployment](../docs/DEPLOYMENT.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)

```powershell
npm ci
Copy-Item .env.example .env.local
# Enter your MapTiler key and backend URL in .env.local.
npm run dev
```

Build: `npm run build`. Output: `dist/`. This generated directory is not committed.
