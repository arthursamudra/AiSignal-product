import { ArrowRight, Radio, Brain, FileText, TriangleAlert, FileSearch, Layers } from "lucide-react";

export default function Home() {
  return (
    <main className="min-w-0 overflow-x-hidden pt-14 sm:pt-16">
      {/* Hero Section */}
      <section className="relative px-4 pb-16 pt-22 sm:px-5 md:pb-16 md:pt-28">
        <div className="absolute inset-x-0 top-20 -z-10 mx-auto h-96 max-w-5xl rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="mx-auto grid max-w-6xl min-w-0 items-center gap-6 xl:grid-cols-[1.02fr_.98fr]">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
              For OpenTelemetry + Grafana teams
            </div>
            <h1 className="max-w-4xl text-[clamp(2.25rem,6.4vw,4.75rem)] font-black leading-[.95] tracking-tight text-slate-950">
              Transform telemetry into operational intelligence.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg md:text-lg md:leading-8">
              AiSignal turns Prometheus metrics, Loki logs and Tempo traces into explainable incident reports, on-demand postmortems, evidence chains and operational memory — without replacing your existing observability stack.
            </p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <a
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-blue-600 px-5 py-2.5 font-black text-white shadow-[0_18px_45px_rgba(15,98,254,.25)] hover:bg-blue-700"
                href="#console"
              >
                See product in action <ArrowRight className="w-4 h-4 transition group-hover:translate-x-1" />
              </a>
              <a
                className="inline-flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-2.5 font-black text-slate-950 hover:border-blue-300 hover:text-blue-700"
                href="#analysis"
              >
                Run explicit analysis
              </a>
            </div>
            
            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-slate-200 pt-7 sm:mt-12 md:grid-cols-4">
              <div className="border-l border-slate-200 pl-4">
                <div className="text-xl font-black text-slate-950">40+</div>
                <div className="text-xs font-medium text-slate-500">services monitored</div>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <div className="text-xl font-black text-slate-950">5 min</div>
                <div className="text-xs font-medium text-slate-500">health scan cadence</div>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <div className="text-xl font-black text-slate-950">92%</div>
                <div className="text-xs font-medium text-slate-500">similar incident match</div>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <div className="text-xl font-black text-slate-950">$0</div>
                <div className="text-xs font-medium text-slate-500">observability license dependency</div>
              </div>
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="relative mx-auto h-72 w-72 md:h-96 md:w-96">
              <div className="absolute inset-8 rounded-[3rem] bg-blue-500/20 blur-3xl"></div>
              <div className="absolute inset-10 rounded-[2.2rem] border border-blue-200 bg-gradient-to-br from-[#0f62fe] via-[#2674ff] to-[#78a9ff] p-8 shadow-[0_30px_90px_rgba(15,98,254,.35)] flex items-center justify-center">
                 <div className="absolute inset-0 rounded-[2.2rem] bg-white/15"></div>
                 <div className="text-white font-black text-6xl drop-shadow-2xl z-10 relative">AiSignal</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section id="platform" className="px-4 py-10 sm:px-5 md:py-12 bg-slate-50">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-3xl">
            <div className="mb-3 text-sm font-black uppercase tracking-[.22em] text-blue-600">
              Platform thesis
            </div>
            <h2 className="text-xl font-black tracking-tight sm:text-3xl md:text-[2.75rem] lg:text-5xl">
              Not another dashboard. An intelligence layer above your observability stack.
            </h2>
            <p className="mt-5 text-lg text-slate-600">
              AiSignal keeps Prometheus, Loki, Tempo and Grafana as the telemetry source of truth. It adds the missing layer: reasoning, explanation, incident memory and postmortem automation.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="border-t border-slate-200 pt-7">
              <Radio className="mb-5 text-blue-600 w-6 h-6" />
              <h3 className="text-xl font-black tracking-tight text-slate-950">Alert-triggered reports</h3>
              <p className="mt-3 text-slate-600">Subscribe to Grafana or Prometheus webhooks and generate evidence-backed incident reports automatically.</p>
            </div>
            <div className="border-t border-slate-200 pt-7">
              <Brain className="mb-5 text-blue-600 w-6 h-6" />
              <h3 className="text-xl font-black tracking-tight text-slate-950">Incident memory</h3>
              <p className="mt-3 text-slate-600">Recognize similar failures, recover previous resolutions, and reduce repeat investigation effort.</p>
            </div>
            <div className="border-t border-slate-200 pt-7">
              <FileText className="mb-5 text-blue-600 w-6 h-6" />
              <h3 className="text-xl font-black tracking-tight text-slate-950">Postmortem automation</h3>
              <p className="mt-3 text-slate-600">Generate structured postmortem drafts with timeline, impact, root cause, and preventive actions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Console Section */}
      <section id="console" className="px-4 py-10 sm:px-5 md:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-3 text-sm font-black uppercase tracking-[.22em] text-blue-600">
                Production-grade mock UI
              </div>
              <h2 className="text-xl font-black tracking-tight sm:text-3xl md:text-[2.75rem] lg:text-5xl">
                Service intelligence console.
              </h2>
            </div>
            <p className="max-w-xl text-slate-600">
              A product interface for active incidents, explicit analysis, alert subscriptions, incident memory and generated reports.
            </p>
          </div>
          
          <div className="w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,.08)]">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                <span className="h-3 w-3 rounded-full bg-amber-400"></span>
                <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
                <span className="ml-3 font-bold text-slate-950">AiSignal Console · Production Preview</span>
              </div>
              <div className="text-xs font-black uppercase tracking-[.16em] text-emerald-700">
                OpenTelemetry connected
              </div>
            </div>
            
            <div className="grid min-h-[560px] min-w-0 grid-cols-1 xl:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="border-b border-slate-200 bg-slate-950 p-6 text-white xl:border-b-0 xl:border-r xl:border-slate-200">
                <div className="mb-8 flex items-center gap-3">
                  <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-blue-600 font-black shadow-[0_18px_40px_rgba(15,98,254,.35)]">
                    <span className="relative z-10">A∿</span>
                  </div>
                  <div>
                    <div className="font-black">AiSignal</div>
                    <div className="text-xs text-blue-300">Operational Intelligence</div>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="border-l-2 px-4 py-3 border-transparent text-white/58 hover:text-white cursor-pointer">Service Intelligence</div>
                  <div className="border-l-2 px-4 py-3 border-transparent text-white/58 hover:text-white cursor-pointer">Active Incidents</div>
                  <div className="border-l-2 px-4 py-3 border-blue-500 bg-white/5 text-white cursor-pointer">Run Analysis</div>
                  <div className="border-l-2 px-4 py-3 border-transparent text-white/58 hover:text-white cursor-pointer">Alert Subscriptions</div>
                  <div className="border-l-2 px-4 py-3 border-transparent text-white/58 hover:text-white cursor-pointer">Incident Memory</div>
                </div>
              </aside>
              <main className="min-w-0 bg-white p-5 text-slate-950 sm:p-6 md:p-6">
                <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                  <div>
                    <div className="mb-3 text-xs font-black uppercase tracking-[.22em] text-blue-600">On-demand investigation</div>
                    <h3 className="text-xl font-black tracking-tight sm:text-3xl">Generate AI Postmortem</h3>
                    <p className="mt-3 max-w-2xl text-slate-600">Choose a service requiring attention, select evidence sources, and generate a postmortem on demand.</p>
                  </div>
                  <button className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-[0_16px_35px_rgba(15,23,42,.18)] transition hover:bg-blue-600">
                    Generate Postmortem
                  </button>
                </div>
                
                <div className="grid min-w-0 gap-6 xl:grid-cols-[1.02fr_.98fr]">
                  <section className="min-w-0">
                    <div className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.15em] text-slate-500">
                      <TriangleAlert className="text-red-600 w-4 h-4" /> Services Requiring Attention
                    </div>
                    <div className="space-y-4">
                      <div className="block w-full text-left transition bg-blue-50/70 rounded-2xl px-3 py-4 border border-blue-100">
                         <div className="flex items-center justify-between">
                           <div>
                             <div className="text-xl font-black tracking-tight text-slate-950 flex items-center gap-2">qa-login <span className="h-2 w-2 rounded-full bg-blue-600"></span></div>
                             <div className="text-xs font-black uppercase tracking-[.14em] text-slate-400 mt-1">Authentication Service</div>
                           </div>
                           <span className="text-xs font-black tracking-[.16em] text-red-600">CRITICAL</span>
                         </div>
                         <div className="mt-3 font-bold text-slate-800">LoginException spike detected</div>
                         <div className="mt-1 text-sm text-slate-500">Session retrieval failure</div>
                         <div className="mt-4 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{width: '94%'}}></div>
                         </div>
                      </div>
                    </div>
                  </section>
                  
                  <section className="min-w-0 border-t border-slate-200 pt-8 xl:border-l xl:border-t-0 xl:pl-10 xl:pt-0">
                    <div className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.15em] text-slate-500">
                      <FileSearch className="text-blue-600 w-4 h-4" /> Analysis Configuration
                    </div>
                    <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                       <div className="border-b pb-3 text-sm border-slate-200 font-semibold text-slate-700">Last 30 min</div>
                       <div className="border-b pb-3 text-sm border-slate-200 font-semibold text-slate-700">Last 1 hour</div>
                       <div className="border-b pb-3 text-sm border-blue-600 font-black text-blue-700">Last 5 hours</div>
                    </div>
                    
                    <div className="mt-10 border-t border-slate-200 pt-8">
                       <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-[.15em] text-blue-600">
                         <Layers className="w-4 h-4" /> Generated Diagnosis Preview
                       </div>
                       <h4 className="text-2xl font-black tracking-tight text-slate-950">Session Store Retrieval Failure</h4>
                       <div className="mt-4 text-sm font-black uppercase tracking-[.16em] text-emerald-700">87% confidence</div>
                       <div className="mt-5 border-l-2 border-blue-600 pl-4 text-sm text-slate-600">
                         <span className="font-black text-slate-950">Similar incident:</span> INC-247 · 92% match · Previous fix: restart redis-primary-3.
                       </div>
                    </div>
                  </section>
                </div>
              </main>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
