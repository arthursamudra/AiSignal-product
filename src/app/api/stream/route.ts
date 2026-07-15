import fs from 'fs';
import path from 'path';

const EVENTS_FILE = path.join(process.cwd(), 'data', 'events.json');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  let lastSeenId = '';

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Connection Established' })}\n\n`);

      const interval = setInterval(() => {
        try {
          if (fs.existsSync(EVENTS_FILE)) {
            const events = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
            if (events.length > 0) {
              const latestEvent = events[events.length - 1];
              if (latestEvent.id !== lastSeenId) {
                lastSeenId = latestEvent.id;
                // SSE format requires `data: {json}\n\n`
                controller.enqueue(`data: ${JSON.stringify(latestEvent)}\n\n`);
              }
            }
          }
        } catch (err) {
          console.error("Error reading events:", err);
        }
      }, 500); // Check every 500ms

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
