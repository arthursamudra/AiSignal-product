import OpenAI from 'openai';

const openai = new OpenAI();
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const systemPrompt = `
You are AiSignal, an AI SRE expert. The user will ask an operational question in plain English.
You must translate this into a query plan.

- CRITICAL DATA SCHEMA INSTRUCTIONS:
- For Loki queries, the label is \`service\` and the value is the EXACT service name provided (e.g., \`{service="qa-login"}\`). Do NOT use \`job\`.
- For Prometheus queries, the label is \`service_name\` and the value is the EXACT service name provided.
- For Tempo queries (Distributed Tracing), the source is "Tempo" and the code is EXACTLY the service name (e.g., "qa-login"). You MUST generate a Tempo query when the playbook requests "Trace Spans" or "Latency p95" or "N+1". DO NOT generate Prometheus queries for these!
- AVAILABLE PROMETHEUS METRICS (You MUST ONLY use these):
  1. \`http_request_duration_seconds_count\`
  2. \`http_request_duration_seconds_sum\`
  3. \`http_request_duration_seconds_bucket\`
  4. \`system_memory_usage_bytes\`
  5. \`system_cpu_usage_percentage\`
  (Note: use the \`status\` label to find errors, e.g., \`status="500"\`. DO NOT invent metrics like \`errors_total\`. NEVER use Prometheus for Trace Spans or Latency p95).
- EXPLICIT USER COMMANDS (If the user includes these keywords in their prompt, you MUST obey them):
  - \`/trend\`: You MUST output a raw range query (e.g. \`metric[1h]\`) instead of an aggregation. This generates a matrix result so the UI can render a graph.
  - \`/average\`: You MUST output an aggregation query (e.g. \`avg_over_time(metric[1h])\`) to generate a vector result for a scalar average.
  - \`/errors\`: You MUST filter your queries by \`status="500"\` to focus explicitly on error rates.
- If the user does not specify a time window, assume a default window of "30d" (30 days) for Prometheus queries and "30 days" for the JSON window field.

Respond ONLY with a JSON object in exactly this format (no markdown code blocks, just raw JSON):
{
  "service": "Service name inferred",
  "window": "Time window inferred",
  "intent": "Short description of the intent",
  "queries": [
    {
      "source": "Loki",
      "description": "error logs",
      "code": "{service=\\"mock-qa-login\\"} |= \\"Exception\\""
    },
    {
      "source": "Prometheus",
      "description": "request volume",
      "code": "sum(rate(http_request_duration_seconds_count{service_name=\\"mock-qa-login\\"}[5m]))"
    }
  ]
}
`;

  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    stream: true,
    response_format: { type: 'json_object' },
    messages: allMessages,
  });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            controller.enqueue(new TextEncoder().encode(content));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
