# SRE-GPT : Autonomous SRE Agent pour GCP Hackathon

SRE-GPT est un agent autonome qui observe l'état d'un service (Dynatrace), détecte les anomalies, lance l'autoréparation via Google Cloud Run API REST, et génère un post-mortem (Generative AI) avec le nouveau SDK officiel `@google/genai`.

## Fonctionnalités 
- Polling des APIs de monitoring en Python pur (Pas besoin de bash)
- Support de l'OS Windows.
- Détection d'erreurs (Latence et Code http).
- Dashboard Live polling pour présenter les décisions. 
- Mitigations autonomes (Rollback révisions).

## Lancement local
```powershell
pip install -r api/requirements.txt
cd api && uvicorn main:app --reload

# Dans un autre terminal :
pip install requests google-auth python-dotenv google-genai
cd agent && python agent.py
```
Puis, ouvrer un navigateur `file:///.../dashboard/index.html` ou instanciez un serveur local pour le dossier Dashboard.
