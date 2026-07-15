"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: "Active Incidents", path: "/console/incidents" },
    { name: "Run Analysis", path: "/console/analysis" },
    { name: "Ask Telemetry", path: "/console/ask" },
    { name: "Historical Intelligence", path: "/console/historical" },
    { name: "Report Templates", path: "/console/templates" },
    { name: "Generated Reports", path: "/console/reports" },
    { name: "Incident Memory", path: "/console/memory" },
    { name: "Alert Subscriptions", path: "/console/alerts" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-5 md:py-12 pt-24 mt-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-[.22em] text-blue-600">
              Active Environment
            </div>
            <h2 className="text-xl font-black tracking-tight sm:text-3xl md:text-[2.75rem] lg:text-5xl text-slate-950">
              Service intelligence console.
            </h2>
          </div>
        </div>

        <div className="w-full min-w-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,.08)]">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              <span className="h-3 w-3 rounded-full bg-amber-400"></span>
              <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
              <span className="ml-3 font-bold text-slate-950">
                AiSignal Console · Production Preview
              </span>
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
                  <div className="text-xs text-blue-300">
                    Operational Intelligence
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-sm flex flex-col">
                {navItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`border-l-2 px-4 py-3 cursor-pointer ${
                        isActive
                          ? "border-blue-500 bg-white/5 text-white"
                          : "border-transparent text-white/58 hover:text-white"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </aside>
            <main className="min-w-0 bg-white p-5 text-slate-950 sm:p-6 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
