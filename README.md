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
- Override: create `.env.local` with `VITE_API_BASE=http://localhost:4000`

## SingleStore configuration

Add the connection string to `.env.local` (do not commit real credentials):
```bash
SINGLESTORE_URL=singlestore://USER:PASSWORD@HOST:PORT/DATABASE?ssl={}
```

## API endpoints (server.js)
- `GET /api/health`
- `GET /api/profile?email=you@domain.com`
- `POST /api/signup`
- `POST /api/signin`
- `POST /api/update-profile`

## Notes
- The backend stores users in SingleStore (table `users`).
- Keep the backend running while using the UI so signup/signin/profile setup works correctly.
