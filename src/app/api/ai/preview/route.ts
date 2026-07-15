import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import axios from 'axios';

const openai = new OpenAI();
export const maxDuration = 30;

const LOKI_URL = 'http://127.0.0.1:3100';
const PROMETHEUS_URL = 'http://127.0.0.1:9090';

export async function POST(req: Request) {
  try {
    const { service, timeRange, incidentNames, templateTitle, templateMetrics } = await req.json();

    if (!service) {
      return NextResponse.json({ error: 'service is required' }, { status: 400 });
    }

    let interval = "5m";
    let lokiStart = Date.now() - (5 * 60 * 1000); // Default 5 mins

    if (timeRange === "Last 30 min") {
      interval = "30m";
      lokiStart = Date.now() - (30 * 60 * 1000);
    } else if (timeRange === "Last 1 hour") {
      interval = "1h";
      lokiStart = Date.now() - (60 * 60 * 1000);
    } else if (timeRange === "Last 5 hours") {
      interval = "5h";
      lokiStart = Date.now() - (5 * 60 * 60 * 1000);
    }

    // 1. Fetch latest logs directly from Loki within the time range
    let rawLogData = [];
    try {
      const res = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
        params: { 
          query: `{service="${service}"} |= "Exception"`,
          start: (lokiStart * 1000000).toString(), // Loki uses nanoseconds
        },
        timeout: 3000,
      });
      rawLogData = res.data.data.result;
    } catch (err: any) {
      console.error("Preview log fetch failed", err.message);
    }

    // 2. Fetch basic metrics from Prometheus
    let rawMetricData = [];
    try {
      // Get the error rate over the requested time range
      const promQuery = `sum(rate(http_request_duration_seconds_count{service_name="${service}", status="500"}[${interval}]))`;
      const res = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query: promQuery },
        timeout: 3000,
      });
      rawMetricData = res.data.data.result;
    } catch (err: any) {
      console.error("Preview metric fetch failed", err.message);
    }

    // 3. Fetch recent traces from Tempo
    let rawTraceData = [];
    try {
      const res = await axios.get(`http://127.0.0.1:3200/api/search`, {
        params: { tags: `service.name=${service}` },
        timeout: 3000,
      });
      let traces = res.data.traces || [];
      
      // Fetch full span hierarchy for the first trace so AI can diagnose N+1
      if (traces.length > 0) {
        try {
          const traceId = traces[0].traceID;
          const fullTraceRes = await axios.get(`http://127.0.0.1:3200/api/traces/${traceId}`);
          traces[0].fullSpans = fullTraceRes.data;
        } catch (err) {
          console.error("Failed to fetch full trace", err);
        }
      }
      rawTraceData = traces;
    } catch (err: any) {
      console.error("Preview trace fetch failed", err.message);
    }

    // 3. Ask AI to generate a quick preview
    let systemPrompt = `You are AiSignal, an AI SRE expert. Generate a quick 3-step diagnosis preview card based on the raw metrics, active incident names, and logs.
If the logs are empty or generic, return a generic placeholder preview.
Format each step as a plain actionable sentence without any numbering or "Step X:" prefixes.
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "title": "Short hypothesis title (e.g. Session Store Retrieval Failure)",
  "confidence": "Percentage (e.g. 87%)",
  "steps": ["Actionable sentence one.", "Actionable sentence two.", "Actionable sentence three."]
}
`;

    if (templateTitle) {
      const metricStr = templateMetrics ? templateMetrics.join(", ") : "the metrics";
      systemPrompt = `You are AiSignal, an AI SRE expert. You are investigating this service using the "${templateTitle}" playbook. You must analyze the data through this lens. 
You MUST explicitly mention the playbook's target metrics (e.g., ${metricStr}) in your diagnosis steps, assessing if they are the cause or if they can be ruled out.
HOWEVER, you must stay strictly grounded in reality. If the raw logs or metrics clearly indicate a different root cause (e.g., Redis timeout, external API latency), you MUST state the actual root cause as the primary issue. Do not hallucinate or force a ${templateTitle} issue if the data does not support it.
Generate a quick 3-step diagnosis preview card based on the raw metrics, secondary active incident names, and logs.
Format each step as a plain actionable sentence without any numbering or "Step X:" prefixes.
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "title": "Short hypothesis title (e.g. Session Store Retrieval Failure)",
  "confidence": "Percentage (e.g. 87%)",
  "steps": ["Actionable sentence one.", "Actionable sentence two.", "Actionable sentence three."]
}
`;
    }

    const incidentContext = incidentNames && incidentNames.length > 0 
      ? `Active Incidents: ${incidentNames.join(', ')}\n`
      : "";

    const promptMessage = {
      role: 'user' as const,
      content: `Generate a diagnosis preview for service: ${service}.\n\n${incidentContext}Raw metrics (error rate):\n${JSON.stringify(rawMetricData)}\n\nRaw logs:\n${JSON.stringify(rawLogData)}\n\nRaw Traces:\n${JSON.stringify(rawTraceData)}`
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        promptMessage
      ]
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsedData = JSON.parse(content);

    return NextResponse.json(parsedData);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
