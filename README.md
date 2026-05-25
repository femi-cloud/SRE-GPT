# SRE-GPT: Autonomous SRE Agent

SRE-GPT is an autonomous agent that monitors a service's health via Dynatrace, detects anomalies, triggers auto-remediation via the Google Cloud Run REST API, and generates post-mortems using the generative AI capabilities of the `@google/genai` SDK.

## Features
- **Zero-Dependency Polling**: Uses purely Python built-in features and standard libraries to poll monitoring APIs without needing bash scripts.
- **Cross-Platform Compatibility**: Fully supports Windows OS alongside Linux/macOS.
- **Anomaly Detection**: Monitors latency and HTTP error rates to identify system degradation in real-time.
- **High-End Glassmorphism Dashboard**: A premium, real-time updating UI dashboard built with pure HTML/CSS/JS (no build steps), responsive layouts, glowing alerts, and terminal-style action logs.
- **Autonomous Remediation**: Automatically rolls back Cloud Run revisions when thresholds are breached.
- **AI Post-Mortems**: Generates analytical incident reports utilizing Gemini AI.

## Local Setup & Execution

### 1. Start the Target API
```powershell
pip install -r api/requirements.txt
cd api
uvicorn main:app --reload --port 8080
```

### 2. Start the Autonomous Agent
In a new terminal window:
```powershell
pip install requests google-auth python-dotenv google-genai
cd agent
python agent.py
```

### 3. Launch the Dashboard
You can open `dashboard/index.html` directly in your web browser, or serve it locally to avoid CORS restrictions when fetching `status.json`:
```powershell
cd dashboard
python -m http.server 3000
```
Then navigate to `http://localhost:3000` in your web browser.

## Configuration
Edit the `.env` (or copy `.env.example` to `.env`) with your environment details:
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `CLOUD_RUN_SERVICE_NAME`
- `DT_ENVIRONMENT_URL` - Your Dynatrace API url
- `DT_API_TOKEN` - Your Dynatrace Access token
- `GEMINI_API_KEY` - Your Gemini api key configured in AI Studio Build
