import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'subscriptions.json');

// Ensure DB exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'));
}
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

export async function GET() {
  try {
    const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    return NextResponse.json(dbData);
  } catch (err) {
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  try {
    const { name, type, target } = await req.json();

    if (!name || !target) {
      return NextResponse.json({ error: 'Name and target URL are required' }, { status: 400 });
    }

    const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    const newSubscription = {
      id: `SUB-${Date.now()}`,
      name,
      type: type || "Webhook",
      target,
      status: "Active"
    };

    dbData.push(newSubscription);

    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));

    return NextResponse.json({ success: true, subscription: newSubscription });
  } catch (error: any) {
    console.error("Subscription save failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
