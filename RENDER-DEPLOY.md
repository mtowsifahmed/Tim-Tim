# Render + keep-alive robot

Goal: backend always reachable at `wss://<service>.onrender.com/ws` without paying, and with the least
possible delay between "you finish talking" and "the first token arrives".

## 1. Push the repo

`render.yaml` is already at the project root. `.env`, `.venv`, `node_modules` and the desktop app are ignored,
so no secret goes to GitHub.

## 2. Create the service

1. Render → **New → Blueprint** → select the repo.
2. Render reads `render.yaml`: Docker build, `free` plan, region `singapore`, health check `/health`.
3. Fill the prompted secrets from `backend/.env`:
   `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_DB_URL`, `KEY_ENCRYPTION_SECRET`
   (+ `GEMINI_API_KEY` / `GROQ_API_KEY` / `ELEVENLABS_API_KEY` / `TAVILY_API_KEY` if you use them).
4. Wait for the first build, then open `https://<service>.onrender.com/health` — it must return `{"ok":true}`.

## 3. Keep it awake (the "robot")

Render free spins down after **15 minutes without inbound traffic**. A monitor that requests `/health`
every 5 minutes counts as traffic, so the service never sleeps.

**UptimeRobot (free plan, 5-minute interval):**
1. uptimerobot.com → **Add New Monitor**.
2. Monitor Type: **HTTP(s)**. Friendly name: `Tim-Tim backend`.
3. URL: `https://<service>.onrender.com/health`
4. Monitoring Interval: **5 minutes**. Leave "Alert contacts" as your email.
5. Save. First check runs within a minute.

**Why this is allowed and what it costs:** Render's free plan includes **750 instance hours per workspace
per month**, and spun-down time is not counted. A month is ~730-744 hours, so one always-awake free service
fits inside the allowance — but a second always-awake free service does not. Keep one monitor per service.

If UptimeRobot is unavailable in your region, cron-job.org or a GitHub Actions scheduled workflow doing
`curl -fsS https://<service>.onrender.com/health` every 5 minutes does the same job.

## 4. Point the app at it

Desktop [desktop/src/config.js](desktop/src/config.js):

```js
BACKEND_WS_URL: "wss://<service>.onrender.com/ws",
```

Then rebuild (`build-desktop.bat`, or `npx tauri build --debug --no-bundle` for a quick exe). The phone
pairing QR inherits whatever address the desktop uses.

## 5. Keeping replies fast on a free instance

Free compute is **0.1 CPU / 512 MB**, which is fine because the heavy work happens at the AI provider, but:

- **Region matters most.** Singapore is used in `render.yaml`; a wrong region (Oregon) adds ~200 ms to every
  database and provider round-trip. If the service was created before this file existed, change the region
  by recreating the service.
- **Never let it sleep during a session.** The monitor above is the single biggest win: a cold start is
  ~60 seconds; a warm reply is ~1 second.
- **The turn path already overlaps work**: the web search runs while the model is being prepared, and TTS
  never blocks the text reply (`TTS_GRACE`). First-token latency is dominated by the LLM provider, so keep
  `GEMINI_API_KEY` / `GROQ_API_KEY` set — the first configured provider in `backend/providers.yaml` wins.
- **Database is remote (Supabase).** Use the **pooler** connection string (`...pooler.supabase.com:6543`)
  in `SUPABASE_DB_URL`, not the direct 5432 host; Render's network reaches it fine and the pooler handles
  connection overhead.
- **Log the first token.** `backend` logs a `first token in Xms` line per turn; if it stays above ~800 ms,
  the provider is the bottleneck, not the host.
