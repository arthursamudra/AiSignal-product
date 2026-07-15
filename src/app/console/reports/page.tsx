"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Download, ExternalLink, CalendarDays } from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const data = await res.json();
          setReports(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchReports();
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <div className="mb-3 text-xs font-black uppercase tracking-[.22em] text-blue-600">Incident Documentation</div>
          <h3 className="text-xl font-black tracking-[-.035em] sm:text-3xl text-slate-950">Generated Reports</h3>
          <p className="mt-3 max-w-2xl text-slate-600">A historical archive of all AI-generated postmortems.</p>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h4 className="text-lg font-black text-slate-950">No Reports Yet</h4>
          <p className="text-slate-500 mt-2 text-sm">Generate your first postmortem from the Run Analysis tab.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-5">
                <div className="bg-blue-50 border border-blue-100 rounded-xl w-14 h-14 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-950">{r.title}</h4>
                  <div className="mt-1 flex items-center gap-3 text-sm text-slate-500 font-medium">
                    <span className="text-slate-950 font-bold">{r.service}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 sm:mt-0 flex items-center gap-4">
                <span className={`text-xs font-black uppercase tracking-[.15em] ${r.severity === 'Critical' ? 'text-red-600 bg-red-50 border border-red-100' : 'text-amber-600 bg-amber-50 border border-amber-100'} px-3 py-1.5 rounded-full`}>
                  {r.severity}
                </span>
                <Link href={`/console/reports/${r.id}`} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white hover:bg-slate-800 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" /> View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
