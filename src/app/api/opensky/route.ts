import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 10;

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lamin = searchParams.get("lamin") ?? "-90";
  const lamax = searchParams.get("lamax") ?? "90";
  const lomin = searchParams.get("lomin") ?? "-180";
  const lomax = searchParams.get("lomax") ?? "180";

  try {
    const url = `https://opensky-network.org/api/states/all?lamin=${lamin}&lamax=${lamax}&lomin=${lomin}&lomax=${lomax}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "SituationalMap/1.0",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `OpenSky returned ${res.status}`, states: [] },
        { status: res.status }
      );
    }

    const data = await res.json();

    const states: OpenSkyState[] = (data.states || [])
      .filter(
        (s: unknown[]) =>
          s[5] != null && s[6] != null && !s[8] // has coords and is airborne
      )
      .slice(0, 500) // cap to avoid payload bloat
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
    return NextResponse.json(
      { error: "Failed to fetch from OpenSky", states: [] },
      { status: 502 }
    );
  }
}
