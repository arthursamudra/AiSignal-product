import { NextResponse } from 'next/server';
import axios from 'axios';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI();
const DB_PATH = path.join(process.cwd(), 'data', 'memory.json');

// Ensure DB exists
if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
  fs.mkdirSync(path.join(process.cwd(), 'data'));
}
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify([]));
}

export async function POST(req: Request) {
  try {
    const { domain, email, token, ticketId } = await req.json();

    if (!domain || !email || !token || !ticketId) {
      return NextResponse.json({ error: 'Missing required Jira credentials or Ticket ID' }, { status: 400 });
    }

    // 1. Fetch from Jira Cloud REST API
    const authString = Buffer.from(`${email}:${token}`).toString('base64');
    let title = "";
    let resolution = "";

    try {
      const jiraUrl = `https://${domain}/rest/api/3/issue/${ticketId}`;
      const response = await axios.get(jiraUrl, {
        headers: {
          'Authorization': `Basic ${authString}`,
          'Accept': 'application/json'
        }
      });
      
      const issue = response.data;
      title = issue.fields.summary;
      // Just extract a plain text approximation of the description or resolution field
      const descContent = issue.fields.description?.content || [];
      resolution = descContent.map((block: any) => 
        block.content?.map((textNode: any) => textNode.text).join(' ') || ''
      ).join('\n');
      
      if (!resolution) resolution = "No description provided.";
      
    } catch (err: any) {
      console.error("Jira fetch failed", err?.response?.data || err.message);
      return NextResponse.json({ error: 'Failed to fetch Jira ticket. Check your credentials and ticket ID.' }, { status: 500 });
    }

    // 2. Generate Embedding
    const textToEmbed = `Ticket: ${ticketId}\nTitle: ${title}\nResolution: ${resolution}`;
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: textToEmbed,
      encoding_format: "float",
    });
    const embedding = embeddingResponse.data[0].embedding;

    // 3. Save to local JSON "Vector DB"
    const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    
    // Check if it already exists to overwrite
    const existingIndex = dbData.findIndex((m: any) => m.id === ticketId);
    const newMemory = {
      id: ticketId,
      title,
      resolution,
      embedding
    };

    if (existingIndex >= 0) {
      dbData[existingIndex] = newMemory;
    } else {
      dbData.push(newMemory);
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));

    return NextResponse.json({ success: true, memory: { id: ticketId, title, resolution } });
  } catch (error: any) {
    console.error("Ingest error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const dbData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    // Strip embeddings before returning to frontend
    const uiData = dbData.map((m: any) => ({
      id: m.id,
      title: m.title,
      resolution: m.resolution
    }));
    return NextResponse.json(uiData);
  } catch (err) {
    return NextResponse.json([]);
  }
}
