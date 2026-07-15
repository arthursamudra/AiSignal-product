import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

const SUBS_PATH = path.join(process.cwd(), 'data', 'subscriptions.json');

export async function POST(req: Request) {
  try {
    const postmortemData = await req.json();

    if (!fs.existsSync(SUBS_PATH)) {
      return NextResponse.json({ success: true, firedCount: 0, message: "No subscriptions database found" });
    }

    const subscriptions = JSON.parse(fs.readFileSync(SUBS_PATH, 'utf8'));
    const activeWebhooks = subscriptions.filter((s: any) => s.status === 'Active' && s.target);

    let firedCount = 0;
    const errors: string[] = [];

    for (const sub of activeWebhooks) {
      // Format payload based on webhook type. For Slack, we'll build a nice rich message.
      let payload: any = postmortemData;

      if (sub.target.includes('slack.com')) {
        const severityEmoji = postmortemData.severity?.toLowerCase() === 'critical' ? '🔴' : '🟡';
        payload = {
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${severityEmoji} Incident Postmortem: ${postmortemData.service}`
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Root Cause:* ${postmortemData.rootCause?.title}\n*Confidence:* ${postmortemData.confidence}`
              }
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Summary:* ${postmortemData.executiveSummary}`
              }
            }
          ]
        };

        if (postmortemData.similarIncident) {
          payload.blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `🧠 *Memory Match (*\`${postmortemData.similarIncident.id}\`*)*\n${postmortemData.similarIncident.resolution}`
            }
          });
        }
      }

      try {
        await axios.post(sub.target, payload, {
          headers: { 'Content-Type': 'application/json' }
        });
        firedCount++;
      } catch (err: any) {
        errors.push(`Failed to fire ${sub.name}: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      success: true, 
      firedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error("Broadcast failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
