import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 60; // cache for 1 minute

const USGS_FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";

export interface SeismicEvent {
  id: string;
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depth: number;
  tsunami: boolean;
  alert: string | null;
  sig: number;
}

export async function GET() {
  try {
    const res = await fetch(USGS_FEED, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "SituationalMap/1.0" },
    });

    if (!res.ok) {
      return NextResponse.json({
        time: new Date().toISOString(),
        count: 0,
        source: "unavailable",
        events: [],
      });
    }

    const data = await res.json();
    const features: unknown[] = data.features || [];

    const events: SeismicEvent[] = features
      .filter(
        (f: any) =>
          f.geometry?.coordinates?.[0] != null &&
          f.geometry?.coordinates?.[1] != null
      )
      .slice(0, 200)
      .map((f: any) => ({
        id: f.id ?? f.properties?.code ?? "",
        mag: f.properties?.mag ?? 0,
        place: f.properties?.place ?? "Unknown",
        time: f.properties?.time ?? 0,
        lon: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
        depth: f.geometry.coordinates[2] ?? 0,
        tsunami: f.properties?.tsunami === 1,
        alert: f.properties?.alert ?? null,
        sig: f.properties?.sig ?? 0,
      }));

    return NextResponse.json({
      time: new Date().toISOString(),
      count: events.length,
      source: "usgs",
      events,
    });
  } catch {
    return NextResponse.json({
      time: new Date().toISOString(),
      count: 0,
      source: "unavailable",
      events: [],
    });
  }
}
