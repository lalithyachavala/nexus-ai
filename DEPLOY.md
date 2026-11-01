# Deploying Nexus AI (full live stack)

> Independent illustrative engineering demonstration. Synthetic data only.

Public architecture:

```
Visitor → Vercel (Next.js web, live mode) → Render (FastAPI) → Supabase (Postgres)
```

Deploy in this order — the web app needs the backend URL, and the backend's
CORS needs the web URL, so there's one back-reference at the end.

---

## 0. Prerequisites

- A GitHub repo containing this project (see `## 1`).
- A **Supabase** project (free) → Settings → Database → Connection string.
- A **Render** account (free) for the FastAPI service.
- A **Vercel** account (free) for the web app.

## 1. Push to GitHub

From the repo root:

```bash
git init
git add -A
git commit -m "feat: Nexus AI enterprise AI operations platform (demo)"
gh repo create <your-account>/nexus-ai --public --source=. --push
# or create the repo in the GitHub UI and:
#   git remote add origin https://github.com/<your-account>/nexus-ai.git
#   git push -u origin main
```

## 2. Supabase (Postgres)

1. Create a project. Wait for the database to provision.
2. Copy the connection string and convert it to the SQLAlchemy form:
   ```
   postgresql+psycopg2://postgres:<YOUR_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
   ```
   (Keep this secret — it goes in Render env, never in the repo.)

## 3. Backend → Render

1. Render → **New → Blueprint** → select your GitHub repo. It reads
   [`infra/render.yaml`](./infra/render.yaml) and creates `nexus-ai-api`
   (Docker, root `apps/api`).
2. Set the two secret env vars in the service dashboard:
   - `DATABASE_URL` = your Supabase string from step 2
   - `CORS_ORIGINS` = a placeholder for now, e.g. `https://example.com`
     (you'll update it in step 5)
   - `LLM_PROVIDER` = `mock` (already in the blueprint). For a real model, set
     `openai` / `claude` + the matching API key.
3. Deploy. Tables are created and seeded automatically on first boot.
4. Verify: open `https://nexus-ai-api.onrender.com/health` → `{"status":"ok",...}`.
   Note this backend URL.

## 4. Web → Vercel

1. Vercel → **Add New → Project** → import the same repo.
2. **Root Directory: `apps/web`** (important — it's a monorepo).
3. Environment variables:
   - `NEXT_PUBLIC_API_MODE` = `live`
   - `NEXT_PUBLIC_API_URL` = your Render backend URL from step 3
     (e.g. `https://nexus-ai-api.onrender.com`)
4. Deploy. Note the web URL (e.g. `https://nexus-ai.vercel.app`).

## 5. Close the loop (CORS)

Back in Render → `nexus-ai-api` → env → set:

```
CORS_ORIGINS = https://nexus-ai.vercel.app
```

Save (Render redeploys). The browser can now call the backend.

## 6. Verify

Open the Vercel URL. The topbar badge should read **“Live API”** (green).
Send a support message — the reply streams from FastAPI; dashboards read live
from Supabase.

---

## Notes

- **Render free tier sleeps** after inactivity; the first request after idle
  takes ~30–50s to wake. Fine for a demo; upgrade the plan to keep it warm.
- **Alternatives to Render:** Railway (`railway up` from `apps/api`) or Google
  Cloud Run (`gcloud run deploy --source apps/api`). Both read the same
  Dockerfile; set the same env vars.
- **Mock-only public demo (no backend):** deploy just `apps/web` to Vercel with
  `NEXT_PUBLIC_API_MODE=mock`. One URL, fully interactive, zero backend/DB.
- **Secrets:** only ever live in host dashboards. Nothing sensitive is committed
  (`.env` is gitignored).
