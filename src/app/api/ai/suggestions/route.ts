import OpenAI from 'openai';
import axios from 'axios';
import { NextResponse } from 'next/server';

const openai = new OpenAI();
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090';
const LOKI_URL = process.env.LOKI_URL || 'http://127.0.0.1:3100';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const window = searchParams.get('window') || 'last 2 hours';

    // Fetch recent top errors from Prometheus
    const promRes = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query: 'sum by (service_name) (rate(http_request_duration_seconds_count{status="500"}[1h]))' },
      timeout: 5000,
    });
    
    // Fetch recent error logs from Loki
    const lokiRes = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
      params: { query: '{level="ERROR"}' },
      timeout: 5000,
    });

    const rawData = {
      prometheusTopErrors: promRes.data.data,
      lokiRecentErrors: lokiRes.data.data
    };

    const prompt = `You are AiSignal's predictive intelligence engine.
Based on the raw, real-time observability data below, generate exactly 3 natural language questions that an SRE should ask to investigate the current state of the system.
The questions MUST be highly specific to the actual services and errors present in the data. Do NOT use generic placeholders or hallucinate deployments/events unless explicitly seen in the logs.
If a service like "qa-login" is failing due to Redis timeouts in the logs, suggest a question like: "Analyze the Redis timeouts affecting qa-login over the ${window}".

Raw Data:
${JSON.stringify(rawData).substring(0, 3000)} // Truncated to avoid context limits

Respond ONLY with a JSON array of 3 strings. Example: ["question 1", "question 2", "question 3"]`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You only output JSON in this format: { "suggestions": ["string", "string", "string"] }' },
        { role: 'user', content: prompt }
      ],
    });

    const content = response.choices[0].message.content || '{"suggestions":[]}';
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);

  } catch (err: any) {
    console.error("AI Suggestions failed:", err.message);
    return NextResponse.json({ suggestions: ["Analyze the recent service failures and logs", "Show error logs and trace the top slow requests", "Investigate the elevated 500 error rate detected"] });
  }
}
