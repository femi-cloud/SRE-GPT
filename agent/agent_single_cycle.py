import time
import os
import json
import datetime
import requests
from dynatrace_client import DynatraceClient
from report_generator import ReportGenerator
import config

DT_CLIENT = DynatraceClient()
REPORTER = ReportGenerator()

API_BASE_URL = os.getenv("API_BASE_URL", "https://sre-gpt-api.onrender.com")
RENDER_API_KEY = os.getenv("RENDER_API_KEY", "")
RENDER_SERVICE_ID = os.getenv("RENDER_SERVICE_ID", "")

def write_status(metrics, status, analysis="", action=""):
    out = {
        "timestamp": datetime.datetime.now().isoformat(),
        "metrics": metrics,
        "status": status,
        "analysis": analysis,
        "action": action,
        "davis_insight": ""
    }
    print(json.dumps(out, indent=2))

def rollback() -> bool:
    try:
        headers = {
            "Authorization": f"Bearer {RENDER_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        r = requests.post(
            f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys",
            headers=headers,
            json={"clearCache": "do_not_clear"},
            timeout=30
        )
        return r.status_code in [200, 201]
    except Exception as e:
        print(f"Rollback error: {e}")
        return False

def run_once():
    print("🚀 SRE-GPT Single Cycle Started...")

    metrics = DT_CLIENT.get_metrics()
    if not metrics:
        print("❌ Could not retrieve metrics")
        return

    print(f"📊 Latency: {metrics['latency_ms']}ms | Errors: {metrics['error_rate']*100:.1f}% | Availability: {metrics['availability']*100:.1f}%")

    latency_ok = metrics["latency_ms"] <= config.ALERT_LATENCY_MS
    error_ok = metrics["error_rate"] <= config.ALERT_ERROR_RATE
    avail_ok = metrics["availability"] >= 0.95

    if latency_ok and error_ok and avail_ok:
        print("✅ All normal")
        write_status(metrics, "OK")
        return

    print("⚠️  ANOMALY DETECTED")

    # Gemini analysis
    analysis = REPORTER.analyze_only(metrics)
    print(f"🧠 Root cause: {analysis}")

    # Auto-repair
    try:
        r = requests.post(f"{API_BASE_URL}/simulate/reset", timeout=30)
        if r.status_code == 200:
            print("🔧 Auto-repair: reset performed")
            time.sleep(30)
            new_metrics = DT_CLIENT.get_metrics()
            if new_metrics and new_metrics["latency_ms"] <= config.ALERT_LATENCY_MS:
                full_report = REPORTER.generate_incident_report(metrics, "AUTO_REPAIR")
                write_status(new_metrics, "OK", full_report or analysis, "AUTO_REPAIR ✅")
                print("✅ AUTO-REPAIRED")
                return
    except Exception as e:
        print(f"Auto-repair failed: {e}")

    # Rollback
    success = rollback()
    action = "ROLLBACK ✅" if success else "ROLLBACK FAILED ❌"
    full_report = REPORTER.generate_incident_report(metrics, action)
    write_status(metrics, "ROLLBACK", full_report or analysis, action)
    print(f"🏁 {action}")

if __name__ == "__main__":
    run_once()