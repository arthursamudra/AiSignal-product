import React, { useState } from 'react';
import { Flame, ArrowRight, GitBranch, CircleCheck, FileText, Download, ExternalLink, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type PostmortemData = {
  service: string;
  severity: string;
  confidence: string;
  executiveSummary: string;
  rootCause: {
    title: string;
    description: string;
  };
  evidenceChain: string[];
  timeline: { time: string; event: string }[];
  impact: string;
  similarIncident?: {
    id: string;
    title: string;
    resolution: string;
  };
  recommendedActions: string[];
};

export default function PostmortemReport({ data, timeWindow = "Last 5 hours", queries, rawMetrics }: { data: PostmortemData, timeWindow?: string, queries?: { source: string; description: string; code: string; }[], rawMetrics?: any }) {
  const [showConfluenceModal, setShowConfluenceModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [confluenceConfig, setConfluenceConfig] = useState({ domain: 'https://', email: '', apiToken: '', spaceKey: 'ENG' });

  const severityColor = data.severity.toLowerCase() === 'critical' ? 'text-red-600' : 'text-amber-600';
  const severityBg = data.severity.toLowerCase() === 'critical' ? 'bg-red-500' : 'bg-amber-500';

  const handleEmail = () => {
    const subject = encodeURIComponent(`Incident Report: ${data.service}`);
    const body = encodeURIComponent(`Severity: ${data.severity}\nConfidence: ${data.confidence}\n\nSummary:\n${data.executiveSummary}\n\nRoot Cause:\n${data.rootCause?.title}\n${data.rootCause?.description}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleConfluenceExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);
    try {
      const res = await fetch('/api/export/confluence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...confluenceConfig, data })
      });
      const result = await res.json();
      if (res.ok && result.url) {
        alert("Successfully exported! Opening Confluence...");
        window.open(result.url, '_blank');
        setShowConfluenceModal(false);
      } else {
        alert("Export failed: " + result.error);
      }
    } catch (err: any) {
      alert("Export error: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl mt-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 grid gap-6 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
        <div>
          <div className="mb-3 text-sm font-black uppercase tracking-[.22em] text-blue-600">See the outcome</div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl md:text-[2.75rem] lg:text-5xl">From alert to postmortem-ready report.</h2>
        </div>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">AiSignal does not just tell teams that a service is unhealthy. It produces a shareable operational artifact: executive summary, root cause hypothesis, evidence chain, impact, timeline and recommended actions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[.74fr_1.26fr] lg:items-start">
        <div className="border-t border-slate-200 pt-7">
          <div className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.15em] text-slate-500">
            <Flame className="text-red-600 w-4 h-4" /> Problem detected
          </div>
          <div className="space-y-6">
            <div>
              <div className="text-3xl font-black tracking-[-.04em] text-slate-950">{data.service}</div>
              <div className="mt-1 text-xs font-black uppercase tracking-[.16em] text-slate-400">Microservice</div>
            </div>
            <div>
              <div className="text-lg font-black text-slate-950">{data.rootCause.title}</div>
              <p className="mt-2 text-slate-600">{data.impact}</p>
            </div>
            <div className={`text-xs font-black uppercase tracking-[.2em] ${severityColor}`}>{data.severity}</div>
            <div className="h-1.5 bg-slate-100">
              <div className={`h-full w-[94%] ${severityBg}`}></div>
            </div>
          </div>
          <div className="my-10 flex items-center gap-4 text-blue-600">
            <div className="h-px flex-1 bg-blue-200"></div>
            <ArrowRight className="w-6 h-6" />
            <div className="h-px flex-1 bg-blue-200"></div>
          </div>
          <div className="border-t border-slate-200 pt-7">
            <div className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.15em] text-slate-500">
              <GitBranch className="text-blue-600 w-4 h-4" /> Generated from
            </div>
            <div className="space-y-4 text-sm font-semibold text-slate-700">
              {['Prometheus metrics', 'Loki exception logs', 'Tempo trace context', 'Deployment metadata', 'Incident memory'].map(item => (
                <div key={item} className="flex items-center gap-3 border-b border-slate-200 pb-3">
                  <CircleCheck className="text-blue-600 w-4 h-4" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,.08)]">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_40px_rgba(15,98,254,.28)]">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-black text-slate-950">AiSignal Incident Report</div>
                <div className="text-sm text-slate-500">Generated postmortem draft · {data.service}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-800 hover:border-blue-300 hover:text-blue-700 transition">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
              <button onClick={() => setShowConfluenceModal(true)} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-800 hover:border-blue-300 hover:text-blue-700 transition">
                <ExternalLink className="w-3.5 h-3.5" /> Confluence
              </button>
              <button onClick={handleEmail} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-800 hover:border-blue-300 hover:text-blue-700 transition">
                <Mail className="w-3.5 h-3.5" /> Email
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="border-t border-slate-200 pt-4">
                <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Service</div>
                <div className="mt-2 text-lg font-black text-slate-950">{data.service}</div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Severity</div>
                <div className={`mt-2 text-lg font-black ${severityColor}`}>{data.severity}</div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Window</div>
                <div className="mt-2 text-lg font-black text-slate-950">{timeWindow}</div>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Confidence</div>
                <div className="mt-2 text-lg font-black text-slate-950">{data.confidence}</div>
              </div>
            </div>

            <div className="mt-9 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
              <div>
                <div className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Executive summary</div>
                <p className="mt-3 text-lg font-semibold leading-8 text-slate-800">
                  {data.executiveSummary}
                </p>
              </div>
              <div className="border-t border-slate-200 pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <div className="text-xs font-black uppercase tracking-[.18em] text-blue-600">Root cause hypothesis</div>
                <h3 className="mt-3 text-3xl font-black tracking-[-.04em] text-slate-950">{data.rootCause.title}</h3>
                <p className="mt-3 text-slate-600">{data.rootCause.description}</p>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="border-t border-slate-200 pt-7">
                <div className="mb-5 text-xs font-black uppercase tracking-[.18em] text-blue-600">Evidence chain</div>
                <div className="space-y-3 text-base font-semibold text-slate-800">
                  {(data.evidenceChain || []).map((step, idx) => (
                    <React.Fragment key={idx}>
                      <div>{step}</div>
                      {idx < data.evidenceChain.length - 1 && <div className="text-blue-600">↓</div>}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-200 pt-7">
                <div className="mb-5 text-xs font-black uppercase tracking-[.18em] text-blue-600">Incident timeline</div>
                <div className="space-y-4">
                  {(data.timeline || []).map((event, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-1 sm:gap-6 border-b border-slate-100 pb-3">
                      <div className="font-black text-slate-950 sm:w-24 shrink-0">{event.time}</div>
                      <div className="text-sm font-semibold text-slate-700">{event.event}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
              <div className="border-t border-slate-200 pt-7">
                <div className="mb-3 text-xs font-black uppercase tracking-[.18em] text-blue-600">User impact</div>
                <p className="font-semibold leading-7 text-slate-700">{data.impact}</p>
                
                {data.similarIncident && (
                  <div className="mt-8 border-t border-slate-200 pt-7">
                    <div className="mb-3 text-xs font-black uppercase tracking-[.18em] text-blue-600">Incident Memory Match</div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-[.15em] text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md">{data.similarIncident.id}</span>
                        <span className="text-xs font-bold text-slate-500">Historical Context</span>
                      </div>
                      <div className="text-sm font-black text-slate-900 mb-2">{data.similarIncident.title}</div>
                      <div className="text-sm text-slate-700">
                        <strong>Resolution:</strong> {data.similarIncident.resolution}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 pt-7">
                <div className="mb-3 text-xs font-black uppercase tracking-[.18em] text-blue-600">Recommended actions</div>
                <div className="space-y-3">
                  {(data.recommendedActions || []).map((action, idx) => (
                    <div key={idx} className="flex gap-3 text-sm font-semibold text-slate-700">
                      <ShieldCheck className="mt-0.5 shrink-0 text-blue-600 w-4 h-4" />
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      
      {rawMetrics && rawMetrics.length > 0 && (
        (() => {
          const matrixMetric = rawMetrics.find((m: any) => m.data?.resultType === 'matrix' && m.data?.result?.[0]?.values);
          if (!matrixMetric) return null;
          
          const chartData = matrixMetric.data.result[0].values.map((v: [number, string]) => {
            const date = new Date(v[0] * 1000);
            return {
              time: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`,
              value: parseFloat(v[1])
            };
          }).reverse();

          return (
            <div className="mt-6 border border-slate-200 rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div className="text-sm font-black uppercase tracking-[.15em] text-slate-700">Telemetry Trend Analysis</div>
                <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{matrixMetric.query.includes('cpu') ? 'CPU %' : 'Utilization'}</div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dx={-10} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#2563eb' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()
      )}
      
      {queries && queries.length > 0 && (
        <details className="mt-6 group border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <summary className="flex cursor-pointer items-center justify-between bg-slate-50 px-6 py-4 text-sm font-black uppercase tracking-[.15em] text-slate-700 hover:bg-slate-100 transition-colors">
            Verification Queries
            <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="p-6 space-y-6 border-t border-slate-200">
            {queries.map((q, i) => (
              <div key={i}>
                <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[.15em] text-slate-500">
                  <span>{q.source} · {q.description}</span>
                </div>
                <div className="relative group/code">
                  <pre className="whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 pr-12 text-xs font-medium text-emerald-400">
                    <code>{q.code}</code>
                  </pre>
                  <button 
                    onClick={() => navigator.clipboard.writeText(q.code)}
                    className="absolute right-3 top-3 rounded-md bg-slate-800 p-2 text-slate-300 opacity-0 transition-opacity hover:bg-slate-700 hover:text-white group-hover/code:opacity-100"
                    title="Copy to clipboard"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Confluence Modal */}
      {showConfluenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,.15)] animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-slate-950 mb-2">Export to Confluence</h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">This will automatically create a new Page in your Atlassian Confluence space using the real REST API.</p>
            
            <form onSubmit={handleConfluenceExport} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[.15em] text-slate-500">Atlassian Domain</label>
                <input 
                  type="text" 
                  value={confluenceConfig.domain}
                  onChange={(e) => setConfluenceConfig({...confluenceConfig, domain: e.target.value})}
                  placeholder="https://your-domain.atlassian.net"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[.15em] text-slate-500">Atlassian Email</label>
                <input 
                  type="email" 
                  value={confluenceConfig.email}
                  onChange={(e) => setConfluenceConfig({...confluenceConfig, email: e.target.value})}
                  placeholder="name@company.com"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[.15em] text-slate-500">API Token</label>
                <input 
                  type="password" 
                  value={confluenceConfig.apiToken}
                  onChange={(e) => setConfluenceConfig({...confluenceConfig, apiToken: e.target.value})}
                  placeholder="Atlassian API Token"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-[.15em] text-slate-500">Confluence Space Key</label>
                <input 
                  type="text" 
                  value={confluenceConfig.spaceKey}
                  onChange={(e) => setConfluenceConfig({...confluenceConfig, spaceKey: e.target.value.toUpperCase()})}
                  placeholder="e.g. ENG or PRODUCT"
                  required
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 uppercase"
                />
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowConfluenceModal(false)}
                  className="rounded-full px-5 py-2.5 text-sm font-black text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isExporting}
                  className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(37,99,235,.25)] hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isExporting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Export Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
