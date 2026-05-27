import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AlertTriangle, CheckCircle, Server, Info, ShieldAlert, Cpu, Network, Moon, Sun, Download, FileText, HelpCircle, X, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { MetricPoint, IncidentReport, ThresholdConfig } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { RecentIncidents } from './components/RecentIncidents';
import { KpiCard } from './components/KpiCard';
import { ChartCard } from './components/ChartCard';
import { SimulationControls } from './components/SimulationControls';

const STATUS_JSON_URL = 'http://localhost:4000/status.json';
const FETCH_INTERVAL_MS = 15000;

export default function App() {
  interface LogEntry {
    timestamp: string;
    type: 'SYSTEM' | 'INFO' | 'ANALYSIS' | 'WARN' | 'INCIDENT' | 'ROLLBACK' | 'RESOLVED';
    message: string;
  }

  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date(Date.now() - 30000).toLocaleTimeString(), type: 'SYSTEM', message: 'SRE-GPT Autonomous Agent initialized.' },
    { timestamp: new Date(Date.now() - 20000).toLocaleTimeString(), type: 'INFO', message: 'Awaiting active telemetry inputs...' },
    { timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'Autonomous Service monitoring actively established.' }
  ]);

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev.slice(-48), { timestamp: new Date().toLocaleTimeString(), type, message }]);
  };

  const [data, setData] = useState<MetricPoint[]>([]);
  const [status, setStatus] = useState<'OK' | 'INCIDENT' | 'COOLDOWN'>('OK');
  const [incident, setIncident] = useState<IncidentReport | null>(null);

  // Agent live status
  const [agentLive, setAgentLive] = useState<boolean>(false);
  const [agentMode, setAgentMode] = useState<'live' | 'simulation'>('simulation');
  const lastAgentTsRef = useRef<number>(0);

  // Settings & Thresholds
  const [thresholds, setThresholds] = useState<ThresholdConfig>({ latency: 1000, errorRate: 0.1 });
  const thresholdsRef = useRef(thresholds);
  useEffect(() => { thresholdsRef.current = thresholds; }, [thresholds]);

  // Simulation Controls & Fault Interceptors State
  const [isSimPlaying, setIsSimPlaying] = useState<boolean>(true);
  const [activeFault, setActiveFault] = useState<'none' | 'latency' | 'error' | 'both'>('none');
  const [trafficProfile, setTrafficProfile] = useState<'normal' | 'peak' | 'quiet'>('normal');

  const isSimPlayingRef = useRef(isSimPlaying);
  const activeFaultRef = useRef(activeFault);
  const trafficProfileRef = useRef(trafficProfile);
  const statusRef = useRef(status);
  const agentModeRef = useRef(agentMode);

  useEffect(() => { isSimPlayingRef.current = isSimPlaying; }, [isSimPlaying]);
  useEffect(() => { activeFaultRef.current = activeFault; }, [activeFault]);
  useEffect(() => { trafficProfileRef.current = trafficProfile; }, [trafficProfile]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { agentModeRef.current = agentMode; }, [agentMode]);

  const [lang, setLang] = useState<'en'|'fr'>('en');
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const showHelpModalRef = useRef(showHelpModal);
  useEffect(() => { showHelpModalRef.current = showHelpModal; }, [showHelpModal]);

  const t = {
    en: {
      title: "SRE-GPT Monitor",
      subtitle: "Autonomous Cloud Run Reliability Agent",
      statusLabel: "System Status",
      operational: "OPERATIONAL",
      incident: "INCIDENT DETECTED",
      cooldown: "MITIGATED (COOLDOWN)",
      latencyLabel: "Latency (avg)",
      errorLabel: "Error Rate",
      availLabel: "Availability",
      historyChart: "System Status History",
      aiReport: "Incident Post-Mortem — Gemini Analysis",
      action: "Action",
      export: "JSON Export",
      help: "Help",
      helpTitle: "Keyboard Shortcuts Reference",
      helpDesc: "Use these system hotkeys to quickly navigate and control the SRE dashboard from your keyboard.",
      themeShortcut: "Toggle light / dark mode color scheme dynamically.",
      searchShortcut: "Direct focus instantly into the incident post-mortem database query filter.",
      helpShortcut: "Open or close this accessibility options references dashboard.",
      close: "Close",
      agentLive: "Agent Live",
      agentOffline: "Agent Offline",
      modeLive: "Live Data",
      modeSim: "Simulation",
    },
    fr: {
      title: "SRE-GPT Moniteur",
      subtitle: "Agent Autonome de Fiabilité Cloud Run",
      statusLabel: "État du Système",
      operational: "OPÉRATIONNEL",
      incident: "INCIDENT DÉTECTÉ",
      cooldown: "RÉSOLU (COOLDOWN)",
      latencyLabel: "Latence (moyenne)",
      errorLabel: "Taux d'erreur",
      availLabel: "Disponibilité",
      historyChart: "Historique du Système",
      aiReport: "Post-Mortem — Analyse Gemini",
      action: "Action",
      export: "Export JSON",
      help: "Aide",
      helpTitle: "Référence des Raccourcis Clavier",
      helpDesc: "Utilisez ces raccourcis système pour naviguer et contrôler rapidement le tableau de bord SRE depuis votre clavier.",
      themeShortcut: "Basculer dynamiquement entre les thèmes de couleurs clair et sombre.",
      searchShortcut: "Placer instantanément le focus sur le filtre de recherche de la base de données post-mortem.",
      helpShortcut: "Ouvrir ou fermer ce tableau de bord d'accessibilité.",
      close: "Fermer",
      agentLive: "Agent Actif",
      agentOffline: "Agent Hors-Ligne",
      modeLive: "Données Réelles",
      modeSim: "Simulation",
    }
  }[lang];

  // Keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === 'd') {
        setIsDark(prev => !prev);
      } else if (key === 's') {
        e.preventDefault();
        document.getElementById('incident-search')?.focus();
      } else if (key === 'h' || e.key === '?') {
        e.preventDefault();
        setShowHelpModal(prev => !prev);
      } else if (e.key === 'Escape') {
        if (showHelpModalRef.current) setShowHelpModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sre_recent_theme');
      return saved === null ? true : saved === 'dark';
    }
    return true;
  });

  // Recent Incidents Store
  const [pastIncidents, setPastIncidents] = useState<IncidentReport[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sre_recent_incidents');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const getLocalizedIncident = (inc: IncidentReport | null, currentLang: 'en' | 'fr'): IncidentReport | null => {
    if (!inc) return null;
    if (currentLang === 'en') return inc;
    const translations: Record<string, { actionFr: string; analysisFr: string }> = {
      "Container Auto-Scaling Triggered (GCP Cloud Run)": {
        actionFr: "Démarrage d'Auto-Scaling (GCP Cloud Run)",
        analysisFr: "Alerte d'anomalie : Dégradation des performances détectée.\n\n- Latence observée : [LATENCY]ms (seuil : [LATENCY_THRESHOLD]ms).\n- Taux d'erreur observé : [ERROR_RATE]% (seuil : [ERROR_THRESHOLD]%).\n\nCause profonde : Épuisement des ressources détecté sur la région du cluster principal.\nAction : L'agent autonome IA a attribué une capacité supplémentaire."
      },
      "Horizontal Replication Scale Up (+4 Pods)": {
        actionFr: "Mise à l'échelle horizontale (+4 Pods)",
        analysisFr: "Alerte d'anomalie : Seuil de latence dépassé.\n\n- Latence observée : [LATENCY]ms (plafond : [LATENCY_THRESHOLD]ms).\n\nCause profonde : Verrous transactionnels lents sur les tables de lecture.\nAction : Déploiement d'instances supplémentaires."
      },
      "Automated Canary Rollback (Rev Stable v2.10.4)": {
        actionFr: "Retour automatique de canary (Rév Stable v2.10.4)",
        analysisFr: "Alerte d'anomalie : Pic d'erreurs violant les marges de sécurité.\n\n- Taux d'erreur : [ERROR_RATE]% (plafond : [ERROR_THRESHOLD]%).\n\nCause profonde : Variable d'environnement manquante.\nAction : Redirection vers la version précédente."
      },
      "Gateway Outage Protection Redirect (Cloud DNS Failover)": {
        actionFr: "Redirection de protection contre les pannes (Cloud DNS)",
        analysisFr: "Alerte d'anomalie : Interruption totale détectée.\n\n- Latence : [LATENCY]ms, Erreurs : [ERROR_RATE]%, Disponibilité : [AVAILABILITY]%.\n\nCause profonde : Panne de connexion en cascade.\nAction : Failover DNS d'urgence activé."
      }
    };
    const matchedKey = Object.keys(translations).find(key =>
      inc.action === key || inc.action.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(inc.action.toLowerCase())
    );
    if (matchedKey) {
      const match = translations[matchedKey];
      let localizedAnalysis = match.analysisFr;
      const latMatch = inc.analysis.match(/(\d+)ms/i);
      const latVal = latMatch ? latMatch[1] : '1100';
      const errMatch = inc.analysis.match(/([\d.]+)%/i);
      const errVal = errMatch ? errMatch[1] : '15';
      localizedAnalysis = localizedAnalysis
        .replace('[LATENCY]', latVal).replace('[LATENCY_THRESHOLD]', '1000')
        .replace('[ERROR_RATE]', errVal).replace('[ERROR_THRESHOLD]', '10')
        .replace('[AVAILABILITY]', '95');
      return { ...inc, action: match.actionFr, analysis: localizedAnalysis };
    }
    return inc;
  };

  useEffect(() => {
    localStorage.setItem('sre_recent_incidents', JSON.stringify(pastIncidents));
  }, [pastIncidents]);

  const addIncident = (inc: IncidentReport) => {
    setPastIncidents(prev => [inc, ...prev].filter((v,i,a) => a.findIndex(t => t.id === v.id) === i).slice(0, 10));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) { root.classList.add('dark'); localStorage.setItem('sre_recent_theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('sre_recent_theme', 'light'); }
  }, [isDark]);

  // Logging side effects
  useEffect(() => {
    if (status === 'OK') addLog('INFO', 'Telemetry nominal. Active protection standby.');
    else if (status === 'INCIDENT') addLog('INCIDENT', 'CRITICAL BREACH: Anomaly detected on primary region.');
    else if (status === 'COOLDOWN') addLog('ROLLBACK', 'AUTO REMEDIATION ENGAGED: Traffic rerouted; rollback applied.');
  }, [status]);

  useEffect(() => {
    addLog('INFO', `Alert thresholds updated: Latency=${thresholds.latency}ms, Error rate=${(thresholds.errorRate*100).toFixed(0)}%.`);
  }, [thresholds]);

  useEffect(() => {
    addLog('SYSTEM', `Traffic profile set to: ${trafficProfile.toUpperCase()}`);
  }, [trafficProfile]);

  useEffect(() => {
    if (activeFault !== 'none') addLog('WARN', `CHAOS VECTOR: Injecting [${activeFault.toUpperCase()}] fault.`);
    else addLog('INFO', 'Fault vector removed. Telemetry returning to stable load.');
  }, [activeFault]);

  // ─────────────────────────────────────────────────────────────
  // LIVE FETCH from agent status.json
  // ─────────────────────────────────────────────────────────────
  const prevAgentStatusRef = useRef<string>('');

  const fetchAgentStatus = async () => {
    try {
      const r = await fetch(`${STATUS_JSON_URL}?rnd=${Date.now()}`);
      if (!r.ok) throw new Error('not ok');
      const agentData = await r.json();

      lastAgentTsRef.current = Date.now();
      setAgentLive(true);
      setAgentMode('live');

      const m = agentData.metrics;
      const agentStatus: string = agentData.status; // "OK" | "INCIDENT" | "ROLLBACK"
      const agentAnalysis: string = agentData.analysis || '';
      const agentAction: string = agentData.action || '';

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const statusCode = agentStatus === 'INCIDENT' ? 2 : (agentStatus === 'ROLLBACK' ? 1 : 0);
      const mappedStatus: 'OK' | 'INCIDENT' | 'COOLDOWN' =
        agentStatus === 'INCIDENT' ? 'INCIDENT' :
        agentStatus === 'ROLLBACK' ? 'COOLDOWN' : 'OK';

      setData(prev => {
        const newData = [...prev.slice(-19), {
          time: timeStr,
          latency_ms: m.latency_ms,
          error_rate: m.error_rate,
          availability: m.availability,
          status_code: statusCode,
        }];
        return newData;
      });

      setStatus(mappedStatus);

      // Build incident report from agent data when analysis present
      if (agentAnalysis && agentStatus === 'INCIDENT' && prevAgentStatusRef.current !== 'INCIDENT') {
        const newInc: IncidentReport = {
          id: Date.now().toString(),
          timestamp: agentData.timestamp || new Date().toISOString(),
          action: agentAction || 'SRE-GPT Auto-Remediation',
          analysis: agentAnalysis,
        };
        setIncident(newInc);
        addIncident(newInc);
        addLog('ANALYSIS', `Gemini report received: ${agentAction}`);
      }

      if (agentStatus === 'OK' && prevAgentStatusRef.current === 'INCIDENT') {
        addLog('RESOLVED', 'System returned to operational parameters.');
        setIncident(null);
      }

      if (agentStatus === 'ROLLBACK') {
        addLog('ROLLBACK', `Action: ${agentAction}`);
      }

      prevAgentStatusRef.current = agentStatus;

    } catch {
      // Agent not reachable — mark offline, keep simulation running
      if (Date.now() - lastAgentTsRef.current > 30000 && lastAgentTsRef.current > 0) {
        setAgentLive(false);
      }
      if (lastAgentTsRef.current === 0) {
        setAgentMode('simulation');
      }
    }
  };

  // Poll agent every 15s
  useEffect(() => {
    fetchAgentStatus();
    const poll = setInterval(fetchAgentStatus, FETCH_INTERVAL_MS);
    return () => clearInterval(poll);
  }, []);

  // Agent live watchdog
  useEffect(() => {
    const watchdog = setInterval(() => {
      if (lastAgentTsRef.current > 0 && Date.now() - lastAgentTsRef.current > 90000) {
        setAgentLive(false);
        setAgentMode('simulation');
      }
    }, 5000);
    return () => clearInterval(watchdog);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // SIMULATION FALLBACK (only runs when agent is not live)
  // ─────────────────────────────────────────────────────────────
  const consecutiveBreachesRef = useRef(0);
  const ticksSinceStatusChangeRef = useRef(0);

  useEffect(() => {
    const initialData: MetricPoint[] = Array.from({ length: 20 }).map((_, i) => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - (20 - i));
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency_ms: 90 + Math.random() * 25,
        error_rate: Math.random() * 0.012,
        availability: 1.0,
        status_code: 0,
      };
    });
    setData(initialData);

    const interval = setInterval(() => {
      // Skip simulation tick when live agent data is flowing
      if (agentModeRef.current === 'live') return;
      if (!isSimPlayingRef.current) return;

      let baseLatency = 100, baseError = 0.005, availability = 1.0;
      if (trafficProfileRef.current === 'quiet') { baseLatency = 45 + Math.random() * 15; baseError = Math.random() * 0.004; }
      else if (trafficProfileRef.current === 'normal') { baseLatency = 95 + Math.random() * 25; baseError = Math.random() * 0.01; }
      else if (trafficProfileRef.current === 'peak') { baseLatency = 190 + Math.random() * 40; baseError = 0.015 + Math.random() * 0.015; }

      let latency_ms = baseLatency, error_rate = baseError;
      const currentStatus = statusRef.current;
      const f = activeFaultRef.current;

      if (f === 'latency' || (currentStatus === 'INCIDENT' && f === 'none')) { latency_ms = 1150 + Math.random() * 250; error_rate = baseError + 0.012 + Math.random() * 0.012; availability = 0.985; }
      else if (f === 'error') { latency_ms = baseLatency + 60 + Math.random() * 40; error_rate = 0.16 + Math.random() * 0.05; availability = 0.952; }
      else if (f === 'both') { latency_ms = 1950 + Math.random() * 300; error_rate = 0.35 + Math.random() * 0.08; availability = 0.68 + Math.random() * 0.07; }
      if (currentStatus === 'COOLDOWN') { latency_ms = baseLatency * 0.85 + 25 + Math.random() * 15; error_rate = baseError * 0.5 + Math.random() * 0.005; availability = 0.998; }

      const latencyThreshold = thresholdsRef.current.latency;
      const errorThreshold = thresholdsRef.current.errorRate;
      const isLatencyBreached = latency_ms > latencyThreshold;
      const isErrorBreached = error_rate > errorThreshold;
      const isBreaching = isLatencyBreached || isErrorBreached;
      let nextStatus = currentStatus;

      if (currentStatus === 'OK') {
        if (isBreaching) {
          consecutiveBreachesRef.current += 1;
          if (consecutiveBreachesRef.current >= 3) {
            nextStatus = 'INCIDENT';
            consecutiveBreachesRef.current = 0;
            ticksSinceStatusChangeRef.current = 0;
            let act = "Container Auto-Scaling Triggered (GCP Cloud Run)";
            let desc = `Anomaly Alert: Performance Degradation Detected.\n\n- Latency observed: ${Math.round(latency_ms)}ms (threshold: ${latencyThreshold}ms).\n- Error rate observed: ${(error_rate*100).toFixed(1)}% (threshold: ${(errorThreshold*100).toFixed(1)}%).\n\nRoot Cause: Resource starvation on primary cluster region.\nAction: AI Engine provisioned supplementary capacity.`;
            if (isLatencyBreached && !isErrorBreached) { act = "Horizontal Replication Scale Up (+4 Pods)"; desc = `Anomaly Alert: Latency Threshold Breached.\n\n- Observed Latency: ${Math.round(latency_ms)}ms (ceiling: ${latencyThreshold}ms).\n\nRoot Cause: Slow transactional locks on read-heavy DB tables.\nAction: Additional container instances deployed.`; }
            else if (isErrorBreached && !isLatencyBreached) { act = "Automated Canary Rollback (Rev Stable v2.10.4)"; desc = `Anomaly Alert: Error Spike Breached Safety Margins.\n\n- Simulated Error Rate: ${(error_rate*100).toFixed(1)}% (ceiling: ${(errorThreshold*100).toFixed(0)}%).\n\nRoot Cause: Missing runtime environment variable.\nAction: Traffic shifted to previous validated revision.`; }
            else if (f === 'both' || (isLatencyBreached && isErrorBreached)) { act = "Gateway Outage Protection Redirect (Cloud DNS Failover)"; desc = `Anomaly Alert: Total Service Interruption.\n\n- Latency: ${Math.round(latency_ms)}ms, Error Rate: ${(error_rate*100).toFixed(1)}%, Availability: ${(availability*100).toFixed(1)}%.\n\nRoot Cause: Total backend microservice disconnect.\nAction: Emergency DNS Failover to secondary region.`; }
            const newInc: IncidentReport = { id: Date.now().toString(), timestamp: new Date().toISOString(), action: act, analysis: desc };
            setIncident(newInc);
            addIncident(newInc);
          }
        } else { consecutiveBreachesRef.current = 0; }
      } else if (currentStatus === 'INCIDENT') {
        ticksSinceStatusChangeRef.current += 1;
        if (ticksSinceStatusChangeRef.current >= 4) { nextStatus = 'COOLDOWN'; ticksSinceStatusChangeRef.current = 0; }
      } else if (currentStatus === 'COOLDOWN') {
        ticksSinceStatusChangeRef.current += 1;
        if (ticksSinceStatusChangeRef.current >= 4) { nextStatus = 'OK'; ticksSinceStatusChangeRef.current = 0; setIncident(null); setActiveFault('none'); }
      }

      if (nextStatus !== currentStatus) setStatus(nextStatus);
      const statusCode = nextStatus === 'INCIDENT' ? 2 : nextStatus === 'COOLDOWN' ? 1 : 0;
      setData(prev => {
        const now = new Date();
        return [...prev.slice(1), { time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), latency_ms, error_rate, availability, status_code: statusCode }];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const currentMetrics = data[data.length - 1] || { latency_ms: 0, error_rate: 0, availability: 1 };
  const prevMetrics = data[data.length - 2];
  const localizedIncident = getLocalizedIncident(incident, lang);

  const axisColor = isDark ? '#9ca3af' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#ffffff',
    color: isDark ? '#f8fafc' : '#0f172a',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,23,42,0.08)',
    borderRadius: '8px',
    boxShadow: isDark ? '0 10px 15px -3px rgba(0,0,0,0.3)' : '0 10px 15px -3px rgba(15,23,42,0.05)'
  };

  // ─── Download helpers ───────────────────────────────────────
  const downloadJSON = (inc: IncidentReport) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(inc, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `incident_report_${new Date(inc.timestamp).getTime()}.json`);
    document.body.appendChild(a); a.click(); a.remove();
  };

  const downloadPDF = (inc: IncidentReport) => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 42, "F");
    doc.setFont("Helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(255, 255, 255);
    doc.text("SRE-GPT MONITOR - INCIDENT REPORT", 14, 24);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(148, 163, 184);
    doc.text("Autonomous Cloud Run Reliability Agent — Post-Mortem", 14, 32);
    doc.setFillColor(244, 63, 94); doc.rect(148, 14, 48, 7, "F");
    doc.setFont("Helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text("AUTO-REMEDIATION", 154, 19);
    doc.setFont("Helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
    doc.text("1. PRIMARY INCIDENT SYNOPSIS", 14, 55);
    doc.setDrawColor(226, 232, 240); doc.line(14, 58, 196, 58);
    doc.setFillColor(248, 250, 252); doc.rect(14, 63, 89, 58, "F"); doc.setDrawColor(226, 232, 240); doc.rect(14, 63, 89, 58, "S");
    doc.setFont("Helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text("INCIDENT ID", 18, 71); doc.text("TIMESTAMP (UTC)", 18, 83);
    doc.text("AVAILABILITY IMPACT", 18, 95); doc.text("SOURCE", 18, 107);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(inc.id, 18, 76); doc.text(new Date(inc.timestamp).toUTCString(), 18, 88);
    doc.text("Service Sub-Nominal (Active Outage)", 18, 100);
    doc.text(agentMode === 'live' ? "SRE-GPT Live Agent" : "SRE-GPT Simulation", 18, 112);
    doc.setFillColor(239, 246, 255); doc.rect(107, 63, 89, 58, "F"); doc.setDrawColor(191, 219, 254); doc.rect(107, 63, 89, 58, "S");
    doc.setFont("Helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(29, 78, 216);
    doc.text("ENACTED MITIGATION ACTION", 111, 71);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(inc.action, 81), 111, 77);
    doc.setFont("Helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(15, 23, 42);
    doc.text("2. ROOT CAUSE ANALYSIS", 14, 134);
    doc.setDrawColor(226, 232, 240); doc.line(14, 137, 196, 137);
    doc.setFont("Helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(inc.analysis, 182);
    let y = 145;
    lines.forEach((line: string) => {
      if (y > 270) { doc.setFont("Helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.text("CONFIDENTIAL — SRE-GPT AUTO-GENERATED POST-MORTEM", 14, 286); doc.addPage(); doc.setFont("Helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(51, 65, 85); y = 20; }
      doc.text(line, 14, y); y += 5.5;
    });
    doc.setFont("Helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("CONFIDENTIAL — SRE-GPT AUTO-GENERATED POST-MORTEM", 14, 286);
    doc.text(`Generated at ${new Date().toUTCString()}`, 140, 286);
    doc.save(`incident_postmortem_${inc.id}.pdf`);
  };

  return (
    <div className={`min-h-screen text-slate-900 dark:text-slate-100 font-sans p-4 md:p-8 relative overflow-hidden transition-colors ${status === 'INCIDENT' ? 'status-incident' : ''}`}>
      <div className="absolute -top-40 -left-40 w-150 h-150 rounded-full blur-[130px] pointer-events-none transition-all duration-500" style={{ backgroundColor: isDark ? 'rgba(6,182,212,0.15)' : 'rgba(6,182,212,0.09)' }} />
      <div className="absolute -bottom-40 -right-40 w-175 h-175 rounded-full blur-[150px] pointer-events-none transition-all duration-500" style={{ backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.09)' }} />

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 transition-all">
          <div className="flex items-center gap-4">
            <img src="logo.svg" className="h-10 w-10" alt="SRE-GPT"/>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t.title}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="http://localhost:4000" className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/40 border border-indigo-200/50 dark:border-indigo-500/20 text-indigo-650 dark:text-indigo-400 text-xs cursor-pointer h-9 transition-colors shadow-sm no-underline" title="Switch to Ops Center">
              <Server size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'en' ? 'Ops Center' : 'Centre Ops'}</span>
            </a>

            {/* Agent Live/Offline + Mode Badge */}
            <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl shadow-sm h-9 transition-colors ${agentLive ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
              {agentLive ? <Wifi size={13} className="text-emerald-500" /> : <WifiOff size={13} className="text-slate-400" />}
              <span className={`text-xs font-bold tracking-wide ${agentLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                {agentLive ? t.agentLive : t.agentOffline}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${agentMode === 'live' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'}`}>
                {agentMode === 'live' ? t.modeLive : t.modeSim}
              </span>
            </div>

            {/* System Status Badge */}
            <div className="flex items-center gap-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl shadow-sm h-9">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t.statusLabel}:</span>
              <AnimatePresence mode="wait">
                {status === 'OK' && <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider"><CheckCircle size={14} /><span>{t.operational}</span></motion.div>}
                {status === 'INCIDENT' && <motion.div key="incident" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider"><AlertTriangle size={14} className="animate-pulse" /><span>{t.incident}</span></motion.div>}
                {status === 'COOLDOWN' && <motion.div key="cooldown" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider"><ShieldAlert size={14} /><span>{t.cooldown}</span></motion.div>}
              </AnimatePresence>
            </div>

            <button onClick={() => setLang(l => l === 'en' ? 'fr' : 'en')} className="px-3 py-1.5 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors uppercase text-xs cursor-pointer h-9">{lang}</button>
            <button onClick={() => setIsDark(!isDark)} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer h-9 flex items-center justify-center" title={isDark ? "Light Mode (D)" : "Dark Mode (D)"}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KpiCard title={t.latencyLabel} value={`${Math.round(currentMetrics.latency_ms)} ms`} prevValue={prevMetrics ? `${Math.round(prevMetrics.latency_ms)} ms` : undefined} lowerIsBetter={true} icon={<Network size={20} />} status={currentMetrics.latency_ms > thresholds.latency ? 'danger' : 'normal'} />
              <KpiCard title={t.errorLabel} value={`${(currentMetrics.error_rate * 100).toFixed(1)}%`} prevValue={prevMetrics ? `${(prevMetrics.error_rate * 100).toFixed(1)}%` : undefined} lowerIsBetter={true} icon={<Server size={20} />} status={currentMetrics.error_rate > thresholds.errorRate ? 'danger' : 'normal'} />
              <KpiCard title={t.availLabel} value={`${(currentMetrics.availability * 100).toFixed(1)}%`} prevValue={prevMetrics ? `${(prevMetrics.availability * 100).toFixed(1)}%` : undefined} lowerIsBetter={false} icon={<Cpu size={20} />} status={currentMetrics.availability < 0.95 ? 'danger' : 'normal'} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="API Latency (ms)">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs><linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={currentMetrics.latency_ms > thresholds.latency ? '#ef4444' : '#06B6D4'} stopOpacity={0.4}/><stop offset="95%" stopColor={currentMetrics.latency_ms > thresholds.latency ? '#ef4444' : '#06B6D4'} stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="latency_ms" stroke={currentMetrics.latency_ms > thresholds.latency ? '#ef4444' : '#06B6D4'} strokeWidth={3} fillOpacity={1} fill="url(#colorLat)" isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Error Rate (%)">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} tickFormatter={(v) => `${(v*100).toFixed(0)}%`} />
                    <Tooltip formatter={(v) => typeof v === 'number' ? `${(v*100).toFixed(2)}%` : String(v)} contentStyle={tooltipStyle} />
                    <Line type="stepAfter" dataKey="error_rate" stroke={currentMetrics.error_rate > thresholds.errorRate ? '#ef4444' : '#8b5cf6'} strokeWidth={3} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <ChartCard title={t.historyChart}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs><linearGradient id="colorStatus" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} minTickGap={30} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: axisColor }} domain={[0, 2]} ticks={[0, 1, 2]} tickFormatter={(v) => v === 2 ? 'INCIDENT' : v === 1 ? 'COOLDOWN' : 'OK'} />
                  <Tooltip formatter={(v) => Number(v) === 2 ? 'INCIDENT' : Number(v) === 1 ? 'COOLDOWN' : 'OK'} contentStyle={tooltipStyle} />
                  <Area type="stepAfter" dataKey="status_code" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorStatus)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* AI Report — current incident */}
            <AnimatePresence>
              {localizedIncident && (
                <motion.div initial={{ opacity: 0, height: 0, scale: 0.98 }} animate={{ opacity: 1, height: 'auto', scale: 1 }} exit={{ opacity: 0, height: 0, scale: 0.98 }} className="glass-card overflow-hidden transform-gpu">
                  <div className="bg-indigo-500/10 p-5 px-6 border-b border-slate-200/50 dark:border-white/8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-slate-100 dark:bg-white/5 p-2.5 shadow-sm rounded-full text-indigo-500 dark:text-indigo-400 mt-1 shrink-0"><Info size={22} /></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t.aiReport}</h3>
                          {agentMode === 'live' && <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">LIVE</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium font-mono">
                          <span className="bg-indigo-500/10 dark:bg-indigo-500/20 px-2.5 py-1 rounded-md text-indigo-700 dark:text-indigo-300">{t.action}: {localizedIncident.action}</span>
                          <span className="hidden sm:inline opacity-60">•</span>
                          <span className="opacity-80">{new Date(localizedIncident.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto font-mono">
                      <button onClick={() => downloadJSON(localizedIncident)} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-bold bg-slate-100 dark:bg-white/5 text-indigo-600 dark:text-indigo-300 border border-slate-200 dark:border-white/10 rounded-lg shadow-sm hover:bg-indigo-500/10 transition-colors cursor-pointer" title="Download JSON">
                        <Download size={16} /> {t.export}
                      </button>
                      <button onClick={() => downloadPDF(localizedIncident)} className="flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-bold bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer" title="Download PDF">
                        <FileText size={16} /> {lang === 'en' ? 'Download PDF' : 'Télécharger PDF'}
                      </button>
                    </div>
                  </div>
                  <div className="p-6 px-8 bg-transparent">
                    <div className="prose prose-indigo dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line text-[15px] leading-relaxed">
                      {localizedIncident.analysis}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Past Incidents — all downloadable */}
            {pastIncidents.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">
                  {lang === 'en' ? `Past Incident Reports (${pastIncidents.length})` : `Rapports d'incidents passés (${pastIncidents.length})`}
                </h3>
                <div className="space-y-3">
                  {pastIncidents.map((inc) => {
                    const loc = getLocalizedIncident(inc, lang) as IncidentReport;
                    return (
                      <div key={inc.id} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{loc.action}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">{new Date(loc.timestamp).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => downloadJSON(loc)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-100 dark:bg-white/5 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer">
                            <Download size={12} /> JSON
                          </button>
                          <button onClick={() => downloadPDF(loc)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer">
                            <FileText size={12} /> PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Terminal Log */}
            <div className="glass-card p-0 flex flex-col h-75 overflow-hidden w-full">
              <div className="bg-slate-100 dark:bg-black/40 px-4 py-2.5 border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="ml-3 text-xs font-mono text-slate-500 dark:text-slate-400">agent_action.log</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest">Live Output</span>
                </div>
              </div>
              <div className="p-5 flex-1 overflow-y-auto custom-scrollbar font-mono text-xs space-y-2 text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-black/15">
                {logs.map((log, index) => {
                  let colorClass = 'text-emerald-600 dark:text-emerald-400';
                  if (['INCIDENT', 'ERROR'].includes(log.type)) colorClass = 'text-red-600 dark:text-red-400';
                  else if (['ANALYSIS', 'WARN'].includes(log.type)) colorClass = 'text-amber-600 dark:text-yellow-400';
                  else if (log.type === 'INFO') colorClass = 'text-cyan-600 dark:text-cyan-400';
                  else if (log.type === 'ROLLBACK') colorClass = 'text-purple-600 dark:text-purple-400';
                  else if (log.type === 'RESOLVED') colorClass = 'text-emerald-500 dark:text-emerald-300';
                  return (
                    <div key={index} className="flex items-start gap-3">
                      <span className="text-slate-400 dark:text-slate-500 shrink-0">[{log.timestamp}]</span>
                      <span className={`${colorClass} font-bold shrink-0 w-24`}>[{log.type}]</span>
                      <span className="opacity-95 leading-relaxed">{log.message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <SimulationControls
              isSimPlaying={isSimPlaying}
              onToggleSim={() => setIsSimPlaying(!isSimPlaying)}
              activeFault={activeFault}
              onInjectFault={(fault) => { setActiveFault(fault); if (fault === 'none' && status === 'INCIDENT') setStatus('COOLDOWN'); }}
              trafficProfile={trafficProfile}
              onChangeProfile={setTrafficProfile}
              lang={lang}
            />
            <SettingsPanel thresholds={thresholds} onThresholdChange={setThresholds} />
            <RecentIncidents incidents={pastIncidents.map(inc => getLocalizedIncident(inc, lang) as IncidentReport)} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200/50 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>System Status: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">• ONLINE</span> &nbsp;|&nbsp; Data source: <span className={`font-semibold ${agentMode === 'live' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{agentMode === 'live' ? (lang === 'en' ? 'Live Agent' : 'Agent Réel') : (lang === 'en' ? 'Simulation' : 'Simulation')}</span></div>
          <div className="flex flex-wrap items-center gap-4">
            <span>Keyboard Shortcuts:</span>
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 font-mono shadow-sm"><kbd className="font-sans font-bold text-indigo-650 dark:text-indigo-400">D</kbd> {lang === 'en' ? 'Toggle Theme' : 'Basculer Thème'}</span>
            <span className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 font-mono shadow-sm"><kbd className="font-sans font-bold text-indigo-650 dark:text-indigo-400">S</kbd> {lang === 'en' ? 'Search Incidents' : 'Rechercher Incidents'}</span>
            <button onClick={() => setShowHelpModal(true)} className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/45 dark:hover:bg-indigo-900/45 dark:text-indigo-400 rounded-lg transition-all cursor-pointer border border-indigo-200/50 dark:border-indigo-500/20 shadow-sm active:scale-95"><HelpCircle size={13} />{t.help}</button>
          </div>
        </footer>
      </div>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHelpModal(false)} className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 15 }} transition={{ type: "spring", duration: 0.4 }} className="glass-card w-full max-w-md p-6 relative z-10" role="dialog" aria-modal="true">
              <button onClick={() => setShowHelpModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"><X size={18} /></button>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-500/15 text-indigo-500 dark:text-indigo-400 rounded-lg"><HelpCircle size={22} /></div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t.helpTitle}</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{t.helpDesc}</p>
              <div className="space-y-4">
                {[
                  { key: 'D', title: lang === 'en' ? 'Toggle Theme' : 'Basculer le Thème', desc: t.themeShortcut },
                  { key: 'S', title: lang === 'en' ? 'Search Incidents' : 'Rechercher des Incidents', desc: t.searchShortcut },
                  { key: 'H / ?', title: lang === 'en' ? 'Show Help' : 'Afficher l\'Aide', desc: t.helpShortcut },
                  { key: 'Esc', title: lang === 'en' ? 'Dismiss Panel' : 'Fermer le Panneau', desc: lang === 'en' ? 'Close this dialog.' : 'Fermer cette fenêtre.' },
                ].map(({ key, title, desc }) => (
                  <div key={key} className="flex items-start gap-4 p-3 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                    <span className="flex items-center justify-center min-w-8 h-8 bg-slate-100 dark:bg-white/10 px-2 rounded-lg border border-slate-200 dark:border-white/15 font-mono font-black text-sm text-indigo-650 dark:text-indigo-400 shadow-sm">{key}</span>
                    <div className="flex-1"><h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</h4><p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{desc}</p></div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-end">
                <button onClick={() => setShowHelpModal(false)} className="px-4 py-2 text-xs font-bold bg-indigo-650 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer">{t.close}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}