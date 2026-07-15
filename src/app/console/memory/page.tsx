"use client";

import { useState, useEffect } from "react";
import { Brain, FileCode, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";

export default function MemoryPage() {
  const [memories, setMemories] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [domain, setDomain] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [isIngesting, setIsIngesting] = useState(false);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memory/ingest');
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIngesting(true);
    try {
      const res = await fetch('/api/memory/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, email, token, ticketId })
      });
      if (res.ok) {
        alert("Jira ticket successfully ingested and vectorized!");
        setTicketId("");
        setIsSyncing(false);
        fetchMemories();
      } else {
        const err = await res.json();
        alert("Ingestion failed: " + err.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsIngesting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 text-xs font-black uppercase tracking-[.22em] text-blue-600">Operational Knowledge Base</div>
          <h3 className="text-xl font-black tracking-[-.035em] sm:text-3xl text-slate-950">Incident Memory</h3>
          <p className="mt-3 max-w-2xl text-slate-600">A vector database of past resolved incidents (Jira, PagerDuty). AiSignal uses this context to automatically diagnose recurring issues.</p>
        </div>
        <button 
          onClick={() => setIsSyncing(!isSyncing)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_45px_rgba(15,23,42,.22)] hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4" /> Sync External System
        </button>
      </div>

      {isSyncing && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h4 className="text-lg font-black text-slate-950 mb-4">Ingest Jira Ticket</h4>
          <p className="text-sm text-slate-500 mb-6">Enter your Jira Cloud credentials to fetch a ticket. The backend will use OpenAI to create a mathematical vector embedding of the ticket description and store it in the local database.</p>
          <form onSubmit={handleSync} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-black uppercase tracking-[.15em] text-slate-500 mb-2">Jira Domain</label>
              <input type="text" required value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. your-site.atlassian.net" className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-[.15em] text-slate-500 mb-2">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-[.15em] text-slate-500 mb-2">API Token</label>
              <input type="password" required value={token} onChange={e => setToken(e.target.value)} placeholder="Your Atlassian API Token" className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-[.15em] text-slate-500 mb-2">Ticket ID</label>
              <input type="text" required value={ticketId} onChange={e => setTicketId(e.target.value)} placeholder="e.g. INC-1" className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="sm:col-span-2 mt-2">
              <button disabled={isIngesting} type="submit" className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-50">
                {isIngesting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Ingest to Vector DB
              </button>
            </div>
          </form>
        </div>
      )}

      {memories.length === 0 && !isSyncing && (
        <div className="text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
          <Brain className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-lg font-black text-slate-950">Memory Database Empty</h4>
          <p className="text-slate-500 mt-2 text-sm">Sync a Jira ticket to build the knowledge base.</p>
        </div>
      )}

      <div className="grid gap-6">
        {memories.map((m) => (
          <div key={m.id} className="block w-full text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl w-12 h-12 flex items-center justify-center shrink-0">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <div className="w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-[.15em] text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{m.id}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> Vectorized
                  </div>
                </div>
                
                <h4 className="text-lg font-black text-slate-950">{m.title}</h4>
                <div className="mt-2 text-sm text-slate-600">
                  <strong className="text-slate-900">Documented Resolution:</strong> {m.resolution.substring(0, 200)}...
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
