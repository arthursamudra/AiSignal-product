"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import PostmortemReport, { PostmortemData } from "@/components/PostmortemReport";

export default function ViewReportPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<PostmortemData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/reports/${params.id}`);
        if (res.ok) {
          const raw = await res.json();
          setData(raw.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchReport();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-2 text-blue-600 font-bold">
          <Loader2 className="w-5 h-5 animate-spin" /> Fetching Report...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <h2 className="text-xl font-bold text-slate-900">Report Not Found</h2>
        <button onClick={() => router.push('/console/reports')} className="text-blue-600 hover:underline">
          Return to Reports
        </button>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={() => router.push('/console/reports')}
        className="inline-flex items-center gap-2 mb-8 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to All Reports
      </button>
      <div className="mt-[-64px]">
        <PostmortemReport data={data} timeWindow="Historical Snapshot" />
      </div>
    </div>
  );
}
