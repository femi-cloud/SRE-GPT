import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Server, Info, ShieldAlert, Cpu, Network, Moon, Sun, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MetricPoint, IncidentReport, ThresholdConfig } from './types';
import { SettingsPanel } from './components/SettingsPanel';
import { RecentIncidents } from './components/RecentIncidents';
import { KpiCard } from './components/KpiCard';
import { ChartCard } from './components/ChartCard';

export default function App() {
  const [data, setData] = useState<MetricPoint[]>([]);
  const [status, setStatus] = useState<'OK' | 'INCIDENT' | 'COOLDOWN'>('OK');
  const [incident, setIncident] = useState<IncidentReport | null>(null);

  // Settings & Thresholds
  const [thresholds, setThresholds] = useState<ThresholdConfig>({ latency: 1000, errorRate: 0.1 });
  const thresholdsRef = useRef(thresholds);
  useEffect(() => { thresholdsRef.current = thresholds; }, [thresholds]);

  // Dark Mode State
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const local = localStorage.getItem('sre_theme');
      return local === 'dark' || (!local && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Recent Incidents Store
  const [pastIncidents, setPastIncidents] = useState<IncidentReport[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sre_recent_incidents');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('sre_recent_incidents', JSON.stringify(pastIncidents));
  }, [pastIncidents]);

  const addIncident = (inc: IncidentReport) => {
    setPastIncidents(prev => [inc, ...prev].filter((v,i,a) => a.findIndex(t => t.id === v.id) === i).slice(0, 5));
  };

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('sre_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('sre_theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const initialData: MetricPoint[] = Array.from({ length: 20 }).map((_, i) => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - (20 - i));
      return {
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        latency_ms: 100 + Math.random() * 50,
        error_rate: Math.random() * 0.02,
        availability: 1.0,
      };
    });
    
    setData(initialData);

    let isIncidentActive = false;
    let incidentCounter = 0;

    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev.slice(1)];
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        if (incidentCounter === 10) {
           isIncidentActive = true;
           setStatus('INCIDENT');
        }

        if (incidentCounter === 15) {
           isIncidentActive = false;
           setStatus('COOLDOWN');
           const newInc: IncidentReport = {
             id: Date.now().toString(),
             timestamp: new Date().toISOString(),
             action: "Rollback (v2 API GCP)",
             analysis: `Anomaly detected:\n\n- Latency exceeded ${thresholdsRef.current.latency}ms threshold.\n- Error rate peaked.\n\nRoot Cause: Recent deployment degraded performance to downstream database.\nAction: Automatically routed 100% of traffic to the previous stable revision.`
           };
           setIncident(newInc);
           addIncident(newInc);
        }

        if (incidentCounter === 25) {
            setStatus('OK');
            setIncident(null);
            incidentCounter = 0;
        }

        incidentCounter++;

        return [...newData, {
          time: timeStr,
          latency_ms: isIncidentActive ? 1200 + Math.random() * 300 : 100 + Math.random() * 50,
          error_rate: isIncidentActive ? 0.10 + Math.random() * 0.05 : Math.random() * 0.02,
          availability: isIncidentActive ? 0.92 : 1.0,
        }];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const currentMetrics = data[data.length - 1] || { latency_ms: 0, error_rate: 0, availability: 1 };
  
  // Custom Recharts colors based on theme
  const axisColor = isDark ? '#9ca3af' : '#6b7280';
  const gridColor = isDark ? '#374151' : '#f3f4f6';
  const tooltipStyle = {
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    color: isDark ? '#f3f4f6' : '#111827',
    border: isDark ? '1px solid #374151' : 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
  };

  const downloadCurrentReport = () => {
    if (!incident) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incident, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `incident_report_${new Date(incident.timestamp).getTime()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans p-4 md:p-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-xl text-white shadow-md">
              <Activity size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">SRE-GPT Monitor</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Autonomous Cloud Run Reliability Agent</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider mb-1">System Status</div>
              <AnimatePresence mode="wait">
                {status === 'OK' && (
                  <motion.div key="ok" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center justify-end gap-2 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                    <CheckCircle size={18} />
                    <span>OPERATIONAL</span>
                  </motion.div>
                )}
                {status === 'INCIDENT' && (
                  <motion.div key="incident" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center justify-end gap-2 text-red-700 dark:text-red-400 font-bold bg-red-50 dark:bg-red-500/10 px-4 py-2 rounded-lg border border-red-200 dark:border-red-500/20 shadow-sm">
                    <AlertTriangle size={18} className="animate-pulse" />
                    <span>INCIDENT DETECTED</span>
                  </motion.div>
                )}
                {status === 'COOLDOWN' && (
                  <motion.div key="cooldown" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex items-center justify-end gap-2 text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-500/10 px-4 py-2 rounded-lg border border-amber-200 dark:border-amber-500/20">
                    <ShieldAlert size={18} />
                    <span>MITIGATED (COOLDOWN)</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <button 
              onClick={() => setIsDark(!isDark)} 
              className="p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KpiCard 
                title="Latency (avg)" 
                value={`${Math.round(currentMetrics.latency_ms)} ms`}
                icon={<Network size={20} />}
                status={currentMetrics.latency_ms > thresholds.latency ? 'danger' : 'normal'}
              />
              <KpiCard 
                title="Error Rate" 
                value={`${(currentMetrics.error_rate * 100).toFixed(1)}%`}
                icon={<Server size={20} />}
                status={currentMetrics.error_rate > thresholds.errorRate ? 'danger' : 'normal'}
              />
              <KpiCard 
                title="Availability" 
                value={`${(currentMetrics.availability * 100).toFixed(1)}%`}
                icon={<Cpu size={20} />}
                status={currentMetrics.availability < 0.95 ? 'danger' : 'normal'}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard title="API Latency (ms)">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={currentMetrics.latency_ms > thresholds.latency ? '#ef4444' : '#3b82f6'} stopOpacity={0.4}/>
                        <stop offset="95%" stopColor={currentMetrics.latency_ms > thresholds.latency ? '#ef4444' : '#3b82f6'} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area 
                      type="monotone" 
                      dataKey="latency_ms" 
                      stroke={currentMetrics.latency_ms > thresholds.latency ? '#ef4444' : '#3b82f6'} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorLat)" 
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Error Rate (%)">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} minTickGap={30} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: axisColor }} tickFormatter={(tick) => `${(tick * 100).toFixed(0)}%`} />
                    <Tooltip 
                      formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Error Rate']}
                      contentStyle={tooltipStyle}
                    />
                    <Line 
                      type="stepAfter" 
                      dataKey="error_rate" 
                      stroke={currentMetrics.error_rate > thresholds.errorRate ? '#ef4444' : '#8b5cf6'} 
                      strokeWidth={3} 
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* AI Report Section */}
            <AnimatePresence>
              {incident && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, height: 'auto', scale: 1 }} 
                  exit={{ opacity: 0, height: 0, scale: 0.98 }}
                  className="bg-white dark:bg-gray-800 border-[1.5px] border-indigo-200 dark:border-indigo-500/30 rounded-2xl shadow-sm overflow-hidden transform-gpu"
                >
                  <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-5 px-6 border-b border-indigo-100 dark:border-indigo-500/20 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="bg-white dark:bg-gray-800 p-2.5 shadow-sm rounded-full text-indigo-600 dark:text-indigo-400 mt-1 shrink-0">
                        <Info size={22} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-indigo-950 dark:text-indigo-100 mb-1.5">Incident Post-Mortem Generated by Gemini</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                          <span className="bg-indigo-100 dark:bg-indigo-500/30 px-2.5 py-1 rounded-md text-indigo-700 dark:text-indigo-300">Action: {incident.action}</span>
                          <span className="hidden sm:inline opacity-60">•</span>
                          <span className="opacity-80">{new Date(incident.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={downloadCurrentReport}
                      className="flex items-center gap-2 whitespace-nowrap self-start sm:self-auto px-4 py-2 text-sm font-bold bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                    >
                      <Download size={16} /> JSON Export
                    </button>
                  </div>
                  <div className="p-6 px-8 bg-white dark:bg-gray-800">
                    <div className="prose prose-indigo dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 font-medium whitespace-pre-line text-[15px] leading-relaxed">
                      {incident.analysis}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-6">
            <SettingsPanel thresholds={thresholds} onThresholdChange={setThresholds} />
            <RecentIncidents incidents={pastIncidents} />
          </div>
        </div>

      </div>
    </div>
  );
}
