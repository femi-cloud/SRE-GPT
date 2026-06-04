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
        update_gist({
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "metrics": metrics,
            "status": "OK",
            "analysis": "",
            "report": "",
            "action": "",
            "last_action": "",
            "davis_insight": ""
        })
        return

    print("⚠️  ANOMALY DETECTED")

    # Send to Dynatrace
    send_dynatrace_event(
        f"SRE-GPT: Anomaly detected — Latency {metrics['latency_ms']}ms",
        metrics
    )

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
                update_gist({
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    "metrics": new_metrics,
                    "incident_metrics": metrics,  
                    "status": "AUTO_REPAIRED",
                    "analysis": full_report or analysis,
                    "report":   full_report or analysis,
                    "action": "AUTO_REPAIR ✅",
                    "last_action": "AUTO_REPAIR ✅",
                    "davis_insight": ""
                })
                print("✅ AUTO-REPAIRED")
                return
    except Exception as e:
        print(f"Auto-repair failed: {e}")

    # Rollback
    success = rollback()
    action = "ROLLBACK ✅" if success else "ROLLBACK FAILED ❌"
    full_report = REPORTER.generate_incident_report(metrics, action)
    update_gist({
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "metrics": metrics,
        "incident_metrics": metrics,  
        "status": "ROLLBACK",
        "analysis": full_report or analysis,
        "report":   full_report or analysis,
        "action": action,
        "last_action": action,
        "davis_insight": ""
    })
    print(f"🏁 {action}")
       
def update_gist(data: dict):
    """Écrit status.json dans le GitHub Gist public."""
    gist_id = "ffc8dcdfeecde24814ceb6470d738470"
    token = os.getenv("GIST_TOKEN", "")
    
    print(f"DEBUG: GIST_TOKEN présent = {bool(token)}, longueur = {len(token)}")
    
    if not token:
        print("⚠️ GIST_TOKEN manquant")
        return
    
    headers = {
        "Authorization": f"token {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "files": {
            "status.json": {
                "content": json.dumps(data, indent=2)
            }
        }
    }
    try:
        r = requests.patch(
            f"https://api.github.com/gists/{gist_id}",
            headers=headers,
            json=payload,
            timeout=15
        )
        if r.status_code == 200:
            print("📝 Gist updated ✅")
        else:
            print(f"❌ Gist update failed: {r.status_code}")
    except Exception as e:
        print(f"❌ Gist error: {e}")

def send_dynatrace_event(title: str, metrics: dict):
    """Envoie un event directement via l'API REST Dynatrace."""
    url = "https://ntt93614.live.dynatrace.com/api/v2/events/ingest"
    headers = {
        "Authorization": f"Api-Token {os.getenv('DT_API_TOKEN', '')}",
        "Content-Type": "application/json"
    }
    payload = {
        "eventType": "CUSTOM_ALERT",
        "title": title,
        "properties": {
            "latency_ms": str(metrics.get("latency_ms", 0)),
            "error_rate": str(metrics.get("error_rate", 0)),
            "source": "SRE-GPT Agent"
        }
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=15)
        if r.status_code in [200, 201, 204]:
            print("📡 Event sent to Dynatrace ✅")
        else:
            print(f"📡 Dynatrace: {r.status_code} - {r.text[:100]}")
    except Exception as e:
        print(f"📡 Dynatrace error: {e}")

if __name__ == "__main__":
    run_once()