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

def write_dashboard(metrics, status, analysis="", action=""):
    """Writes the state to dashboard/status.json."""
    os.makedirs("../dashboard", exist_ok=True)
    out = {
        "timestamp": datetime.datetime.now().isoformat(),
        "metrics": metrics,
        "status": status,
        "analysis": analysis,
        "action": action
    }
    with open("../dashboard/status.json", "w") as f:
        json.dump(out, f, indent=4)
    print(f"[Dashboard] Updated → {status}")

def auto_repair(cause: str, metrics: dict) -> bool:
    """
    Step 2 — Attempt automatic repair before rollback.
    Returns True if repaired, False otherwise.
    """
    print("🔧 Attempting auto-repair...")

    # Strategy 1: High latency → reset simulation parameters
    if metrics["latency_ms"] > config.ALERT_LATENCY_MS:
        print("  → High latency detected: resetting simulation parameters...")
        try:
            r = requests.post(f"{API_BASE_URL}/simulate/reset", timeout=30)
            if r.status_code == 200:
                print("  ✅ Reset performed")
                return True
        except Exception as e:
            print(f"  ❌ Reset failed: {e}")

    # Strategy 2: High error rate → reset error rate
    if metrics["error_rate"] > config.ALERT_ERROR_RATE:
        print("  → High error rate: resetting error rate...")
        try:
            r = requests.post(f"{API_BASE_URL}/simulate/errors?rate=0.0", timeout=30)
            if r.status_code == 200:
                print("  ✅ Error rate reset")
                return True
        except Exception as e:
            print(f"  ❌ Error rate reset failed: {e}")

    # Strategy 3: Low availability → repeated ping to wake up
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
    """
    Step 3 — Rollback to previous deployment via Render API.
    """
    print("🔄 Rollback in progress via Render API...")

    if not RENDER_API_KEY or not RENDER_SERVICE_ID:
        print("  ⚠️  RENDER_API_KEY or RENDER_SERVICE_ID missing — simulated rollback")
        # Simulation for demo if no API key
        time.sleep(3)
        print("  ✅ Simulated rollback performed")
        return True

    try:
        headers = {
            "Authorization": f"Bearer {RENDER_API_KEY}",
            "Content-Type": "application/json"
        }

        # Retrieve the list of deployments
        r = requests.get(
            f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys",
            headers=headers,
            timeout=30
        )
        deploys = r.json()

        # Find the last stable deployment (2nd in the list)
        if len(deploys) >= 2:
            stable_deploy_id = deploys[1]["deploy"]["id"]
            print(f"  → Rollback to deployment: {stable_deploy_id}")

            # Trigger the rollback
            r2 = requests.post(
                f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys",
                headers=headers,
                json={"clearCache": "do_not_clear"},
                timeout=30
            )
            if r2.status_code in [200, 201]:
                print("  ✅ Rollback successfully triggered")
                return True

    except Exception as e:
        print(f"  ❌ Rollback error: {e}")

    return False

def run():
    print("🚀 SRE-GPT Started: Analyzing every 60s...")
    print(f"   Target API: {API_BASE_URL}")

    while True:
        try:
            # Step 1 — Collect metrics
            metrics = DT_CLIENT.get_metrics()
            if not metrics:
                time.sleep(60)
                continue

            print(f"\n📊 Metrics → Latency: {metrics['latency_ms']}ms | "
                  f"Errors: {metrics['error_rate']*100:.1f}% | "
                  f"Availability: {metrics['availability']*100:.1f}%")

            latency_ok = metrics["latency_ms"] <= config.ALERT_LATENCY_MS
            error_ok = metrics["error_rate"] <= config.ALERT_ERROR_RATE
            avail_ok = metrics["availability"] >= 0.95

            if latency_ok and error_ok and avail_ok:
                # All good
                write_dashboard(metrics, "OK")
                print("✅ All normal")

            else:
                # Anomaly detected
                print("⚠️  ANOMALY DETECTED")
                write_dashboard(metrics, "INCIDENT")

                # Step 2 — Gemini analysis
                print("🧠 Gemini analyzing root cause...")
                analysis = REPORTER.analyze_only(metrics)
                print(f"   → {analysis}")

                # Step 3 — Attempt auto-repair
                repaired = auto_repair(analysis, metrics)
                time.sleep(30)  # wait 30s to check

                # Check if repaired
                new_metrics = DT_CLIENT.get_metrics()

                if new_metrics and \
                   new_metrics["latency_ms"] <= config.ALERT_LATENCY_MS and \
                   new_metrics["error_rate"] <= config.ALERT_ERROR_RATE:

                    print("✅ AUTO-REPAIRED without rollback!")
                    REPORTER.generate_incident_report(metrics, "AUTO_REPAIR")
                    write_dashboard(new_metrics, "OK", analysis, "AUTO_REPAIR ✅")

                else:
                    # Step 4 — Rollback
                    print("⚠️  Auto-repair insufficient → Rollback...")
                    success = rollback(metrics)
                    action = "ROLLBACK ✅" if success else "ROLLBACK FAILED ❌"
                    REPORTER.generate_incident_report(metrics, action)
                    write_dashboard(
                        new_metrics or metrics,
                        "ROLLBACK",
                        analysis,
                        action
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