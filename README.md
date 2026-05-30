# SRE-GPT — Autonomous Site Reliability Agent

> **Google Cloud Rapid Agent Hackathon 2026 — Dynatrace Track**

SRE-GPT is an autonomous AI agent that monitors a production API, detects performance anomalies in real-time, self-heals through a cascaded remediation strategy, and generates AI-powered post-mortems — with zero human intervention.

---

## Architecture

```
Todo API (FastAPI + PostgreSQL on Render)
        ↓ real metrics every 60s
Dynatrace MCP Server (anomaly enrichment + event ingestion)
        ↓
SRE-GPT Agent (Python) + Gemini AI
        ↓ autonomous decision
Auto-Repair → Rollback (Render API) → Incident Report
        ↓
Glassmorphism Dashboard (live status.json polling)
```

---

## Features

- **Real-time Monitoring** — Measures actual latency, error rate, and availability from a live production API
- **MCP Dynatrace Integration** — Sends incident events to Dynatrace and queries observability data via the official MCP server
- **Cascaded Remediation** — Auto-repair first, rollback only if repair fails
- **Autonomous Rollback** — Triggers real redeployments via Render REST API
- **Gemini AI Post-Mortems** — Generates structured root cause analysis reports after every incident
- **Live Dashboard** — Glassmorphism UI with incident timeline, terminal log, sparkline charts, and cooldown progress bar
- **Multi-language** — EN/FR toggle on the dashboard

---

## Stack

| Layer | Technology |
|---|---|
| Target API | FastAPI + PostgreSQL (Render) |
| Monitoring | Dynatrace MCP Server v1.8.5 |
| AI Engine | Gemini 3.1 Flash Lite (Google GenAI SDK) |
| Remediation | Render REST API v1 |
| Dashboard | Pure HTML/CSS/JS + Chart.js + Tailwind CDN |
| Agent | Python 3.13 |

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- A Render account (free tier)
- A Dynatrace trial account
- A Gemini API key (Google AI Studio)

### 1. Clone & Configure

```powershell
git clone https://github.com/YOUR_USERNAME/sre-gpt.git
cd sre-gpt
copy .env.example .env
notepad .env
```

Fill in your `.env`:
```
DT_ENVIRONMENT_URL=https://YOUR_ENV.apps.dynatrace.com
DT_API_TOKEN=dt0c01.xxxxx
GEMINI_API_KEY=AIzaxxxxx
API_BASE_URL=https://your-api.onrender.com
RENDER_API_KEY=rnd_xxxxx
RENDER_SERVICE_ID=srv-xxxxx
ALERT_LATENCY_MS=1000
ALERT_ERROR_RATE=0.1
```

### 2. Deploy the Target API

Push the `api/` folder to a Render Web Service with:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment Variable**: `DATABASE_URL` = your Render PostgreSQL URL

### 3. Start the MCP Dynatrace Server

```powershell
$env:DT_ENVIRONMENT="https://YOUR_ENV.apps.dynatrace.com"
npx -y @dynatrace-oss/dynatrace-mcp-server@latest --http --port 8888
```
### 4. Start the Agent

```powershell
pip install requests python-dotenv google-genai psycopg2-binary
cd agent
python agent.py
```

### 5. Launch the Dashboards

**HTML Dashboard** (live agent data):
```powershell
cd dashboard
python cors_server.py 
```
Open `http://localhost:4000` in your browser.

**React Dashboard** (advanced UI with PDF export):
```powershell
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

> **Note**: Always launch from the correct directory. Use `Ctrl+Shift+R` to hard refresh if the browser shows a blank page.

---

## Simulate an Incident

```bash
# Inject latency fault
curl -X POST https://sre-gpt-api.onrender.com/simulate/latency?seconds=3

# Inject error fault  
curl -X POST https://sre-gpt-api.onrender.com/simulate/errors?rate=0.3

# Reset to normal
curl -X POST https://sre-gpt-api.onrender.com/simulate/reset
```

Or click **"Simulate Incident"** directly on the dashboard.

---

## Remediation Cascade

```
ANOMALY DETECTED
      ↓
Step 1 — Gemini analyzes root cause
      ↓
Step 2 — Auto-repair (reset simulation, wake-up ping)
      ↓ if metrics normalize → AUTO_REPAIRED ✅
      ↓ if still anomalous after 30s...
Step 3 — Real rollback via Render API
      ↓ ROLLBACK ✅
Step 4 — Gemini generates post-mortem report
      ↓ Dashboard updated + Dynatrace event sent
```

---

## License

MIT — See [LICENSE](LICENSE)
