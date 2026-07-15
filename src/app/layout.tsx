import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AiSignal | AI SRE Intelligence",
  description: "Transform telemetry into operational intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-w-0 overflow-x-hidden bg-white text-slate-950 antialiased`}>
        <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/88 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-5">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f62fe] via-[#2b7cff] to-[#78a9ff] shadow-[0_18px_45px_rgba(15,98,254,.28)] flex items-center justify-center text-white font-black">
                A∿
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight text-slate-950">AiSignal</div>
                <div className="text-xs font-medium text-blue-600">AI SRE Intelligence</div>
              </div>
            </div>
            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
              <a href="/" className="hover:text-blue-600">Platform</a>
              <a href="/console/incidents" className="hover:text-blue-600">Console</a>
              <a href="/console/analysis" className="hover:text-blue-600">Run Analysis</a>
            </nav>
            <a href="/console/analysis" className="hidden rounded-full bg-slate-950 px-5 py-2.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(15,23,42,.18)] hover:bg-blue-600 sm:inline-flex">
              Generate Postmortem →
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
