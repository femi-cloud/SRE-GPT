from dotenv import load_dotenv
load_dotenv()
import os

DT_ENVIRONMENT_URL = os.getenv("DT_ENVIRONMENT_URL", "https://xxxxx.live.dynatrace.com")
DT_API_TOKEN = os.getenv("DT_API_TOKEN", "dt0c01.xxxxx")
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "mon-projet")
GCP_REGION = os.getenv("GCP_REGION", "us-central1")
CLOUD_RUN_SERVICE_NAME = os.getenv("CLOUD_RUN_SERVICE_NAME", "sre-gpt-api")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "xxxxx")
ALERT_LATENCY_MS = float(os.getenv("ALERT_LATENCY_MS", "1000"))
ALERT_ERROR_RATE = float(os.getenv("ALERT_ERROR_RATE", "0.1"))