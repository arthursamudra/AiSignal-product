import { Activity, Database, Flame } from "lucide-react";

export type ReportTemplate = {
  id: string;
  title: string;
  description: string;
  metrics: string[];
  loki: boolean;
  icon: React.ReactNode;
};

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "api-health",
    title: "General API Health Check",
    description: "A standard RED metrics postmortem template to investigate general service degradation and 500 errors.",
    metrics: ["http_request_duration_seconds_count", "http_request_duration_seconds_sum"],
    loki: true,
    icon: <Activity className="w-6 h-6 text-emerald-500" />
  },
  {
    id: "memory-leak",
    title: "Memory Leak Deep-Dive",
    description: "Analyzes system memory consumption and identifies underlying causes of Out-Of-Memory (OOM) exceptions.",
    metrics: ["system_memory_usage_bytes", "http_request_duration_seconds_count"],
    loki: true,
    icon: <Database className="w-6 h-6 text-amber-500" />
  },
  {
    id: "cpu-spike",
    title: "CPU Starvation Analysis",
    description: "Investigates erratic CPU spikes and correlates them with dropped connections or high-latency traces.",
    metrics: ["system_cpu_usage_percentage", "http_request_duration_seconds_bucket"],
    loki: true,
    icon: <Flame className="w-6 h-6 text-red-500" />
  },
  {
    id: "distributed-tracing",
    title: "Distributed Tracing",
    description: "Analyzes trace span hierarchies to pinpoint latency bottlenecks such as N+1 queries or slow external API calls.",
    metrics: ["Latency p95", "Trace Spans"],
    loki: true,
    icon: <Activity className="w-6 h-6 text-purple-500" />
  }
];
