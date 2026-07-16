import { NextResponse } from 'next/server';
import axios from 'axios';

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://127.0.0.1:9090';
const LOKI_URL = process.env.LOKI_URL || 'http://127.0.0.1:3100';
const TEMPO_URL = process.env.TEMPO_URL || 'http://127.0.0.1:3200';

type QueryPayload = {
  source: string;
  code: string;
};

export async function POST(request: Request) {
  try {
    const { queries } = await request.json();

    if (!Array.isArray(queries)) {
      return NextResponse.json({ error: 'queries array is required' }, { status: 400 });
    }

    const results = await Promise.all(queries.map(async (q: QueryPayload) => {
      try {
        if (q.source.toLowerCase().includes('prometheus')) {
          const res = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
            params: { query: q.code },
            timeout: 5000,
          });
          return { query: q.code, source: 'Prometheus', data: res.data.data };
        } 
        else if (q.source.toLowerCase().includes('loki')) {
          const res = await axios.get(`${LOKI_URL}/loki/api/v1/query_range`, {
            params: { query: q.code },
            timeout: 5000,
          });
          return { query: q.code, source: 'Loki', data: res.data.data };
        }
        else if (q.source.toLowerCase().includes('tempo')) {
          const res = await axios.get(`${TEMPO_URL}/api/search`, {
            params: { tags: `service.name=${q.code}` },
            timeout: 5000,
          });
          let traces = res.data.traces || [];
          
          // Fetch full span hierarchy for up to 10 traces so AI can diagnose N+1 and UI can render span details
          if (traces.length > 0) {
            await Promise.all(traces.slice(0, 10).map(async (trace: any) => {
              try {
                const fullTraceRes = await axios.get(`${TEMPO_URL}/api/traces/${trace.traceID}`);
                trace.fullSpans = fullTraceRes.data;
              } catch (err) {
                console.error(`Failed to fetch full trace ${trace.traceID}`, err);
              }
            }));
          }
          
          return { query: q.code, source: 'Tempo', data: traces };
        }
        return { query: q.code, source: q.source, error: 'Unsupported data source' };
      } catch (err: any) {
        return { 
          query: q.code, 
          source: q.source, 
          error: err.response?.data?.message || err.message || 'Execution failed' 
        };
      }
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Execution engine failed:', error.message);
    return NextResponse.json({ error: 'Failed to process queries' }, { status: 500 });
  }
}
