import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const RULES_FILE = path.join(process.cwd(), 'docker', 'config', 'rules.yml');

export async function GET() {
  try {
    if (!fs.existsSync(RULES_FILE)) {
      return NextResponse.json({ error: "Rules file not found" }, { status: 404 });
    }
    
    const content = fs.readFileSync(RULES_FILE, 'utf8');
    
    // Extract threshold value using regex
    // Looks for: rate(http_request_duration_seconds_count[1m]) > 0.02
    const match = content.match(/rate\(http_request_duration_seconds_count\[1m\]\)\s*>\s*(0\.\d+)/);
    const threshold = match ? parseFloat(match[1]) * 100 : 5; // Default 5% if not found

    return NextResponse.json({ success: true, threshold });
  } catch (error: any) {
    console.error("Failed to read threshold:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { threshold } = await req.json();
    
    if (typeof threshold !== 'number' || threshold < 0 || threshold > 100) {
      return NextResponse.json({ error: "Invalid threshold value" }, { status: 400 });
    }

    if (!fs.existsSync(RULES_FILE)) {
      return NextResponse.json({ error: "Rules file not found" }, { status: 404 });
    }

    const decimalThreshold = (threshold / 100).toFixed(3);
    
    let content = fs.readFileSync(RULES_FILE, 'utf8');
    
    // Replace the existing error rate threshold with the new one
    // Specifically target the http_request_duration_seconds_count expression
    content = content.replace(/(rate\(http_request_duration_seconds_count\[1m\]\)\s*)>\s*0\.\d+/, `$1> ${decimalThreshold}`);
    
    fs.writeFileSync(RULES_FILE, content);

    // Trigger Prometheus Hot-Reload
    try {
      await axios.post('http://localhost:9090/-/reload');
    } catch (e) {
      console.warn("Could not reload Prometheus. Is it running with --web.enable-lifecycle?", e);
      // We still succeed the request since the file was saved
    }

    return NextResponse.json({ success: true, newThreshold: threshold });
  } catch (error: any) {
    console.error("Failed to update threshold:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
