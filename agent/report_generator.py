import os
import json
import datetime
from google import genai
from config import GEMINI_API_KEY

class ReportGenerator:
    """LLM Incident Report Generator."""

    def __init__(self):
        # Uses the new @google/genai SDK
        self.client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY and GEMINI_API_KEY != "xxxxx" else None

    def generate_incident_report(self, metrics, action_taken):
        """Produces an SRE 'Post-mortem' diagnostic and saves it as text in the dashboard."""
        prompt = f"""
        As an autonomous Site Reliability Engineer (SRE), write a Post-Mortem.
        The incident:
        - Latency: {metrics.get('latency_ms')} ms
        - Errors: {metrics.get('error_rate') * 100}%

        The automatic action executed by the agent: {action_taken}

        Generate: (1) Quick summary, (2) Probable root cause, (3) Explanation of the rollback action. Be technical but clear.
        """

        report_text = ""
        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-3.1-flash-lite',
                    contents=prompt
                )
                report_text = response.text
            except Exception as e:
                report_text = f"Gemini error: {e}\nAutomatic mitigation performed."
        else:
            report_text = "Gemini API key not set, mitigation by Rollback documented basically."

        print("\n\n=== AI INCIDENT REPORT ===")
        print(report_text)
        print("===============================\n\n")

        # Log programmatically for the Dashboard
        report_dict = {
            "timestamp": datetime.datetime.now().isoformat(),
            "metrics": metrics,
            "action": action_taken,
            "analysis": report_text
        }

        os.makedirs("../public", exist_ok=True)
        try:
            with open("../public/status.json", "w") as f:
                json.dump(report_dict, f, indent=4)
        except Exception:
            pass
        return report_text

    def analyze_only(self, metrics) -> str:
        """Quick root cause analysis without generating a full report."""
        prompt = f"""
        As an SRE, identify the probable root cause in ONE short sentence.
        Current metrics:
        - Latency: {metrics.get('latency_ms')} ms (threshold: 1000ms)
        - Errors: {metrics.get('error_rate') * 100}% (threshold: 10%)
        - Availability: {metrics.get('availability') * 100}%

        Respond in a single technical and actionable sentence.
        """

        if self.client:
            try:
                response = self.client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt
                )
                return response.text.strip()
            except Exception as e:
                return f"Analysis unavailable: {e}"
        else:
            if metrics.get('latency_ms', 0) > 1000:
                return "High latency detected — possible artificial delay or DB overload."
            elif metrics.get('error_rate', 0) > 0.1:
                return "High error rate — service instability or recent code error."
            else:
                return "Degraded availability — service potentially in cold start."
