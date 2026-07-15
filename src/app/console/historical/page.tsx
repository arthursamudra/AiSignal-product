"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Archive, CirclePlay, ArrowRight, SearchCode, Gauge, Database, Sparkles, FileSearch, Loader2, CircleCheck } from "lucide-react";
import PostmortemReport, { PostmortemData } from "@/components/PostmortemReport";

export default function HistoricalIntelligencePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [planData, setPlanData] = useState<any>(null);
  
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([
    "Loading dynamic historical data from Prometheus..."
  ]);

  useEffect(() => {
    const fetchTopServices = async () => {
      try {
        const res = await fetch('/api/ai/suggestions?window=last%2030%20days');
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        }
      } catch (e) {
        console.error("Failed to fetch AI suggestions", e);
      }
    };
    fetchTopServices();
  }, []);

  const append = async (msg: {role: string, content: string}, simulatedContext: string) => {
    setIsLoading(true);
    setError(null);
    
    // We display the user's raw message in state, but send the hidden simulated context to the AI
    const displayMessages = [...messages, msg];
    setMessages(displayMessages);

    try {
      const res = await fetch('/api/ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [
            ...messages, 
            { role: 'user', content: simulatedContext + "\n\nUser Question: " + msg.content }
          ] 
        })
      });
      
      if (!res.ok) throw new Error("API responded with " + res.status);
      if (!res.body) throw new Error("No response body stream");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      
      setMessages([...displayMessages, { role: 'assistant', content: '' }]);
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        
        setMessages(msgs => {
          const m = [...msgs];
          m[m.length - 1] = { role: 'assistant', content: assistantContent };
          return m;
        });
      }
    } catch (e: any) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  };

  const responseMessage = messages.findLast(m => m.role === 'assistant');
  const completionText = responseMessage?.content || '';

  useEffect(() => {
    if (completionText) {
      try {
        const parsed = JSON.parse(completionText);
        setPlanData(parsed);
      } catch (e) {
        // Still streaming or invalid JSON
      }
    }
  }, [completionText]);

  const handleGenerate = async () => {
    setPlanData(null);
    setReportData(null);
    
    // We remove the simulated prompt and just pass the query directly
    await append({ role: 'user', content: query }, "");
  };

  const [isExecuting, setIsExecuting] = useState(false);
  const [reportData, setReportData] = useState<PostmortemData | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setReportData(null);
    
    try {
      // 1. Execute the query plan against actual endpoints
      const execRes = await fetch('/api/observability/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queries: planData?.queries || [] })
      });
      if (!execRes.ok) throw new Error("Execution failed");
      const execData = await execRes.json();
      const rawResults = execData.results;

// 2. Generate postmortem strictly based on raw data
      const prompt = `Based on the 30-day query plan for ${planData?.service || 'the service'}, the user asked: "${query}". 
Here is the strict, raw JSON data returned from actually executing those queries against Prometheus and Loki:
${JSON.stringify(rawResults)}

CRITICAL INSTRUCTION: You MUST NOT invent or hallucinate any probable causes, components, timelines, or fake incidents. Build the postmortem strictly and purely based on the facts present in the raw data above. 
IMPORTANT: Because this is a simulated environment with sparse data, if Prometheus returns an error rate > 0 (even a tiny rate like 0.001 due to 30d averaging), or if Loki returns ANY error logs, you MUST report it as a confirmed error pattern and incident. Do NOT say 'no errors' if logs exist or rate > 0.
The Window should be "Last 30 Days".`;

      const res = await fetch('/api/ai/postmortem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [{ role: 'user', content: prompt }] 
        })
      });
      
      if (!res.ok) throw new Error("API error");
      if (!res.body) throw new Error("No stream");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReport = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullReport += decoder.decode(value, { stream: true });
      }

      const parsedData = JSON.parse(fullReport);
      setReportData(parsedData);

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
      
      // Automatically broadcast to all active webhooks (like Slack)
      try {
        await fetch('/api/alerts/broadcast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        });
      } catch (err) {
        console.error("Failed to broadcast report", err);
      }
      
    } catch (e: any) {
      setError(e);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 grid gap-6 lg:grid-cols-[.82fr_1.18fr] lg:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-blue-600">
            <Archive className="w-4 h-4" /> Historical Intelligence
          </div>
          <h2 className="text-xl font-black tracking-[-.035em] sm:text-3xl text-slate-950">Ask questions across weeks of telemetry without running massive raw queries.</h2>
        </div>
        <p className="max-w-2xl text-slate-600">
          AiSignal continuously summarizes your operational data into smart roll-ups. When you ask a question spanning 30 days, AiSignal queries the highly-compressed rollups, preventing expensive metrics-backend scans.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-start">
        <div className="border-t border-slate-200 pt-7">
          <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[.16em] text-slate-500">
            <Archive className="text-blue-600 w-4 h-4" /> 30-Day Historical Request
          </div>
          <label className="sr-only" htmlFor="telemetry-question">Historical telemetry question</label>
          <textarea 
            id="telemetry-question" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-h-[146px] w-full resize-none border-0 border-b border-slate-300 bg-transparent px-0 py-4 text-2xl font-black leading-tight tracking-[-.04em] text-slate-950 outline-none placeholder:text-slate-300 focus:border-blue-600 focus:ring-0" 
            placeholder="Type your question here, or click a suggestion below..."
          />
          
          {error && <div className="mt-4 text-sm font-bold text-red-600 bg-red-50 p-4 rounded-xl border border-red-200">Error: {error.message || "Could not connect to AI."}</div>}

          <div className="mt-5 flex flex-wrap gap-3">
            <button 
              onClick={handleGenerate}
              disabled={isLoading || !query.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-[0_18px_45px_rgba(15,98,254,.22)] hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CirclePlay className="w-4 h-4" />} 
              Generate 30-Day plan
            </button>
            <button 
              onClick={handleExecute}
              disabled={!planData || isLoading || isExecuting}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-5 py-3 text-sm font-black text-slate-950 hover:border-blue-300 hover:text-blue-700 disabled:opacity-50 disabled:hover:border-slate-300 disabled:hover:text-slate-950"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Execute historical plan <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mt-9 border-t border-slate-200 pt-6">
            <div className="mb-4 text-xs font-black uppercase tracking-[.18em] text-slate-400">Try historical examples</div>
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <button 
                  key={idx}
                  onClick={() => setQuery(suggestion)} 
                  className="block w-full border-b border-slate-200 pb-3 text-left text-sm font-semibold leading-6 text-slate-600 hover:text-blue-700"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 border-t border-slate-200 pt-7">
          <div className="mb-5 flex items-center gap-2 text-sm font-black uppercase tracking-[.16em] text-slate-500">
            <SearchCode className="text-blue-600 w-4 h-4" /> Optimized Query Plan
          </div>
          
          {!planData && !isLoading && (
             <div className="text-slate-500 text-sm font-semibold mt-8 flex items-center justify-center h-40 border border-dashed border-slate-300 rounded-2xl">
               Hit "Generate 30-Day plan" to see AiSignal reasoning.
             </div>
          )}

          {isLoading && !planData && (
             <div className="text-blue-600 text-sm font-bold flex flex-col items-center justify-center h-40 border border-dashed border-blue-200 bg-blue-50/50 rounded-2xl gap-3">
               <Loader2 className="w-6 h-6 animate-spin" /> Translating to Rollup PromQL / LogQL...
             </div>
          )}

          {planData && (
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="border-t border-slate-200 pt-4">
                  <Gauge className="mb-3 text-blue-600 w-4 h-4" />
                  <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Service</div>
                  <div className="mt-2 text-sm font-black text-slate-950">{planData.service || '-'}</div>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <Database className="mb-3 text-blue-600 w-4 h-4" />
                  <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Window</div>
                  <div className="mt-2 text-sm font-black text-slate-950">{planData.window || '-'}</div>
                </div>
                <div className="border-t border-slate-200 pt-4">
                  <Sparkles className="mb-3 text-blue-600 w-4 h-4" />
                  <div className="text-xs font-black uppercase tracking-[.16em] text-slate-400">Intent</div>
                  <div className="mt-2 text-sm font-black text-slate-950">{planData.intent || '-'}</div>
                </div>
              </div>
              
              <div className="grid gap-4">
                {(planData.queries || []).map((q: any, i: number) => (
                  <div key={i} className="border-t border-slate-200 pt-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[.16em] text-slate-500">
                      <span className="flex items-center gap-2"><FileSearch className="text-blue-600 w-3 h-3" /> {q.source} · {q.description}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800">Rollup</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs font-medium text-emerald-400"><code>{q.code}</code></pre>
                  </div>
                ))}
              </div>

              {isExecuting && !reportData && (
                 <div className="mt-8 text-blue-600 text-sm font-bold flex flex-col items-center justify-center h-40 border border-dashed border-blue-200 bg-blue-50/50 rounded-2xl gap-3">
                   <Loader2 className="w-6 h-6 animate-spin" /> Querying historical rollups & analyzing...
                 </div>
              )}

            </div>
          )}
        </div>
      </div>

      {reportData && (
        <div id="historical-report" className="mt-16 pt-16 border-t border-slate-200">
          <PostmortemReport data={reportData} timeWindow="Last 30 Days" queries={planData?.queries} />
        </div>
      )}
    </div>
  );
}
