import { NextResponse } from 'next/server';
import axios from 'axios';

const PROMETHEUS_URL = 'http://127.0.0.1:9090';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Prometheus query failed:', error.message);
    return NextResponse.json({ error: 'Failed to fetch metrics from Prometheus' }, { status: 500 });
  }
}
