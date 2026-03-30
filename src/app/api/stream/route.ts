import { NextRequest } from "next/server";

export const runtime = "edge";

// Server-Sent Events stream for real-time track updates
// Polls OpenSky every 15s and pushes diffs to connected clients

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Send initial heartbeat
      send("connected", { time: new Date().toISOString(), status: "streaming" });

      let iteration = 0;

      const poll = async () => {
        try {
          // Fetch aircraft from OpenSky
          const aircraftRes = await fetch(
            "https://opensky-network.org/api/states/all",
            {
              signal: AbortSignal.timeout(10000),
              headers: { "User-Agent": "SituationalMap/1.0" },
            }
          );

          if (aircraftRes.ok) {
            const data = await aircraftRes.json();
            const states = (data.states || [])
              .filter(
                (s: unknown[]) => s[5] != null && s[6] != null && !s[8]
              )
              .slice(0, 300)
              .map((s: unknown[]) => ({
                id: ((s[1] as string)?.trim() || s[0]) as string,
                type: "aircraft",
                operator: s[2] as string,
                lon: s[5] as number,
                lat: s[6] as number,
                altitude: s[7] ? Math.round((s[7] as number) * 3.281) : 0,
                speed: s[9] ? Math.round((s[9] as number) * 1.944) : 0,
                heading: (s[10] as number) ?? 0,
                military: false,
                category: "commercial",
                isLive: true,
              }));

            send("aircraft", {
              time: data.time,
              count: states.length,
              tracks: states,
            });
          }

          // Every 4th iteration, also send satellite positions
          if (iteration % 4 === 0) {
            send("heartbeat", {
              time: new Date().toISOString(),
              iteration,
              nextSatUpdate: 4 - (iteration % 4),
            });
          }

          iteration++;
        } catch {
          send("error", {
            time: new Date().toISOString(),
            message: "Upstream fetch failed, retrying next cycle",
          });
        }
      };

      // Initial fetch
      await poll();

      // Poll every 15 seconds
      const interval = setInterval(poll, 15000);

      // Clean up on client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
