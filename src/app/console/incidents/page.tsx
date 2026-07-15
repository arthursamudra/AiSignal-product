"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { TriangleAlert, Activity, Network, Info, Settings2 } from "lucide-react";

type ServiceMetric = {
  serviceName: string;
  errorRate: number;
  totalRequests: number;
  incidentName: string;
  allIncidents: string[];
  cpu: number;
  memory: number;
  severity: number;
};

export default function IncidentsPage() {
  const [metrics, setMetrics] = useState<ServiceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [threshold, setThreshold] = useState<number>(5);
  const [showConfig, setShowConfig] = useState(false);
  const [isUpdatingThreshold, setIsUpdatingThreshold] = useState(false);

  // Fetch the current configuration rule from the backend on mount
  useEffect(() => {
    const fetchCurrentRule = async () => {
      try {
        const res = await fetch('/api/settings/threshold');
        if (res.ok) {
          const data = await res.json();
          if (data && data.threshold) {
            setThreshold(data.threshold);
          }
        }
      } catch (err) {
        console.error("Failed to fetch current alerting rule", err);
      }
    };
    fetchCurrentRule();
  }, []);

  const saveThreshold = async (newThreshold: number) => {
    setIsUpdatingThreshold(true);
    try {
      await fetch('/api/settings/threshold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: newThreshold })
      });
    } catch (err) {
      console.error("Failed to update alerting rule", err);
    } finally {
      setIsUpdatingThreshold(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Active Incidents from the webhook-driven backend state
        const incidentsRes = await fetch('/api/incidents/active', { cache: 'no-store' });
        if (!incidentsRes.ok) throw new Error("Active incidents fetch failed");
        const incidentsData = await incidentsRes.json();
        const activeIncidents: any[] = incidentsData.incidents || [];

        if (activeIncidents.length === 0) {
          setMetrics([]);
          setLoading(false);
          return;
        }

        // 2. Fetch Live Telemetry from Prometheus for live updating UI
        const res500 = await fetch('/api/observability/prometheus?query=sum by (service_name) (rate(http_request_duration_seconds_count{status="500"}[5m]))', { cache: 'no-store' });
        const resTotal = await fetch('/api/observability/prometheus?query=sum by (service_name) (rate(http_request_duration_seconds_count[5m]))', { cache: 'no-store' });
        const resCpu = await fetch('/api/observability/prometheus?query=system_cpu_usage_percentage', { cache: 'no-store' });
        const resMem = await fetch('/api/observability/prometheus?query=system_memory_usage_bytes', { cache: 'no-store' });
        
        const data500 = res500.ok ? await res500.json() : {};
        const dataTotal = resTotal.ok ? await resTotal.json() : {};
        const dataCpu = resCpu.ok ? await resCpu.json() : {};
        const dataMem = resMem.ok ? await resMem.json() : {};

        const errors = data500.data?.result || [];
        const totals = dataTotal.data?.result || [];
        const cpus = dataCpu.data?.result || [];
        const mems = dataMem.data?.result || [];

        // Group active incidents by service
        const groupedIncidents: Record<string, string[]> = activeIncidents.reduce((acc: any, inc: any) => {
          if (!acc[inc.service]) acc[inc.service] = [];
          if (!acc[inc.service].includes(inc.alertname)) acc[inc.service].push(inc.alertname);
          return acc;
        }, {});

        // 3. Map the active incidents to their live metrics
        const merged: ServiceMetric[] = Object.keys(groupedIncidents).map((serviceName) => {
          const incidentNames = groupedIncidents[serviceName];
          
          const errorMatch = errors.find((e: any) => e.metric.service_name === serviceName);
          const t = totals.find((x: any) => x.metric.service_name === serviceName);
          const cpuMatch = cpus.find((c: any) => c.metric.service_name === serviceName);
          const memMatch = mems.find((m: any) => m.metric.service_name === serviceName);

          const errorCount = errorMatch ? parseFloat(errorMatch.value[1]) : 0;
          const totalCount = t ? parseFloat(t.value[1]) : 0;
          const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

          const cpu = cpuMatch ? parseFloat(cpuMatch.value[1]) : 0;
          const memoryBytes = memMatch ? parseFloat(memMatch.value[1]) : 0;
          // Normalize memory bytes to a percentage assuming ~256MB max allocated memory per container
          const memory = memoryBytes > 0 ? (memoryBytes / (256 * 1024 * 1024)) * 100 : 0;

          // Determine dominant incident based on severity
          let dominantIncident = incidentNames[0];
          let maxSeverity = 0;

          if (incidentNames.includes("HighCPUUsage")) {
             const sev = cpu > 85 ? 2 : cpu > 60 ? 1 : 0;
             if (sev >= maxSeverity) { maxSeverity = sev; dominantIncident = "HighCPUUsage"; }
          }
          if (incidentNames.includes("HighMemoryUsage")) {
             const sev = memory > 85 ? 2 : memory > 60 ? 1 : 0;
             if (sev >= maxSeverity) { maxSeverity = sev; dominantIncident = "HighMemoryUsage"; }
          }
          if (incidentNames.includes("HighErrorRate")) {
             const sev = errorRate > 15 ? 2 : errorRate > 5 ? 1 : 0;
             if (sev >= maxSeverity) { maxSeverity = sev; dominantIncident = "HighErrorRate"; }
          }
          
          const incidentName = maxSeverity > 0 ? dominantIncident : incidentNames[0];

          return { serviceName, errorRate, totalRequests: totalCount, incidentName, allIncidents: incidentNames, cpu, memory, severity: maxSeverity };
        }).sort((a: ServiceMetric, b: ServiceMetric) => b.errorRate - a.errorRate);

        setMetrics(merged);
      } catch (e) {
        console.error("Failed to fetch webhook incidents or metrics", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-[.15em] text-blue-600">
            <Network className="w-3.5 h-3.5" /> Event-Driven Push
          </div>
          <h3 className="mt-2 text-xl font-black tracking-[-.035em] sm:text-3xl text-slate-950">Active Incidents</h3>
          <p className="mt-3 max-w-2xl text-slate-600 font-medium">
            This list is populated dynamically via Alertmanager webhooks, proving a true zero-polling push architecture. Telemetry is fetched for active incidents only.
          </p>
          <div className="mt-4 flex items-start gap-2 max-w-2xl bg-blue-50/50 p-3 rounded-xl border border-blue-100">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              <strong>Calculation Logic:</strong> Error Rate and Throughput metrics are live rolling averages calculated over the <strong>last 5 minutes</strong> by querying OpenTelemetry data in Prometheus. The alerting rule itself evaluates the error rate over the <strong>last 1 minute</strong> and fires if it continuously exceeds the threshold for 30 seconds.
            </p>
          </div>
        </div>
        
        <div>
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings2 className="w-4 h-4" /> Configure Alert Rule
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="mb-8 p-6 rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-black text-slate-900">Prometheus Alerting Threshold</h4>
            <div className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {threshold}% Error Rate
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-6 font-medium">
            Adjusting this slider rewrites the <code>rules.yml</code> configuration file on the backend and sends an instant hot-reload signal to Prometheus via the Lifecycle API.
          </p>
          
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="1" 
              max="20" 
              step="1"
              value={threshold} 
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              onMouseUp={(e) => saveThreshold(parseFloat((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => saveThreshold(parseFloat((e.target as HTMLInputElement).value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            {isUpdatingThreshold && <Activity className="w-5 h-5 text-blue-500 animate-spin shrink-0" />}
          </div>
        </div>
      )}

      <div className="grid gap-6">
        {loading ? (
          <div className="animate-pulse flex items-center gap-3"><Activity className="w-5 h-5 text-blue-500" /> Fetching live webhook state...</div>
        ) : metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">Zero Active Incidents</h3>
            <p className="text-slate-500 font-medium max-w-sm">
              The Alertmanager webhook receiver has not reported any firing incidents. Wait for a service to fail to see it here.
            </p>
          </div>
        ) : (
          metrics.map((m) => (
            <div key={`${m.serviceName}-${m.incidentName}`} className={`block w-full text-left transition bg-white shadow-[0_10px_40px_rgba(15,23,42,.06)] rounded-[2rem] p-6 sm:p-8 border border-slate-200 ${m.severity === 2 ? 'hover:border-red-300 hover:shadow-[0_20px_50px_rgba(220,38,38,.08)]' : m.severity === 1 ? 'hover:border-amber-300 hover:shadow-[0_20px_50px_rgba(245,158,11,.08)]' : 'hover:border-blue-300 hover:shadow-[0_20px_50px_rgba(37,99,235,.08)]'}`}>
               <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                 <div>
                   <div className="flex gap-2 mb-1 flex-wrap">
                     {m.allIncidents.map(inc => (
                        <span key={inc} className={`text-xs font-black uppercase tracking-[.15em] ${inc === m.incidentName ? (m.severity === 2 ? 'text-red-600' : m.severity === 1 ? 'text-amber-600' : 'text-blue-600') : 'text-slate-400'}`}>{inc}</span>
                     ))}
                   </div>
                   <div className="text-2xl font-black tracking-tight text-slate-950 flex items-center gap-3">
                     {m.serviceName} 
                     <span className="relative flex h-3 w-3">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${m.severity === 2 ? 'bg-red-400' : m.severity === 1 ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-3 w-3 ${m.severity === 2 ? 'bg-red-500' : m.severity === 1 ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                     </span>
                   </div>
                 </div>
                 <div className={`rounded-full px-4 py-1.5 text-xs font-black uppercase flex items-center gap-2 shrink-0 ${m.severity === 2 ? 'bg-red-100 text-red-600' : m.severity === 1 ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                   <TriangleAlert className="w-4 h-4" /> FIRING
                 </div>
               </div>
               
               <div className="mt-6 flex items-center gap-6 text-sm font-semibold text-slate-600 flex-wrap">
                 <div>
                   <span className="text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">Live Error Rate</span>
                   <span className={`text-lg font-black ${m.errorRate > 15 ? 'text-red-600' : m.errorRate > 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                     {m.errorRate.toFixed(2)}%
                   </span>
                 </div>
                 <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                 <div>
                   <span className="text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">Throughput</span>
                   <span className="text-lg font-black text-slate-900">{m.totalRequests.toFixed(2)}</span> req/s
                 </div>
                 <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                 <div>
                   <span className="text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">CPU Util</span>
                   <span className={`text-lg font-black ${m.cpu > 85 ? 'text-red-600' : m.cpu > 60 ? 'text-amber-600' : 'text-slate-900'}`}>{m.cpu.toFixed(1)}%</span>
                 </div>
                 <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
                 <div>
                   <span className="text-slate-400 uppercase tracking-wider text-[10px] block mb-0.5">Mem Util</span>
                   <span className={`text-lg font-black ${m.memory > 85 ? 'text-red-600' : m.memory > 60 ? 'text-amber-600' : 'text-slate-900'}`}>{m.memory.toFixed(1)}%</span>
                 </div>
               </div>

               <div className="mt-5 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      m.incidentName === 'HighCPUUsage'
                        ? (m.cpu > 85 ? 'bg-red-500' : m.cpu > 60 ? 'bg-amber-500' : 'bg-emerald-500')
                        : m.incidentName === 'HighMemoryUsage'
                        ? (m.memory > 85 ? 'bg-red-500' : m.memory > 60 ? 'bg-amber-500' : 'bg-emerald-500')
                        : (m.errorRate > 15 ? 'bg-red-500' : m.errorRate > 5 ? 'bg-amber-500' : 'bg-emerald-500')
                    }`} 
                    style={{
                      width: `${Math.max(Math.min(
                        m.incidentName === 'HighCPUUsage' ? m.cpu : 
                        m.incidentName === 'HighMemoryUsage' ? m.memory : 
                        m.errorRate, 100
                      ), 2)}%`
                    }}
                  ></div>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
