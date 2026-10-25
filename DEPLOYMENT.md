# Deploy frontend to Vercel and API/PostgreSQL to Render

## Current deployment

- Frontend: https://khoa-luan-final.vercel.app
- API: https://khoa-luan-api.onrender.com
- Render service: `khoa-luan-api`, PostgreSQL: `khoa-luan-db` (Singapore, free plans).
- Both projects are connected to this GitHub repository's `main` branch for automatic deployment.
- Email, AI and authenticated backend media uploads need your integration credentials.
  Registration works without an avatar.

## 1. Render

Create a Blueprint from `https://github.com/haoasdasd/Khoa-Luan-Final`, branch
`main`, using the root `render.yaml`. Review the selected plans before creating
resources. The Blueprint creates a Python API and PostgreSQL in Singapore.

Supply `CORS_ORIGINS` during Blueprint creation. Add any optional integration
credentials in the Render service's secure environment settings when available.
Do not commit `.env` files or paste credentials in chat.

For a deployment without external integrations, omit the email and Cloudinary
variables. Authentication and text chat can run independently; email and backend
media uploads return HTTP 503 until their credentials are configured.

- `CORS_ORIGINS`: JSON array of exact frontend origins, for example
  `["https://your-project.vercel.app"]`. Include a custom domain separately if used.
- `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `MAIL_SERVER`: SMTP provider settings.
  The app uses STARTTLS; its default port is 587.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`:
  your Cloudinary account settings.
- Optional `GEMINI_API_KEY` and `UNSPLASH_ACCESS_KEY` enable the existing AI/image
  integrations. Their live behavior has not been verified.

Render injects `DATABASE_URL` from the database and generates `SECRET_KEY`.
Do not rotate the JWT key on every restart. Keep one API worker because the
current WebSocket manager stores connections in memory.

Startup creates missing tables idempotently from SQLAlchemy metadata; it never
drops data. The repository has no versioned migrations. Before later schema
changes, add reviewed Alembic migrations: this bootstrap does not alter existing
columns or replace a migration workflow. No data from the development database
is uploaded.

Once the API is live, request `https://<api-host>/health` and check
`{"status":"ok",...}`; also verify `/openapi.json`.

**Free plan limits:** Render's free API suspends when idle and blocks outbound
SMTP ports 25, 465 and 587, so email OTP requires a compatible paid service or a
separate change to use an HTTPS email API. Free PostgreSQL expires after 30 days;
choose a suitable paid database before relying on it for persistent data.
See https://render.com/docs/free.

## 2. Vercel

Import the same repository and branch. Set **Root Directory** to
`FE/my-react-app`, choose **Vite**, and use **Node.js 24.x**. The included
`vercel.json` uses `npm ci`, `npm run build`, `dist`, and an SPA route fallback.

Add `VITE_API_URL=https://<api-host>/api` to the Production environment **before
building**. This is a public URL, not a secret. Vite embeds it in the bundle;
redeploy whenever it changes. The app derives `wss://<api-host>/ws` automatically.
Set it separately for Preview deployments if you need those.

Copy the assigned Vercel production origin into Render's `CORS_ORIGINS` and
redeploy the API. Do not allow every `*.vercel.app` origin with credentials.

## 3. Verify the deployed application

1. Open the production frontend, then directly open `/auth/login` to check SPA routing.
2. Register a test account and log in. Check authenticated API calls use HTTPS.
3. Open two authenticated browsers and verify WebSocket chat and presence.
4. Test a video call with real camera/microphone permissions. Unit tests use mocks.
5. Verify upload and password-reset flows with your own configured services.

Existing frontend upload helpers also use a Cloudinary cloud name and unsigned
upload preset in source. Verify ownership and configure that preset for your
account before expecting avatar/comment uploads to work. Backend Cloudinary
variables alone do not configure those frontend helpers.

Local checks: from `FE/my-react-app`, run `npm run lint`, `npm test`, and
`npm run build`. From `backend`, install `requirements.txt` in Python 3.12 and run
`python -m unittest discover -s tests`. Local success does not confirm a live
Vercel/Render deployment; check the provider deploy logs and public URLs too.
