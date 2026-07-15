import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI();
export const maxDuration = 30;

function cosineSimilarity(vecA: number[], vecB: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 1. Vector Search
  let memoryContextStr = "";
  try {
    const errorContext = messages[messages.length - 1].content;
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: errorContext,
      encoding_format: "float",
    });
    const currentEmbedding = embeddingResponse.data[0].embedding;

    const DB_PATH = path.join(process.cwd(), 'data', 'memory.json');
    if (fs.existsSync(DB_PATH)) {
      const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      
      let bestMatch = null;
      let highestScore = -1;

      for (const memory of dbData) {
        if (!memory.embedding) continue;
        const score = cosineSimilarity(currentEmbedding, memory.embedding);
        if (score > highestScore) {
          highestScore = score;
          bestMatch = memory;
        }
      }

      // If we find a reasonably strong semantic match (e.g., > 0.75 threshold)
      if (bestMatch && highestScore > 0.75) {
        memoryContextStr = `
IMPORTANT: You are equipped with "Incident Memory". Based on a vector similarity search, the current incident strongly resembles the following historical ticket (Match Score: ${(highestScore * 100).toFixed(1)}%):
- ID: ${bestMatch.id}
- Title: "${bestMatch.title}"
- Resolution: "${bestMatch.resolution}"

You MUST include the \`similarIncident\` object in your JSON response and reference its resolution in your recommended actions.`;
      }
    }
  } catch (err) {
    console.error("Vector search failed", err);
  }

  const systemPrompt = `You are AiSignal, an AI SRE expert. You analyze Prometheus metrics, Loki logs, and Tempo traces to write postmortems.
CRITICAL TRACING RULE: If you see evidence of an N+1 query issue in the traces (e.g. many sequential database spans like SELECT * FROM users_cart in a single request), you MUST explicitly attribute the p95 latency degradation to this N+1 issue, and your recommended action MUST be to implement eager loading for those relations.
You MUST respond with ONLY a valid JSON object matching this schema:
{
  "service": "Service name",
  "severity": "Severity level (Critical/Warning/Info)",
  "confidence": "Confidence percentage (e.g. 87%)",
  "executiveSummary": "Brief overview of the incident",
  "rootCause": {
    "title": "Short title of root cause",
    "description": "Detailed explanation of what failed"
  },
  "evidenceChain": ["Step 1", "Step 2"], // Can be empty [] if no data
  "timeline": [
    { "time": "Oct 12, 13:42", "event": "Event description" } // Can be empty [] if no timestamped logs are found. IMPORTANT: Format all times to include both the month/day and time (e.g., "Oct 12, 13:42"). Convert any Unix nanosecond timestamps into readable date-time strings. Do NOT output raw nanosecond timestamps.
  ],
  "impact": "Description of user impact",
  "similarIncident": { // ONLY include this object if you find a similar incident in the provided context
    "id": "e.g. INC-247",
    "title": "Title of the historical incident",
    "resolution": "How it was resolved historically"
  },
  "recommendedActions": ["Action 1", "Action 2"]
}
${memoryContextStr}`;

  const allMessages = [
    { role: 'system', content: systemPrompt },
    ...messages
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    stream: true,
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
