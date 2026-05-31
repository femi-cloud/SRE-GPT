import time
import os
import json
import datetime
import requests
from dynatrace_client import DynatraceClient
from report_generator import ReportGenerator
import config
from mcp_dynatrace_client import send_incident_event, ask_davis, get_active_problems

DT_CLIENT = DynatraceClient()
REPORTER = ReportGenerator()

API_BASE_URL = os.getenv("API_BASE_URL", "https://sre-gpt-api.onrender.com")
RENDER_API_KEY = os.getenv("RENDER_API_KEY", "")
RENDER_SERVICE_ID = os.getenv("RENDER_SERVICE_ID", "")

def write_dashboard(metrics, status, analysis="", action="", davis_insight=""):
    """Writes the state to public/status.json."""
    os.makedirs("../public", exist_ok=True)
    out = {
        "timestamp": datetime.datetime.now().isoformat(),
        "metrics": metrics,
        "status": status,
        "analysis": analysis,
        "action": action,
        "davis_insight": davis_insight
    }
    with open("../public/status.json", "w") as f:
        json.dump(out, f, indent=4)
    print(f"[Dashboard] Updated → {status}")

def auto_repair(cause: str, metrics: dict) -> bool:
    print("🔧 Attempting auto-repair...")

    if metrics["latency_ms"] > config.ALERT_LATENCY_MS:
        print("  → High latency: resetting simulation parameters...")
        try:
            r = requests.post(f"{API_BASE_URL}/simulate/reset", timeout=30)
            if r.status_code == 200:
                print("  ✅ Reset performed")
                return True
        except Exception as e:
            print(f"  ❌ Reset failed: {e}")

    if metrics["error_rate"] > config.ALERT_ERROR_RATE:
        print("  → High error rate: resetting...")
        try:
            r = requests.post(f"{API_BASE_URL}/simulate/errors?rate=0.0", timeout=30)
            if r.status_code == 200:
                print("  ✅ Error rate reset")
                return True
        except Exception as e:
            print(f"  ❌ Failed: {e}")

    if metrics["availability"] < 0.95:
        print("  → Service unavailable: attempting wake-up...")
        for i in range(3):
            try:
                r = requests.get(f"{API_BASE_URL}/health", timeout=30)
                if r.status_code == 200:
                    print(f"  ✅ Service awakened after {i+1} attempt(s)")
                    return True
            except:
                time.sleep(10)

    return False

def rollback(metrics: dict) -> bool:
    print("🔄 Rollback in progress via Render API...")

    try:
        headers = {
            "Authorization": f"Bearer {RENDER_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

        r = requests.get(
            f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys",
            headers=headers,
            timeout=30
        )
        deploys = r.json()

        live_deploys = [
            d for d in deploys
            if d.get("deploy", {}).get("status") == "live"
        ]

        if live_deploys:
            previous_id = live_deploys[0]["deploy"]["id"]
            print(f"  → Rollback to deployment: {previous_id}")

        r2 = requests.post(
            f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys",
            headers=headers,
            json={"clearCache": "do_not_clear"},
            timeout=30
        )
        if r2.status_code in [200, 201]:
            print("  ✅ Rollback successfully triggered")
            return True
        else:
            print(f"  ❌ Rollback failed ({r2.status_code})")
            return False

    except Exception as e:
        print(f"  ❌ Rollback error: {e}")
        return False

def run():
    print("🚀 SRE-GPT Started: Analyzing every 60s...")
    print(f"   Target API: {API_BASE_URL}")
    print(f"   MCP Dynatrace: http://localhost:8888")

    while True:
        try:
            metrics = DT_CLIENT.get_metrics()
            if not metrics:
                time.sleep(60)
                continue

            print(f"\n📊 Metrics → Latency: {metrics['latency_ms']}ms | "
                  f"Errors: {metrics['error_rate']*100:.1f}% | "
                  f"Availability: {metrics['availability']*100:.1f}%")

            # Vérifie aussi les problèmes Dynatrace via MCP
            dt_problems = get_active_problems()
            if dt_problems and isinstance(dt_problems, list) and len(dt_problems) > 0:
                print(f"⚠️  Dynatrace MCP: {len(dt_problems)} active problem(s) detected")

            latency_ok = metrics["latency_ms"] <= config.ALERT_LATENCY_MS
            error_ok = metrics["error_rate"] <= config.ALERT_ERROR_RATE
            avail_ok = metrics["availability"] >= 0.95

            if latency_ok and error_ok and avail_ok:
                write_dashboard(metrics, "OK")
                print("✅ All normal")

            else:
                print("⚠️  ANOMALY DETECTED")

                # Envoie un vrai événement à Dynatrace via MCP
                sent = send_incident_event(
                    f"SRE-GPT: Anomaly detected — Latency {metrics['latency_ms']}ms",
                    metrics
                )
                if sent:
                    print("📡 Incident event sent to Dynatrace via MCP ✅")
                else:
                    print("📡 MCP event failed (continuing anyway)")

                write_dashboard(metrics, "INCIDENT")

                # Gemini analyse
                print("🧠 Gemini analyzing root cause...")
                analysis = REPORTER.analyze_only(metrics)
                print(f"   → {analysis}")

                # Davis CoPilot enrichit l'analyse via MCP
                print("🔮 Querying Davis CoPilot via MCP...")
                davis_insight = ask_davis(
                    f"Latency spike detected at {metrics['latency_ms']}ms with {metrics['error_rate']*100}% error rate. What is the probable cause and recommended action?",
                    f"Service: sre-gpt-api on Render. Latency: {metrics['latency_ms']}ms, Errors: {metrics['error_rate']*100}%, Availability: {metrics['availability']*100}%"
                )
                if davis_insight:
                    print(f"   → Davis: {davis_insight[:120]}...")
                else:
                    print("   → Davis: no response (trial limitation)")

                # Auto-repair
                repaired = auto_repair(analysis, metrics)
                time.sleep(30)

                new_metrics = DT_CLIENT.get_metrics()

                if new_metrics and \
                   new_metrics["latency_ms"] <= config.ALERT_LATENCY_MS and \
                   new_metrics["error_rate"] <= config.ALERT_ERROR_RATE:

                    print("✅ AUTO-REPAIRED without rollback!")
                    full_report = REPORTER.generate_incident_report(metrics, "AUTO_REPAIR")
                    write_dashboard(new_metrics, "OK", full_report or analysis, "AUTO_REPAIR ✅", davis_insight)

                else:
                    print("⚠️  Auto-repair insufficient → Rollback...")
                    success = rollback(metrics)
                    action = "ROLLBACK ✅" if success else "ROLLBACK FAILED ❌"
                    
                    full_report = REPORTER.generate_incident_report(metrics, action)
                    write_dashboard(
                        new_metrics or metrics,
                        "ROLLBACK",
                        full_report or analysis,
                        action,
                        davis_insight
                    )
                    print(f"🏁 {action}")
                    print("⏳ Cooldown 5 minutes...")
                    time.sleep(300)

            time.sleep(60)

        except KeyboardInterrupt:
            print("\n👋 Agent stopped.")
            break
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    run()