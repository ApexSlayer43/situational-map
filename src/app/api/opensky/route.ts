import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

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

// Key regions to fetch — smaller bounding boxes are more reliable than global
const REGIONS = [
  { name: "us", lamin: 24, lamax: 50, lomin: -130, lomax: -65 },
  { name: "europe", lamin: 35, lamax: 60, lomin: -10, lomax: 40 },
  { name: "gulf", lamin: 20, lamax: 35, lomin: 40, lomax: 65 },
  { name: "eastasia", lamin: 20, lamax: 45, lomin: 100, lomax: 145 },
];

async function fetchRegion(
  region: { lamin: number; lamax: number; lomin: number; lomax: number },
  headers: Record<string, string>
): Promise<unknown[]> {
  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${region.lamin}&lamax=${region.lamax}&lomin=${region.lomin}&lomax=${region.lomax}`;
    const res = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.states || [];
  } catch {
    return [];
  }
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

    // Try global first, fall back to regional if rate-limited
    let rawStates: unknown[][] = [];

    const globalRes = await fetchRegion(
      { lamin: -90, lamax: 90, lomin: -180, lomax: 180 },
      headers
    );

    if (globalRes.length > 0) {
      rawStates = globalRes as unknown[][];
    } else {
      // Global failed — try regions sequentially with small delays
      for (const region of REGIONS) {
        const regionStates = await fetchRegion(region, headers);
        rawStates.push(...(regionStates as unknown[][]));
        // Small delay between requests to avoid rate limit
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    // Deduplicate by icao24
    const seen = new Set<string>();
    const allStates: OpenSkyState[] = [];

    for (const s of rawStates) {
      if (!s || s[5] == null || s[6] == null || s[8]) continue;
      const icao24 = s[0] as string;
      if (seen.has(icao24)) continue;
      seen.add(icao24);
      allStates.push({
        icao24,
        callsign: (s[1] as string)?.trim() || null,
        origin_country: s[2] as string,
        longitude: s[5] as number,
        latitude: s[6] as number,
        baro_altitude: s[7] as number | null,
        velocity: s[9] as number | null,
        true_track: s[10] as number | null,
        on_ground: s[8] as boolean,
        category: (s[17] as number) ?? 0,
      });
    }

    // Cap at 500
    const states = allStates.slice(0, 500);

    return NextResponse.json({
      time: Math.floor(Date.now() / 1000),
      count: states.length,
      states,
    });
  } catch (err) {
    console.error("OpenSky error:", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: "Failed to fetch from OpenSky", states: [] },
      { status: 502 }
    );
  }
}
