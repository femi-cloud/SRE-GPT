import requests
import os
from dotenv import load_dotenv
load_dotenv()

RENDER_API_KEY = os.getenv("RENDER_API_KEY", "")
RENDER_SERVICE_ID = os.getenv("RENDER_SERVICE_ID", "")

class CloudRunClient:
    """Interagit avec l'API Render pour effectuer les rollbacks."""

    def __init__(self):
        self.api_key = RENDER_API_KEY
        self.service_id = RENDER_SERVICE_ID
        self.base_url = "https://api.render.com/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def get_revisions(self):
        """Récupère la liste des déploiements du service Render."""
        try:
            r = requests.get(
                f"{self.base_url}/services/{self.service_id}/deploys",
                headers=self.headers,
                timeout=30
            )
            if r.status_code == 200:
                return r.json()
            else:
                print(f"  ❌ Erreur API Render ({r.status_code}): {r.text[:200]}")
                return []
        except Exception as e:
            print(f"  ❌ Exception : {e}")
            return []

    def rollback_to_previous(self):
        """Redéploie le dernier déploiement stable (2ème de la liste)."""
        print("  → Récupération de l'historique des déploiements...")
        deploys = self.get_revisions()

        if not deploys:
            print("  ❌ Aucun déploiement trouvé")
            return False

        # Trouve le dernier déploiement avec status "live"
        live_deploys = [
            d for d in deploys
            if d.get("deploy", {}).get("status") == "live"
        ]

        print(f"  → {len(live_deploys)} déploiements stables trouvés")

        if len(live_deploys) < 2:
            print("  ⚠️  Pas assez de déploiements stables — redéploiement du current")
            # Redéploie le service actuel
            try:
                r = requests.post(
                    f"{self.base_url}/services/{self.service_id}/deploys",
                    headers=self.headers,
                    json={"clearCache": "do_not_clear"},
                    timeout=30
                )
                if r.status_code in [200, 201]:
                    print("  ✅ Redéploiement déclenché")
                    return True
            except Exception as e:
                print(f"  ❌ Erreur redéploiement : {e}")
            return False

        # Rollback vers le déploiement précédent
        previous_deploy_id = live_deploys[1]["deploy"]["id"]
        print(f"  → Rollback vers déploiement : {previous_deploy_id}")

        try:
            r = requests.post(
                f"{self.base_url}/services/{self.service_id}/deploys",
                headers=self.headers,
                json={"clearCache": "do_not_clear"},
                timeout=30
            )
            if r.status_code in [200, 201]:
                print("  ✅ Rollback déclenché avec succès")
                return True
            else:
                print(f"  ❌ Erreur rollback ({r.status_code}): {r.text[:200]}")
                return False
        except Exception as e:
            print(f"  ❌ Exception rollback : {e}")
            return False