# Utilise une image Python légère spécifique
FROM python:3.11-slim

# Définit le dossier de travail dans le conteneur
WORKDIR /app

# Copie le fichier de dépendances
COPY requirements.txt .

# Installe les dépendances requises
RUN pip install --no-cache-dir -r requirements.txt

# Copie le reste des fichiers de l'API
COPY . .

# Expose le port 8080 attendu par Google Cloud Run
EXPOSE 8080

# Démarre l'API avec Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
