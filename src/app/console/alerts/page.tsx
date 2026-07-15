"use client";

import { useState, useEffect } from "react";
import { BellRing, MessageSquare, ExternalLink, Plus, Loader2, Send } from "lucide-react";

export default function AlertsPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [isFiring, setIsFiring] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch('/api/alerts/subscriptions');
      if (res.ok) {
        setSubscriptions(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newTarget) return;
    
    try {
      const res = await fetch('/api/alerts/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, type: "Slack", target: newTarget })
      });
      if (res.ok) {
        setNewName("");
        setNewTarget("");
        setIsAdding(false);
        fetchSubscriptions();
      } else {
        const err = await res.json();
        alert("Failed to add subscription: " + err.error);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleTestFire = async (sub: any) => {
    setIsFiring(sub.id);
    try {
      const res = await fetch('/api/alerts/fire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: sub.target,
          payload: { service: sub.name, severity: "INFO", message: "This is a live test alert dispatched from the AiSignal console." }
        })
      });
      if (res.ok) {
        alert("Test payload successfully delivered!");
      } else {
        const err = await res.json();
        alert("Delivery failed: " + err.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsFiring(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 text-xs font-black uppercase tracking-[.22em] text-blue-600">Automated Delivery</div>
          <h3 className="text-xl font-black tracking-[-.035em] sm:text-3xl text-slate-950">Alert Subscriptions</h3>
          <p className="mt-3 max-w-2xl text-slate-600">Configure integrations to automatically receive AI-generated postmortems the moment an alert triggers.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-[0_18px_45px_rgba(15,98,254,.22)] hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Subscription
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/50 p-6 shadow-sm">
          <h4 className="text-lg font-black text-slate-950 mb-4">Create Slack Integration</h4>
          <form onSubmit={handleAdd} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-black uppercase tracking-[.15em] text-slate-500 mb-2">Rule Name</label>
              <input 
                type="text" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Critical Backend Alerts"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex-[2]">
              <label className="block text-xs font-black uppercase tracking-[.15em] text-slate-500 mb-2">Slack Webhook URL</label>
              <input 
                type="url" 
                value={newTarget}
                onChange={e => setNewTarget(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button type="submit" className="rounded-xl bg-slate-950 px-6 py-2.5 text-sm font-black text-white hover:bg-slate-800">
              Save
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-6">
        {subscriptions.map((s) => (
          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-5">
              <div className="bg-slate-50 border border-slate-100 rounded-xl w-14 h-14 flex items-center justify-center shrink-0">
                <BellRing className="w-6 h-6 text-slate-700" />
              </div>
              <div>
                <h4 className="text-lg font-black text-slate-950">{s.name}</h4>
                <div className="mt-1 flex items-center gap-3 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-4 h-4" /> {s.type}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-slate-700 truncate max-w-xs">{s.target}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 flex items-center gap-4">
              <span className={`text-xs font-black uppercase tracking-[.15em] ${s.status === 'Active' ? 'text-emerald-600 bg-emerald-50 border border-emerald-100' : 'text-slate-500 bg-slate-50 border border-slate-200'} px-3 py-1.5 rounded-full`}>
                {s.status}
              </span>
              <button 
                onClick={() => handleTestFire(s)}
                disabled={isFiring === s.id}
                className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 hover:bg-blue-100 disabled:opacity-50"
              >
                {isFiring === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Test Alert
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
