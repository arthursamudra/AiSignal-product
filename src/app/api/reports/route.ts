import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const REPORTS_DIR = path.join(process.cwd(), 'data', 'reports');

// Ensure DB exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'));
}
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR);
}

export async function POST(req: Request) {
  try {
    const reportData = await req.json();
    
    // Generate a unique ID for the report
    const reportId = `RPT-${Date.now()}`;
    const filePath = path.join(REPORTS_DIR, `${reportId}.json`);
    
    const finalReport = {
      id: reportId,
      createdAt: new Date().toISOString(),
      data: reportData
    };

    fs.writeFileSync(filePath, JSON.stringify(finalReport, null, 2));

    return NextResponse.json({ success: true, report: finalReport });
  } catch (error: any) {
    console.error("Report save error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'));
    const reports = files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, file), 'utf8'));
      return {
        id: data.id,
        createdAt: data.createdAt,
        service: data.data.service,
        title: data.data.rootCause?.title || "Incident Report",
        severity: data.data.severity
      };
    });

    // Sort by newest first
    reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json(reports);
  } catch (err) {
    console.error("Failed to read reports", err);
    return NextResponse.json([]);
  }
}
