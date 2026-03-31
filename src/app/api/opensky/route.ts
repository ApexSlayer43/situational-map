import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  longitude: number | null;
  latitude: number | null;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
  on_ground: boolean;
  category: number;
}

export async function GET() {
  try {
    const headers: Record<string, string> = {
      "User-Agent": "SituationalMap/1.0",
    };

    if (process.env.OPENSKY_USERNAME && process.env.OPENSKY_PASSWORD) {
      headers["Authorization"] =
        "Basic " +
        Buffer.from(
          `${process.env.OPENSKY_USERNAME}:${process.env.OPENSKY_PASSWORD}`
        ).toString("base64");
    }

    // Single global request — authenticated users get higher limits
    const url = "https://opensky-network.org/api/states/all";
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("OpenSky returned", res.status);
      return NextResponse.json({ time: 0, count: 0, states: [] });
    }

    const data = await res.json();

    const states: OpenSkyState[] = (data.states || [])
      .filter(
        (s: unknown[]) =>
          s[5] != null && s[6] != null && !s[8]
      )
      .slice(0, 500)
      .map((s: unknown[]) => ({
        icao24: s[0] as string,
        callsign: (s[1] as string)?.trim() || null,
        origin_country: s[2] as string,
        longitude: s[5] as number,
        latitude: s[6] as number,
        baro_altitude: s[7] as number | null,
        velocity: s[9] as number | null,
        true_track: s[10] as number | null,
        on_ground: s[8] as boolean,
        category: (s[17] as number) ?? 0,
      }));

    return NextResponse.json({
      time: data.time,
      count: states.length,
      states,
    });
  } catch (err) {
    console.error("OpenSky error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ time: 0, count: 0, states: [] });
  }
}
