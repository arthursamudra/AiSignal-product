import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'data', 'events.json');
const ACTIVE_INCIDENTS_FILE = path.join(process.cwd(), 'data', 'active_incidents.json');

export async function POST(req: Request) {
  try {
    let payload: any = {};
    const bodyText = await req.text();
    if (bodyText) {
      payload = JSON.parse(bodyText);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.mkdirSync(path.join(process.cwd(), 'data'));
    }
    
    // 1. Process Alertmanager schema and convert to our format
    let processedEvents: any[] = [];
    
    // Check if this is a real Alertmanager payload or a mock payload from the UI button
    if (payload.alerts && Array.isArray(payload.alerts)) {
      payload.alerts.forEach((alert: any) => {
        processedEvents.push({
          source: 'Prometheus Alertmanager',
          alertname: alert.labels?.alertname || 'Unknown Alert',
          service: alert.labels?.service_name || alert.labels?.service || 'unknown-service',
          severity: alert.labels?.severity || 'warning',
          status: alert.status // 'firing' or 'resolved'
        });
      });
    } else {
      // Mock payload fallback
      processedEvents.push(payload);
    }

    // 2. Write to events.json (for SSE stream)
    let events = [];
    if (fs.existsSync(EVENTS_FILE)) {
      events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    }

    const newEventsWithId = processedEvents.map(evt => ({
      id: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      ...evt
    }));

    events = [...events, ...newEventsWithId];
    if (events.length > 50) {
      events = events.slice(events.length - 50);
    }
    fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));

    // 3. Update active_incidents.json state
    let activeIncidents: Record<string, any> = {};
    if (fs.existsSync(ACTIVE_INCIDENTS_FILE)) {
      try {
        activeIncidents = JSON.parse(fs.readFileSync(ACTIVE_INCIDENTS_FILE, 'utf8'));
      } catch (e) {
        // file might be empty or corrupted, start fresh
      }
    }

    newEventsWithId.forEach(evt => {
      const key = `${evt.alertname}-${evt.service}`;
      if (evt.status === 'firing') {
        activeIncidents[key] = evt;
      } else if (evt.status === 'resolved') {
        delete activeIncidents[key];
      }
    });

    fs.writeFileSync(ACTIVE_INCIDENTS_FILE, JSON.stringify(activeIncidents, null, 2));

    return NextResponse.json({ success: true, processed: newEventsWithId.length });
  } catch (error: any) {
    console.error("Webhook receiver failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
