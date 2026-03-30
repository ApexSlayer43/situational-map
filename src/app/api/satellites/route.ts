import { NextResponse } from "next/server";
import {
  twoline2satrec,
  propagate,
  gstime,
  eciToGeodetic,
  degreesLong,
  degreesLat,
} from "satellite.js";

export const runtime = "edge";

const CELESTRAK_URL =
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=tle";

const CURATED_GROUPS = [
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=starlink&FORMAT=tle",
  "https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle",
];

interface SatPosition {
  name: string;
  noradId: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
}

function parseTLE(raw: string): { name: string; line1: string; line2: string }[] {
  const lines = raw.trim().split("\n").map((l) => l.trim());
  const results: { name: string; line1: string; line2: string }[] = [];

  for (let i = 0; i < lines.length - 2; i++) {
    if (lines[i + 1]?.startsWith("1 ") && lines[i + 2]?.startsWith("2 ")) {
      results.push({
        name: lines[i].replace(/^0 /, ""),
        line1: lines[i + 1],
        line2: lines[i + 2],
      });
      i += 2;
    }
  }
  return results;
}

function propagateSatellite(
  name: string,
  line1: string,
  line2: string,
  now: Date
): SatPosition | null {
  try {
    const satrec = twoline2satrec(line1, line2);
    const positionAndVelocity = propagate(satrec, now);

    if (
      typeof positionAndVelocity.position === "boolean" ||
      !positionAndVelocity.position
    ) {
      return null;
    }

    const gmst = gstime(now);
    const geo = eciToGeodetic(positionAndVelocity.position, gmst);
    const vel = positionAndVelocity.velocity;
    let speed = 0;
    if (vel && typeof vel !== "boolean") {
      speed = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
    }

    const noradId = line1.substring(2, 7).trim();

    return {
      name,
      noradId,
      lat: degreesLat(geo.latitude),
      lon: degreesLong(geo.longitude),
      altitude: geo.height,
      velocity: Math.round(speed * 3600) / 1000, // km/s → km/h / 1000 for display
    };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Fetch curated satellite groups (stations + starlink subset + visual)
    const responses = await Promise.allSettled(
      CURATED_GROUPS.map((url) =>
        fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "SituationalMap/1.0" },
        }).then((r) => r.text())
      )
    );

    let allTLEs: { name: string; line1: string; line2: string }[] = [];
    for (const res of responses) {
      if (res.status === "fulfilled") {
        allTLEs.push(...parseTLE(res.value));
      }
    }

    // Deduplicate by NORAD ID and cap at 200
    const seen = new Set<string>();
    const unique = allTLEs.filter((tle) => {
      const id = tle.line1.substring(2, 7).trim();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const capped = unique.slice(0, 200);
    const now = new Date();

    const positions = capped
      .map((tle) => propagateSatellite(tle.name, tle.line1, tle.line2, now))
      .filter((p): p is SatPosition => p !== null);

    return NextResponse.json({
      time: now.toISOString(),
      count: positions.length,
      satellites: positions,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch satellite data", satellites: [] },
      { status: 502 }
    );
  }
}
