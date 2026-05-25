import time
import os
import json
import datetime
from dynatrace_client import DynatraceClient
from cloudrun_client import CloudRunClient
from report_generator import ReportGenerator
import config

DT_CLIENT = DynatraceClient()
CR_CLIENT = CloudRunClient()
REPORTER = ReportGenerator()

def append_to_dashboard(metrics, status="OK"):
    """Écrit l'état en direct dans dashboard/status.json pour lecture par l'UI"""
    os.makedirs("../dashboard", exist_ok=True)
    out = {
        "timestamp": datetime.datetime.now().isoformat(),
        "metrics": metrics,
        "status": status,
        "analysis": ""
    }
    # On maintient l'existant s'il y a une analyse
    try:
        with open("../dashboard/status.json", "r") as f:
            prev = json.load(f)
            if prev.get("analysis"): 
                out["analysis"] = prev["analysis"]
                out["action"] = prev.get("action", "")
    except Exception:
        pass
        
    try:
        with open("../dashboard/status.json", "w") as f:
            json.dump(out, f, indent=4)
    except Exception:
        pass

def run():
    print("SRE-GPT Démarré : Analyse Dynatrace toutes les 60s...")
    while True:
        try:
            metrics = DT_CLIENT.get_metrics()
            if not metrics:
                time.sleep(60)
                continue
                
            print(f"> Metriques (Latence: {metrics['latency_ms']}ms, Erreurs: {metrics['error_rate']*100}%)")
            
            # Application de la logique conditionnelle de l'agent
            latency_anomaly = metrics["latency_ms"] > config.ALERT_LATENCY_MS
            error_anomaly = metrics["error_rate"] > config.ALERT_ERROR_RATE
            avail_anomaly = metrics["availability"] < 0.95
            
            if latency_anomaly or error_anomaly or avail_anomaly:
                print("ANOMALIE: L'agent initialise la procédure d'auto-remédiation.")
                append_to_dashboard(metrics, "INCIDENT")
                
                success = CR_CLIENT.rollback_to_previous()
                action = "Rollback (v2 API GCP)" if success else "Échec du Rollback API"
                
                REPORTER.generate_incident_report(metrics, action)
                print("Agent SRE est en période de cooldown post-remédiation de 5 min")
                time.sleep(300)
            else:
                append_to_dashboard(metrics, "OK")
                
            time.sleep(60)
        except KeyboardInterrupt:
            print("Process arrêté par l'utilisateur.")
            break
            
if __name__ == "__main__":
    run()
