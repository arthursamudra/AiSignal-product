import { NextResponse } from 'next/server';
import axios from 'axios';

const LOKI_URL = 'http://127.0.0.1:3100';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const response = await axios.get(`${LOKI_URL}/loki/api/v1/query`, {
      params: { query },
    });
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Loki query failed:', error.message);
    return NextResponse.json({ error: 'Failed to fetch logs from Loki' }, { status: 500 });
  }
}
