import { NextResponse } from "next/server";
import WebSocket from "ws";

export const runtime = "nodejs";
export const maxDuration = 15;

const AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream";

interface VesselPosition {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  shipType: string;
}

export async function GET() {
  const apiKey = process.env.AISSTREAM_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      time: new Date().toISOString(),
      count: 0,
      source: "unavailable",
      vessels: [],
      note: "Set AISSTREAM_API_KEY in environment for live vessel data. Get a free key at https://aisstream.io",
    });
  }

  try {
    const vessels = await collectVessels(apiKey, 4000, 300);

    return NextResponse.json({
      time: new Date().toISOString(),
      count: vessels.length,
      source: "aisstream",
      vessels,
    });
  } catch {
    return NextResponse.json({
      time: new Date().toISOString(),
      count: 0,
      source: "unavailable",
      vessels: [],
      note: "AISstream connection failed. Using synthetic data as fallback.",
    });
  }
}

function collectVessels(
  apiKey: string,
  durationMs: number,
  maxVessels: number
): Promise<VesselPosition[]> {
  return new Promise((resolve, reject) => {
    const vesselMap = new Map<string, VesselPosition>();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      try { ws.close(); } catch {}
      resolve(Array.from(vesselMap.values()));
    };

    const ws = new WebSocket(AISSTREAM_URL);

    const timeout = setTimeout(finish, durationMs);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: [[[-90, -180], [90, 180]]],
          FilterMessageTypes: ["PositionReport"],
        })
      );
    });

    ws.on("message", (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.MessageType !== "PositionReport") return;

        const pos = msg.Message?.PositionReport;
        const meta = msg.MetaData;
        if (!pos || !meta) return;

        const lat = meta.latitude ?? pos.Latitude;
        const lon = meta.longitude ?? pos.Longitude;
        if (lat == null || lon == null) return;

        const mmsi = String(meta.MMSI ?? pos.UserID ?? "");
        if (!mmsi) return;

        vesselMap.set(mmsi, {
          mmsi,
          name: meta.ShipName?.trim() || "Unknown",
          lat,
          lon,
          speed: pos.Sog ?? 0,
          heading: pos.TrueHeading !== 511 ? pos.TrueHeading : pos.Cog ?? 0,
          shipType: mapNavStatus(pos.NavigationalStatus),
        });

        if (vesselMap.size >= maxVessels) {
          finish();
        }
      } catch {
        // Skip malformed messages
      }
    });

    ws.on("error", () => {
      clearTimeout(timeout);
      if (!settled) {
        settled = true;
        if (vesselMap.size > 0) {
          resolve(Array.from(vesselMap.values()));
        } else {
          reject(new Error("AISstream connection error"));
        }
      }
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      finish();
    });
  });
}

function mapNavStatus(status: number | undefined): string {
  switch (status) {
    case 0: return "cargo";
    case 1: return "anchor";
    case 2: return "not-commanding";
    case 3: return "restricted";
    case 5: return "moored";
    case 7: return "fishing";
    case 8: return "sailing";
    default: return "cargo";
  }
}
