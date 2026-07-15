import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { domain, email, apiToken, spaceKey, data } = await req.json();

    if (!domain || !email || !apiToken || !spaceKey || !data) {
      return NextResponse.json({ error: 'Missing required credentials or data' }, { status: 400 });
    }

    const cleanDomain = domain.replace(/\/$/, '');
    const url = `${cleanDomain}/wiki/rest/api/content`;

    // Construct Confluence Storage Format (HTML)
    const htmlBody = `
      <h1>AiSignal Incident Postmortem: ${data.service}</h1>
      <p><strong>Severity:</strong> ${data.severity}</p>
      <p><strong>Confidence:</strong> ${data.confidence}</p>
      <hr/>
      <h2>Executive Summary</h2>
      <p>${data.executiveSummary}</p>
      <h2>Root Cause Hypothesis</h2>
      <h3>${data.rootCause?.title}</h3>
      <p>${data.rootCause?.description}</p>
      <h2>Evidence Chain</h2>
      <ul>
        ${(data.evidenceChain || []).map((step: string) => `<li>${step}</li>`).join('')}
      </ul>
      <h2>Timeline</h2>
      <ul>
        ${(data.timeline || []).map((t: any) => `<li><strong>${t.time}:</strong> ${t.event}</li>`).join('')}
      </ul>
      <h2>Impact</h2>
      <p>${data.impact}</p>
      ${data.similarIncident ? `
        <h2>Incident Memory Match</h2>
        <p><strong>${data.similarIncident.id} - ${data.similarIncident.title}</strong></p>
        <p>Resolution: ${data.similarIncident.resolution}</p>
      ` : ''}
      <h2>Recommended Actions</h2>
      <ul>
        ${(data.recommendedActions || []).map((action: string) => `<li>${action}</li>`).join('')}
      </ul>
    `;

    const payload = {
      type: "page",
      title: `Incident Report: ${data.service} - ${new Date().toISOString().split('T')[0]}`,
      space: { key: spaceKey },
      body: {
        storage: {
          value: htmlBody,
          representation: "storage"
        }
      }
    };

    const token = Buffer.from(`${email}:${apiToken}`).toString('base64');

    const res = await axios.post(url, payload, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const pageUrl = `${cleanDomain}/wiki${res.data._links.webui}`;
    
    return NextResponse.json({ success: true, url: pageUrl });

  } catch (error: any) {
    console.error("Confluence export failed", error.response?.data || error.message);
    const msg = error.response?.data?.message || error.message;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
