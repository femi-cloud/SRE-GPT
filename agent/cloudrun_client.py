import requests
import google.auth
from google.auth.transport.requests import Request
from config import GCP_PROJECT_ID, GCP_REGION, CLOUD_RUN_SERVICE_NAME

class CloudRunClient:
    """Interacts with the Google Cloud Run REST API (v2) to observe and mutate traffic."""

    def __init__(self):
        self.project_id = GCP_PROJECT_ID
        self.region = GCP_REGION
        self.service_name = CLOUD_RUN_SERVICE_NAME
        self.base_url = f"https://run.googleapis.com/v2/projects/{self.project_id}/locations/{self.region}/services/{self.service_name}"

    def _get_token(self):
        """Obtains the JWT Bearer token via default credentials (gcloud auth application-default login)"""
        try:
            credentials, _ = google.auth.default()
            credentials.refresh(Request())
            return credentials.token
        except Exception:
            print("Error retrieving Access Token (GCP).")
            return None

    def get_revisions(self):
        """Retrieves the revision history of the Cloud Run service"""
        token = self._get_token()
        if not token:
            return []

        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{self.base_url}/revisions", headers=headers)
        if response.status_code == 200:
            return response.json().get('revisions', [])
        return []

    def rollback_to_previous(self):
        """Acts as SRE to redirect 100% of traffic to the previous revision"""
        print("Requesting revision history...")
        revisions = self.get_revisions()
        if len(revisions) < 2:
            print("Action cancelled, not enough revisions present.")
            return False

        revisions.sort(key=lambda x: x['createTime'], reverse=True)
        # The 2nd most recent revision
        target_revision_full_name = revisions[1]['name']
        short_name = target_revision_full_name.split('/')[-1]

        token = self._get_token()
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        payload = {
            "traffic": [{"revision": short_name, "percent": 100}]
        }

        # The PATCH updateMask allows to specifically configure the traffic
        res = requests.patch(f"{self.base_url}?updateMask=traffic", headers=headers, json=payload)
        return res.status_code == 200
