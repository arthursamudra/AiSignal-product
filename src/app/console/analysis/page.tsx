"use client";

import { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import { TriangleAlert, FileSearch, Layers, Loader2, Zap } from 'lucide-react';
import PostmortemReport, { PostmortemData } from '@/components/PostmortemReport';
import { useSearchParams } from 'next/navigation';
import { REPORT_TEMPLATES } from '@/lib/templates';

type ServiceMetric = {
  serviceName: string;
  errorRate: number;
  totalRequests: number;
  cpu: number;
  memory: number;
  incidentName: string;
  allIncidents: string[];
  severity: number;
};

function AnalysisContent() {
  const [metrics, setMetrics] = useState<ServiceMetric[]>([]);
  const [selectedService, setSelectedService] = useState<string>("qa-login");
  const [timeRange, setTimeRange] = useState<string>("Last 30 min");

  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');
  const selectedTemplate = templateId ? REPORT_TEMPLATES.find(t => t.id === templateId) : null;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [postmortemData, setPostmortemData] = useState<PostmortemData | null>(null);
  const [planData, setPlanData] = useState<any>(null);

  const [previewData, setPreviewData] = useState<any>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [rawMetrics, setRawMetrics] = useState<any>(null);

  const selectedIncidentNames = metrics.find(m => m.serviceName === selectedService)?.allIncidents || [];
  const selectedIncidentNamesStr = selectedIncidentNames.join(",");

  useEffect(() => {
    const fetchPreview = async () => {
      setIsPreviewLoading(true);
      setPreviewData(null);
      try {
        const res = await fetch('/api/ai/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            service: selectedService, 
            timeRange, 
            incidentNames: selectedIncidentNames,
            templateTitle: selectedTemplate?.title,
            templateMetrics: selectedTemplate?.metrics
          })
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewData(data);
        }
      } catch (err) {
        console.error("Failed to fetch preview", err);
      } finally {
        setIsPreviewLoading(false);
      }
    };
    if (selectedService) {
      fetchPreview();
    }
  }, [selectedService, timeRange, selectedIncidentNamesStr]);

  const fetchMetrics = async () => {
    try {
      // 1. Fetch Active Incidents from the webhook state
      const incidentsRes = await fetch('/api/incidents/active', { cache: 'no-store' });
      if (!incidentsRes.ok) throw new Error(`Active incidents fetch failed: ${incidentsRes.status}`);
      const incidentsData = await incidentsRes.json();
      const activeIncidents: any[] = incidentsData.incidents || [];

      if (activeIncidents.length === 0) {
        setMetrics([]);
        setSelectedService("");
        return;
      }

      let interval = "30m";
      if (timeRange === "Last 1 hour") interval = "1h";
      if (timeRange === "Last 5 hours") interval = "5h";

      const res500 = await fetch(`/api/observability/prometheus?query=sum by (service_name) (rate(http_request_duration_seconds_count{status="500"}[${interval}]))`, { cache: 'no-store' });
      if (!res500.ok) throw new Error(`Prometheus 500 fetch failed: ${res500.status}`);
      const data500 = await res500.json();

      const resTotal = await fetch(`/api/observability/prometheus?query=sum by (service_name) (rate(http_request_duration_seconds_count[${interval}]))`, { cache: 'no-store' });
      if (!resTotal.ok) throw new Error(`Prometheus total fetch failed: ${resTotal.status}`);
      const dataTotal = await resTotal.json();
      
      const resCpu = await fetch(`/api/observability/prometheus?query=system_cpu_usage_percentage`, { cache: 'no-store' });
      const dataCpu = resCpu.ok ? await resCpu.json() : {};

      const resMem = await fetch(`/api/observability/prometheus?query=system_memory_usage_bytes`, { cache: 'no-store' });
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

      const merged: ServiceMetric[] = Object.keys(groupedIncidents).map((serviceName) => {
        const incidentNames = groupedIncidents[serviceName];
        const errorMatch = errors.find((e: any) => e.metric?.service_name === serviceName);
        const t = totals.find((x: any) => x.metric?.service_name === serviceName);
        const cpuMatch = cpus.find((c: any) => c.metric?.service_name === serviceName);
        const memMatch = mems.find((m: any) => m.metric?.service_name === serviceName);
        
        const errorCount = errorMatch ? parseFloat(errorMatch.value[1]) : 0;
        const totalCount = t ? parseFloat(t.value[1]) : 0;
        const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

        const cpu = cpuMatch ? parseFloat(cpuMatch.value[1]) : 0;
        const memoryBytes = memMatch ? parseFloat(memMatch.value[1]) : 0;
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

        return { serviceName, errorRate, totalRequests: totalCount, cpu, memory, incidentName, allIncidents: incidentNames, severity: maxSeverity };
      }).sort((a: ServiceMetric, b: ServiceMetric) => b.errorRate - a.errorRate);

      setMetrics(merged);
      
      // Select the first one if nothing is selected or if the currently selected is no longer firing
      if (merged.length > 0) {
        if (!selectedService || !merged.find(m => m.serviceName === selectedService)) {
          setSelectedService(merged[0].serviceName);
        }
      } else {
        setSelectedService("");
      }
    } catch (e) {
      console.error("Failed to fetch webhook incidents or metrics", e);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
    return () => clearInterval(interval);
  }, [timeRange]); // also re-run when timeRange changes

  const handleGenerate = async () => {
    const serviceMetric = metrics.find(m => m.serviceName === selectedService);
    const errorRateStr = serviceMetric ? serviceMetric.errorRate.toFixed(2) : "unknown";
    const incidentTagsStr = serviceMetric ? serviceMetric.allIncidents.join(", ") : "Unknown";
    const cpuStr = serviceMetric ? serviceMetric.cpu.toFixed(2) : "unknown";
    const memStr = serviceMetric ? serviceMetric.memory.toFixed(2) : "unknown";

    setIsLoading(true);
    setError(null);
    setPostmortemData(null);
    setPlanData(null);

    let plannerContent = `The service ${selectedService} is currently experiencing the following active incidents: [${incidentTagsStr}]. The current error rate is ${errorRateStr}%, CPU is ${cpuStr}%, and Memory is ${memStr}% over the ${timeRange}. Write a PromQL and LogQL query plan to investigate the root cause.`;
    
    if (selectedTemplate) {
      plannerContent = `The service ${selectedService} is being investigated strictly using the "${selectedTemplate.title}" playbook. The current error rate is ${errorRateStr}%, CPU is ${cpuStr}%, and Memory is ${memStr}% over the ${timeRange}. You MUST prioritize and include the following metrics/logs in your investigation plan: [${selectedTemplate.metrics.join(", ")}${selectedTemplate.loki ? ", Loki exceptions" : ""}]. Secondary context: The service also has these active incidents: [${incidentTagsStr}].`;
    }

    try {
      // 1. Generate Query Plan
      const planRes = await fetch('/api/ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ 
            role: 'user', 
            content: plannerContent 
          }] 
        })
      });
      if (!planRes.ok) throw new Error("Planner failed");
      
      const planReader = planRes.body?.getReader();
      const planDecoder = new TextDecoder();
      let planContent = '';
      if (planReader) {
        while (true) {
          const { done, value } = await planReader.read();
          if (done) break;
          planContent += planDecoder.decode(value, { stream: true });
        }
      }
      
      const parsedPlan = JSON.parse(planContent);
      setPlanData(parsedPlan);

      // 2. Execute Query Plan
      const execRes = await fetch('/api/observability/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: parsedPlan?.queries || [] })
      });
      if (!execRes.ok) throw new Error("Execution failed");
      const execData = await execRes.json();
      const rawResults = execData.results;
      setRawMetrics(rawResults);

      // 3. Generate Postmortem
      let promptContext = `Generate a comprehensive incident postmortem report for ${selectedService}. The time range is ${timeRange}. 
Context: The service is currently experiencing [${incidentTagsStr}]. The current error rate is ${errorRateStr}%, CPU is ${cpuStr}%, and Memory is ${memStr}%.`;

      if (selectedTemplate) {
        promptContext = `Generate a comprehensive incident postmortem report for ${selectedService} using the "${selectedTemplate.title}" investigation playbook. The time range is ${timeRange}. 
Context: The primary investigation lens is dictated by the template. You MUST explicitly document and analyze the specific metrics defined in the ${selectedTemplate.title} playbook (such as ${selectedTemplate.metrics.join(", ")}) in your report sections, even if it is simply to rule them out as the root cause. 
However, you MUST stay strictly grounded in the raw data. If the data clearly shows the actual root cause is something else (which corresponds to the secondary active incidents), you must highlight the actual root cause as the primary contributing factor. Secondary active alerts: [${incidentTagsStr}]. The current error rate is ${errorRateStr}%, CPU is ${cpuStr}%, and Memory is ${memStr}%.`;
      }

      const promptMessage = {
        role: 'user',
        content: `${promptContext}

Here is the strict, raw JSON data returned from actually executing the investigation queries against Prometheus and Loki:
${JSON.stringify(rawResults)}

CRITICAL INSTRUCTION: You MUST NOT invent or hallucinate any probable causes, components, timelines, or fake incidents. Build the postmortem strictly and purely based on the facts present in the raw data above. Do not invent data. If the data is empty or generic, state exactly that. Only actual causes if known from the data should be mentioned.`
      };

      const res = await fetch('/api/ai/postmortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [promptMessage] })
      });
      
      if (!res.ok) throw new Error("API responded with " + res.status);
      if (!res.body) throw new Error("No response body stream");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
      }
      
      // Parse the completed JSON
      const parsedData = JSON.parse(assistantContent);
      setPostmortemData(parsedData);
      
      // Save it to the backend persistence layer
      try {
        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        });
      } catch (err) {
        console.error("Failed to save report to backend", err);
      }
      
      // Automatically broadcast to all active webhooks
      try {
        await fetch('/api/alerts/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        });
      } catch (err) {
        console.error("Failed to broadcast report", err);
      }
      
      // Scroll smoothly to the report
      setTimeout(() => {
        document.getElementById("postmortem-report")?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      console.error(err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">Risk Analysis</h1>
        <p className="mt-2 text-base font-semibold text-slate-500 max-w-2xl">
          Instantly generate comprehensive incident postmortems using AI-driven observability data synthesis.
        </p>
        {selectedTemplate && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-700 shadow-sm">
            <span className="w-4 h-4">{selectedTemplate.icon}</span>
            Investigating via: {selectedTemplate.title}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        {metrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">No Active Incidents</h3>
            <p className="text-slate-500 font-medium max-w-md text-lg">
              The Alertmanager webhook receiver has not reported any firing incidents. Risk analysis cannot be run until a service requires attention.
            </p>
          </div>
        ) : (
          <div className="grid gap-12 xl:grid-cols-2">
          
          <section className="min-w-0">
            <div className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.15em] text-slate-500">
              <Zap className="text-blue-600 w-4 h-4" /> Live Services
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {metrics.map(m => {
                const isSelected = selectedService === m.serviceName;
                return (
                  <button 
                    key={m.serviceName}
                    onClick={() => setSelectedService(m.serviceName)}
                    className={`flex flex-col rounded-2xl border p-5 text-left transition-all ${isSelected ? 'border-blue-600 bg-blue-50/30 ring-1 ring-blue-600 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-base font-black tracking-tight ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>{m.serviceName}</span>
                          {isSelected && <span className="h-2 w-2 rounded-full bg-blue-600"></span>}
                        </div>
                        <div className="text-xs font-black uppercase tracking-[.14em] text-slate-400 mt-1">Live Telemetry</div>
                      </div>
                      {
                        m.severity === 2 ? <span className="text-xs font-black tracking-[.16em] text-red-600">CRITICAL</span> :
                        m.severity === 1 ? <span className="text-xs font-black tracking-[.16em] text-amber-600">WARNING</span> :
                        <span className="text-xs font-black tracking-[.16em] text-emerald-600">HEALTHY</span>
                      }
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-600">
                      <span className={m.errorRate > 15 ? 'text-red-600' : m.errorRate > 5 ? 'text-amber-600' : ''}>Err: {m.errorRate.toFixed(1)}%</span>
                      <span className={m.cpu > 85 ? 'text-red-600' : m.cpu > 60 ? 'text-amber-600' : ''}>CPU: {m.cpu.toFixed(0)}%</span>
                      <span className={m.memory > 85 ? 'text-red-600' : m.memory > 60 ? 'text-amber-600' : ''}>Mem: {m.memory.toFixed(0)}%</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${m.severity === 2 ? 'bg-red-500' : m.severity === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{
                          width: `${Math.min(
                            m.incidentName === 'HighCPUUsage' ? m.cpu : 
                            m.incidentName === 'HighMemoryUsage' ? m.memory : 
                            m.errorRate, 100
                          )}%`
                        }}
                      ></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-w-0 border-t border-slate-200 pt-8 xl:border-l xl:border-t-0 xl:pl-10 xl:pt-0">
            <div className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.15em] text-slate-500">
              <FileSearch className="text-blue-600 w-4 h-4" /> Analysis Configuration
            </div>
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {['Last 30 min', 'Last 1 hour', 'Last 5 hours'].map(t => (
                <button 
                  key={t}
                  onClick={() => setTimeRange(t)}
                  className={`border-b pb-3 text-left text-sm ${timeRange === t ? 'border-blue-600 font-black text-blue-700' : 'border-slate-200 font-semibold text-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="text-sm text-slate-500 mb-6 mt-6">
              AiSignal will generate a query plan, execute the queries against telemetry, and compile an investigation report.
            </div>

            {isPreviewLoading && (
               <div className="mt-8 text-blue-600 text-sm font-bold flex items-center gap-2 border border-dashed border-blue-200 bg-blue-50/50 p-4 rounded-2xl">
                 <Loader2 className="w-4 h-4 animate-spin" /> Fetching real-time preview diagnosis...
               </div>
            )}

            {previewData && !isPreviewLoading && (
              <div className="mt-8 border-t border-slate-200 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-4 text-xs font-black uppercase tracking-[.18em] text-slate-400">Instant Diagnosis Preview</div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-2 font-black text-slate-950">{previewData.title}</div>
                  <div className="mb-4 text-xs font-bold text-blue-600">{previewData.confidence} confidence</div>
                  <div className="space-y-3">
                    {previewData.steps && previewData.steps.map((step: string, idx: number) => (
                      <div key={idx}>
                        <div className="text-sm font-semibold text-slate-700">{step}</div>
                        {idx < previewData.steps.length - 1 && (
                          <div className="ml-2 mt-2 text-slate-300">↓</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
               <div className="mt-8 text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">
                 Error: {error.message || "Could not connect to AI."}
               </div>
            )}

            {isLoading && (
               <div className="text-blue-600 text-sm font-bold flex items-center gap-2 mt-8">
                 <Loader2 className="w-4 h-4 animate-spin" /> Generating full incident report...
               </div>
            )}

            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-[0_16px_35px_rgba(15,23,42,.18)] transition hover:bg-blue-600 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Generate Postmortem
              </button>
            </div>
          </section>
        </div>
        )}
      </div>

      {/* SEPARATE POSTMORTEM REPORT SECTION */}
      {postmortemData && (
        <div id="postmortem-report" className="mt-16 pt-16 border-t border-slate-200">
          <PostmortemReport data={postmortemData} timeWindow={timeRange} queries={planData?.queries} rawMetrics={rawMetrics} />
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <AnalysisContent />
    </Suspense>
  );
}
