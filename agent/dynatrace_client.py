import requests
from config import DT_ENVIRONMENT_URL, DT_API_TOKEN
import os
import random

API_BASE_URL = os.getenv("API_BASE_URL", "https://sre-gpt-api.onrender.com")

class DynatraceClient:
    """Wrapper hybride : métriques réelles depuis l'API + Dynatrace pour les alertes."""
    
    def __init__(self):
        self.base_url = DT_ENVIRONMENT_URL.rstrip('/')
        self.headers = {
            "Authorization": f"Api-Token {DT_API_TOKEN}",
            "Content-Type": "application/json"
        }

    def get_metrics(self):
        """Récupère les métriques réelles en appelant directement l'API déployée."""
        try:
            # Mesure latence réelle sur /users
            import time
            start = time.time()
            r = requests.get(f"{API_BASE_URL}/users", timeout=60)
            latency_ms = (time.time() - start) * 1000

            # Mesure error rate sur /process (10 appels rapides)
            errors = 0
            attempts = 10
            for _ in range(attempts):
                try:
                    res = requests.get(f"{API_BASE_URL}/process", timeout=60)
                    if res.status_code >= 500:
                        errors += 1
                except:
                    errors += 1

            error_rate = errors / attempts

            # Disponibilité via /health
            try:
                h = requests.get(f"{API_BASE_URL}/health", timeout=60)
                availability = 1.0 if h.status_code == 200 else 0.0
            except:
                availability = 0.0

            return {
                "latency_ms": round(latency_ms, 2),
                "error_rate": round(error_rate, 3),
                "availability": availability
            }

        except Exception as e:
            print(f"Erreur de récupération des métriques : {e}")
            return None