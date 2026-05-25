import requests
from config import DT_ENVIRONMENT_URL, DT_API_TOKEN

class DynatraceClient:
    """Wrapper pour l'API REST de Dynatrace pour obtenir les métriques de base."""
    
    def __init__(self):
        self.base_url = DT_ENVIRONMENT_URL.rstrip('/')
        self.headers = {
            "Authorization": f"Api-Token {DT_API_TOKEN}",
            "Content-Type": "application/json"
        }

    def get_metrics(self):
        """Récupère la latence, le taux d'erreur, et la disponibilité."""
        # Dans un environnement de production: on requêterait l'API `/api/v2/metrics/query`
        # Ex : 'builtin:service.response.time:avg'
        
        # Pour une démo sans données Dynatrace connectées tout de suite,
        # vous pouvez dé-commenter ces lignes de simulation ou lire vos vrais endpoint :
        try:
            # url = f"{self.base_url}/api/v2/metrics/query"
            # response = requests.get(url, headers=self.headers, params={"metricSelector": "builtin:service.response.time:avg"})
            # response.raise_for_status()
            
            # TODO : Remplacer par de vraies requêtes. Ici nous mockons un retour type.
            # En développement, on simulerait une récupération de l'état "health"
            return {
                "latency_ms": 150.0,
                "error_rate": 0.05,
                "availability": 1.0
            }
        except Exception as e:
            print(f"Erreur de communication avec l'API Dynatrace : {e}")
            return None
