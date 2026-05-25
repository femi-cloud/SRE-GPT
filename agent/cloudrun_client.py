import requests
import google.auth
from google.auth.transport.requests import Request
from config import GCP_PROJECT_ID, GCP_REGION, CLOUD_RUN_SERVICE_NAME

class CloudRunClient:
    """Intéragit avec l'API REST Google Cloud Run (v2) pour observer et muter le trafic."""
    
    def __init__(self):
        self.project_id = GCP_PROJECT_ID
        self.region = GCP_REGION
        self.service_name = CLOUD_RUN_SERVICE_NAME
        self.base_url = f"https://run.googleapis.com/v2/projects/{self.project_id}/locations/{self.region}/services/{self.service_name}"
    
    def _get_token(self):
        """Obtient le JWT Bearer via les credentials par défaut (gcloud auth application-default login)"""
        try:
            credentials, _ = google.auth.default()
            credentials.refresh(Request())
            return credentials.token
        except Exception:
            print("Erreur de récupération de l'Access Token (GCP).")
            return None

    def get_revisions(self):
        """Récupère l'historique des révisions du service Cloud Run"""
        token = self._get_token()
        if not token: return []
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{self.base_url}/revisions", headers=headers)
        if response.status_code == 200:
            return response.json().get('revisions', [])
        return []

    def rollback_to_previous(self):
        """Agit comme SRE pour rediriger 100% du trafic vers l'avant-dernière révision"""
        print("Demande de l'historique des révisions...")
        revisions = self.get_revisions()
        if len(revisions) < 2:
            print("Action annulée, pas assez de révisions présentes.")
            return False
            
        revisions.sort(key=lambda x: x['createTime'], reverse=True)
        # La 2e révision la plus récente
        target_revision_full_name = revisions[1]['name'] 
        short_name = target_revision_full_name.split('/')[-1]
        
        token = self._get_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        
        payload = {
            "traffic": [{"revision": short_name, "percent": 100}]
        }
        
        # Le PATCH updateMask permet de configurer spécifiquement le trafic
        res = requests.patch(f"{self.base_url}?updateMask=traffic", headers=headers, json=payload)
        return res.status_code == 200
