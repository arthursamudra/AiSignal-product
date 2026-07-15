"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { REPORT_TEMPLATES } from "@/lib/templates";

export default function TemplatesPage() {
  const router = useRouter();

  const templates = REPORT_TEMPLATES;

  const handleExecute = (templateId: string) => {
    // In a full implementation, this would navigate to Run Analysis with the template predefined
    router.push(`/console/analysis?template=${templateId}`);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 text-xs font-black uppercase tracking-[.22em] text-blue-600">Standardized Playbooks</div>
          <h3 className="text-xl font-black tracking-[-.035em] sm:text-3xl text-slate-950">Report Templates</h3>
          <p className="mt-3 max-w-2xl text-slate-600">Select a predefined observability playbook to enforce standard metric queries during postmortem generation.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <div key={t.id} className="flex flex-col justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition hover:shadow-md hover:border-blue-300">
            <div>
              <div className="mb-4 bg-slate-50 border border-slate-100 rounded-xl w-12 h-12 flex items-center justify-center">
                {t.icon}
              </div>
              <h4 className="text-lg font-black text-slate-950 mb-2">{t.title}</h4>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">{t.description}</p>
              
              <div className="space-y-3 mb-6">
                <div className="text-xs font-black uppercase tracking-[.15em] text-slate-400">Enforced Queries</div>
                <div className="space-y-2">
                  {t.metrics.map(m => (
                    <div key={m} className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{m}</span>
                    </div>
                  ))}
                  {t.loki && (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>Loki Exceptions (LogQL)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => handleExecute(t.id)}
              className="mt-auto w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-600 transition-colors"
            >
              Use Template <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
