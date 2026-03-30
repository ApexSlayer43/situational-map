import { NextResponse } from "next/server";

export const runtime = "edge";

// AIS data from a public aggregator endpoint
// For production, use aisstream.io WebSocket client-side with an API key
// This endpoint provides a cached snapshot for the server-side fallback

const BARENTSWATCH_URL =
  "https://www.barentswatch.no/bwapi/v2/geodata/ais/openpositions?Xmin=-180&Xmax=180&Ymin=-90&Ymax=90";

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
  try {
    // Try the free BarentsWatch open AIS positions (covers Norwegian waters + global)
    const res = await fetch(BARENTSWATCH_URL, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        "User-Agent": "SituationalMap/1.0",
      },
    });

    if (!res.ok) {
      // Fallback: return empty with status note
      return NextResponse.json({
        time: new Date().toISOString(),
        count: 0,
        source: "unavailable",
        vessels: [],
        note: "Free AIS APIs require authentication or WebSocket. Configure AISSTREAM_API_KEY in .env for real vessel data.",
      });
    }

    const data = await res.json();
    const features = Array.isArray(data) ? data : data.features || [];

    const vessels: VesselPosition[] = features
      .filter(
        (f: any) =>
          f.geometry?.coordinates?.[0] != null &&
          f.geometry?.coordinates?.[1] != null
      )
      .slice(0, 300)
      .map((f: any) => ({
        mmsi: String(f.properties?.mmsi ?? f.mmsi ?? ""),
        name: f.properties?.name ?? f.name ?? "Unknown",
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        speed: f.properties?.sog ?? f.sog ?? 0,
        heading: f.properties?.cog ?? f.cog ?? 0,
        shipType: f.properties?.shipType ?? "cargo",
      }));

    return NextResponse.json({
      time: new Date().toISOString(),
      count: vessels.length,
      source: "barentswatch",
      vessels,
    });
  } catch {
    return NextResponse.json({
      time: new Date().toISOString(),
      count: 0,
      source: "unavailable",
      vessels: [],
      note: "Vessel API unavailable. Using synthetic data as fallback.",
    });
  }
}
