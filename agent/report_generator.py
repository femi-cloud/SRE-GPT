import os
import json
import datetime
from google import genai
from config import GEMINI_API_KEY

class ReportGenerator:
    """Générateur de rapport d'incident LLM."""
    
    def __init__(self):
        # Utilise le nouveau SDK @google/genai 
        self.client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY and GEMINI_API_KEY != "xxxxx" else None

    def generate_incident_report(self, metrics, action_taken):
        """Produit un diagnostic "Post-mortem" SRE et le sauvegarde au format texte dans le dashboard."""
        prompt = f"""
        En tant que Site Reliability Engineer (SRE) autonome, rédige un Post-Mortem.
        L'incident : 
        - Latence: {metrics.get('latency_ms')} ms
        - Erreurs: {metrics.get('error_rate') * 100}%
        
        L'Action automatique exécutée par l'agent : {action_taken}
        
        Génère : (1) Bilan rapide, (2) Root cause probable, (3) Explication de l'action de rollback. Sois technique mais clair.
        """
        
        report_text = ""
        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                report_text = response.text
            except Exception as e:
                report_text = f"Erreur Gemini: {e}\nMitigation automatique effectuée."
        else:
            report_text = "Clé API Gemini non définie, mitigation par Rollback documentée basiquement."
            
        print("\n\n=== RAPPORT D'INCIDENT IA ===")
        print(report_text)
        print("===============================\n\n")
        
        # Logguer informatiquement pour le Dashboard
        report_dict = {
            "timestamp": datetime.datetime.now().isoformat(),
            "metrics": metrics,
            "action": action_taken,
            "analysis": report_text
        }
        
        os.makedirs("../dashboard", exist_ok=True)
        try:
            with open("../dashboard/status.json", "w") as f:
                json.dump(report_dict, f, indent=4)
        except Exception:
            pass
