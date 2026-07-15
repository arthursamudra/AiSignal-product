import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { targetUrl, payload } = await req.json();

    if (!targetUrl || !payload) {
      return NextResponse.json({ error: 'targetUrl and payload are required' }, { status: 400 });
    }

    // Format the payload specifically for Slack
    // If the targetUrl includes slack.com, we structure it nicely.
    let finalPayload = payload;
    
    if (targetUrl.includes('hooks.slack.com')) {
      finalPayload = {
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: `🚨 AiSignal Alert: ${payload.service || 'Test Alert'}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Severity:* ${payload.severity || 'INFO'}\n*Summary:* ${payload.message || 'This is a test alert payload.'}`
            }
          }
        ]
      };
    }

    const response = await axios.post(targetUrl, finalPayload, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json({ success: true, status: response.status, data: response.data });
  } catch (error: any) {
    console.error("Webhook fire failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
