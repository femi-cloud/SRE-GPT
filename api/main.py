import time
import random
import os
from fastapi import FastAPI, HTTPException, Response

app = FastAPI(title="SRE-GPT API à surveiller")

def get_config(filepath: str, default: float) -> float:
    """Lit les fichiers textes pour configurer dynamiquement le comportement (latence/erreurs)"""
    try:
        with open(filepath, 'r') as f:
            return float(f.read().strip())
    except Exception:
        return default

@app.get("/health")
def health_check():
    """Endpoint de santé pour la disponibilité, toujours OK"""
    return {"status": "ok"}

@app.get("/users")
def get_users():
    """Endpoint avec latence simulée pour déclencher l'agent"""
    # Lecture du délai, on simule une latence anormale si le fichier est modifié
    delay = get_config("delay.txt", 0.0)
    if delay > 0:
        time.sleep(delay / 1000.0) # Pause en secondes
    return [{"id": 1, "name": "Utilisateur A"}, {"id": 2, "name": "Utilisateur B"}]

@app.get("/process")
def process_data():
    """Endpoint avec taux d'erreur simulé ({error_rate.txt} x 100 %)"""
    error_rate = get_config("error_rate.txt", 0.0)
    if random.random() < error_rate:
        # Envoie une erreur 500
        raise HTTPException(status_code=500, detail="Erreur interne simulée sur l'API")
    return {"status": "success", "processed": True}

if __name__ == "__main__":
    import uvicorn
    # Écoute sur toutes les interfaces, port récupéré via Cloud Run
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
