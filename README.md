# LINKEDIN (Local setup)

Frontend: React + Vite (`src/`), Backend: Node HTTP API (`server.js`), default API base `http://localhost:4000`.

## Run locally
```bash
# install deps
npm install

# start backend (port 4000)
npm run server

# in another terminal, start frontend (port 5173)
npm run dev
```

Optional: set API base for the frontend
- Default: `http://localhost:4000`
- Override: create `.env` with `VITE_API_BASE=http://localhost:4000`

## API endpoints (server.js)
- `GET /api/health`
- `POST /api/signup`
- `POST /api/signin`
- `POST /api/update-profile`

## Notes
- The backend stores users in `server-data/users.json`.
- Keep the backend running while using the UI so signup/signin/profile setup succeeds.
