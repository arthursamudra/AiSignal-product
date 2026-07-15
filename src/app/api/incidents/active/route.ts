import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ACTIVE_INCIDENTS_FILE = path.join(process.cwd(), 'data', 'active_incidents.json');

export async function GET() {
  try {
    let activeIncidents: Record<string, any> = {};
    if (fs.existsSync(ACTIVE_INCIDENTS_FILE)) {
      try {
        activeIncidents = JSON.parse(fs.readFileSync(ACTIVE_INCIDENTS_FILE, 'utf8'));
      } catch (e) {
        // Handle corrupted file gracefully
      }
    }
    
    // Convert object dictionary to array
    const incidentsArray = Object.values(activeIncidents);

    return NextResponse.json({ success: true, incidents: incidentsArray });
  } catch (error: any) {
    console.error("Failed to fetch active incidents:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
