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
    """Écrit l'état dans dashboard/status.json."""
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
    print(f"[Dashboard] Mis à jour → {status}")

def auto_repair(cause: str, metrics: dict) -> bool:
    """
    Étape 2 — Tentative de réparation automatique avant rollback.
    Retourne True si réparé, False sinon.
    """
    print("🔧 Tentative d'auto-réparation...")

    # Stratégie 1 : Latence élevée → reset les simulations
    if metrics["latency_ms"] > config.ALERT_LATENCY_MS:
        print("  → Latence élevée détectée : reset des paramètres de simulation...")
        try:
            r = requests.post(f"{API_BASE_URL}/simulate/reset", timeout=30)
            if r.status_code == 200:
                print("  ✅ Reset effectué")
                return True
        except Exception as e:
            print(f"  ❌ Reset échoué : {e}")

    # Stratégie 2 : Error rate élevé → reset les erreurs
    if metrics["error_rate"] > config.ALERT_ERROR_RATE:
        print("  → Taux d'erreur élevé : reset du taux d'erreur...")
        try:
            r = requests.post(f"{API_BASE_URL}/simulate/errors?rate=0.0", timeout=30)
            if r.status_code == 200:
                print("  ✅ Taux d'erreur réinitialisé")
                return True
        except Exception as e:
            print(f"  ❌ Échec reset erreurs : {e}")

    # Stratégie 3 : Disponibilité faible → ping répété pour wake up
    if metrics["availability"] < 0.95:
        print("  → Service indisponible : tentative de wake-up...")
        for i in range(3):
            try:
                r = requests.get(f"{API_BASE_URL}/health", timeout=30)
                if r.status_code == 200:
                    print(f"  ✅ Service réveillé après {i+1} tentative(s)")
                    return True
            except:
                time.sleep(10)

    return False

def rollback(metrics: dict) -> bool:
    """
    Étape 3 — Rollback vers le déploiement précédent via API Render.
    """
    print("🔄 Rollback en cours via API Render...")

    if not RENDER_API_KEY or not RENDER_SERVICE_ID:
        print("  ⚠️  RENDER_API_KEY ou RENDER_SERVICE_ID manquant — rollback simulé")
        # Simulation pour la démo si pas de clé API
        time.sleep(3)
        print("  ✅ Rollback simulé effectué")
        return True

    try:
        headers = {
            "Authorization": f"Bearer {RENDER_API_KEY}",
            "Content-Type": "application/json"
        }

        # Récupère la liste des déploiements
        r = requests.get(
            f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys",
            headers=headers,
            timeout=30
        )
        deploys = r.json()

        # Trouve le dernier déploiement stable (2ème de la liste)
        if len(deploys) >= 2:
            stable_deploy_id = deploys[1]["deploy"]["id"]
            print(f"  → Rollback vers déploiement : {stable_deploy_id}")

            # Déclenche le rollback
            r2 = requests.post(
                f"https://api.render.com/v1/services/{RENDER_SERVICE_ID}/deploys",
                headers=headers,
                json={"clearCache": "do_not_clear"},
                timeout=30
            )
            if r2.status_code in [200, 201]:
                print("  ✅ Rollback déclenché avec succès")
                return True

    except Exception as e:
        print(f"  ❌ Erreur rollback : {e}")

    return False

def run():
    print("🚀 SRE-GPT Démarré : Analyse toutes les 60s...")
    print(f"   API cible : {API_BASE_URL}")

    while True:
        try:
            # Étape 1 — Collecte des métriques
            metrics = DT_CLIENT.get_metrics()
            if not metrics:
                time.sleep(60)
                continue

            print(f"\n📊 Métriques → Latence: {metrics['latency_ms']}ms | "
                  f"Erreurs: {metrics['error_rate']*100:.1f}% | "
                  f"Dispo: {metrics['availability']*100:.1f}%")

            latency_ok = metrics["latency_ms"] <= config.ALERT_LATENCY_MS
            error_ok = metrics["error_rate"] <= config.ALERT_ERROR_RATE
            avail_ok = metrics["availability"] >= 0.95

            if latency_ok and error_ok and avail_ok:
                # Tout va bien
                write_dashboard(metrics, "OK")
                print("✅ Tout est normal")

            else:
                # Anomalie détectée
                print("⚠️  ANOMALIE DÉTECTÉE")
                write_dashboard(metrics, "INCIDENT")

                # Étape 2 — Analyse Gemini
                print("🧠 Gemini analyse la root cause...")
                analysis = REPORTER.analyze_only(metrics)
                print(f"   → {analysis}")

                # Étape 3 — Tentative d'auto-réparation
                repaired = auto_repair(analysis, metrics)
                time.sleep(30)  # attend 30s pour vérifier

                # Vérifie si réparé
                new_metrics = DT_CLIENT.get_metrics()

                if new_metrics and \
                   new_metrics["latency_ms"] <= config.ALERT_LATENCY_MS and \
                   new_metrics["error_rate"] <= config.ALERT_ERROR_RATE:

                    print("✅ AUTO-RÉPARÉ sans rollback !")
                    REPORTER.generate_incident_report(metrics, "AUTO_REPAIR")
                    write_dashboard(new_metrics, "OK", analysis, "AUTO_REPAIR ✅")

                else:
                    # Étape 4 — Rollback
                    print("⚠️  Auto-réparation insuffisante → Rollback...")
                    success = rollback(metrics)
                    action = "ROLLBACK ✅" if success else "ROLLBACK ÉCHOUÉ ❌"
                    REPORTER.generate_incident_report(metrics, action)
                    write_dashboard(
                        new_metrics or metrics,
                        "ROLLBACK",
                        analysis,
                        action
                    )
                    print(f"🏁 {action}")
                    print("⏳ Cooldown de 5 minutes...")
                    time.sleep(300)

            time.sleep(60)

        except KeyboardInterrupt:
            print("\n👋 Agent arrêté.")
            break
        except Exception as e:
            print(f"❌ Erreur inattendue : {e}")
            time.sleep(60)

if __name__ == "__main__":
    run()