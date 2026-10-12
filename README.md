# Vida Agent Console

React + Vite dashboard for the Vida agents API: agents, tasks, runs, with structured JSON viewing.

## Run

```bash
npm install
cp .env.example .env     # set VITE_API_BASE_URL
npm run dev              # http://localhost:5173
npm run build            # static files in dist/
```

## Changing the base URL

1. **Build time:** `VITE_API_BASE_URL` in `.env` (include any router prefix, no trailing slash).
2. **Runtime:** click the **API** pill in the header, edit the URL, use *Test connection*, then *Save*.
   The value is stored in the browser; *Reset to default* returns to the `.env` value.

## API requirements

The app calls: `GET /agents`, `/tasks`, `/tasks/{id}`, `/tasks/agent/{id}`, `/runs`, `/runs/{id}`, `/runs/task/{id}`, `/runs/agent/{id}`.
If the dashboard is served from a different origin than the API, enable CORS in FastAPI:

```python
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # your dashboard origin(s)
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

Agents are shown with live counts and status when `ao().get_agents` includes the `metrics` relationship
(`total_runs`, `total_success_runs`, `total_fail_runs`, `agent_status`); otherwise those cells show "—".

## Navigation

Overview → Agents → Agent → Task → Run, with breadcrumbs on every level. Routing uses hash URLs,
so the built `dist/` folder works on any static host without server rewrites.
