import { geoInterpolate } from "d3-geo";
import type { Track, TrackCategory } from "@/types";
import { AIRPORTS, PORTS, AIR_ROUTES, SEA_LANES, SATELLITE_GROUPS } from "./constants";

export function normalizeLon(lon: number): number {
  let out = lon;
  while (out > 180) out -= 360;
  while (out < -180) out += 360;
  return out;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function seededUnit(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

interface RouteInput {
  operator: string;
  from: string;
  to: string;
  category: TrackCategory;
  count: number;
}

export function createRouteTrack(kind: "aircraft" | "vessel", route: RouteInput, index: number): Track {
  const origin = kind === "aircraft" ? AIRPORTS[route.from] : PORTS[route.from];
  const dest = kind === "aircraft" ? AIRPORTS[route.to] : PORTS[route.to];
  const seed = seededUnit(`${kind}-${route.operator}-${route.from}-${route.to}-${index}`);
  const phase = seededUnit(`phase-${kind}-${route.from}-${route.to}-${index}`);
  const interp = geoInterpolate([origin.lon, origin.lat], [dest.lon, dest.lat]);
  const here = interp(phase);
  const ahead = interp(Math.min(0.999, phase + 0.02));
  const heading = ((Math.atan2(ahead[0] - here[0], ahead[1] - here[1]) * 180) / Math.PI + 360) % 360;
  const idPrefix =
    kind === "aircraft"
      ? route.operator.replace(/[^A-Z]/gi, "").slice(0, 3).toUpperCase()
      : route.operator.replace(/[^A-Z]/gi, "").slice(0, 4).toUpperCase();

  return {
    id: `${idPrefix}${100 + index}`,
    type: kind,
    category: route.category,
    operator: route.operator,
    military: route.category === "military",
    origin: route.from,
    dest: route.to,
    fromLon: origin.lon,
    fromLat: origin.lat,
    toLon: dest.lon,
    toLat: dest.lat,
    progress: phase,
    delta: (kind === "aircraft" ? 0.0025 : 0.00065) + seed * (kind === "aircraft" ? 0.0045 : 0.0012),
    lon: here[0],
    lat: here[1],
    heading,
    speed: kind === "aircraft" ? Math.round(410 + seed * 110) : Math.round(12 + seed * 18),
    altitude: kind === "aircraft" ? Math.round(28000 + seed * 13000) : 0,
  };
}

export function createSatelliteTrack(group: typeof SATELLITE_GROUPS[number], index: number): Track {
  const seed = seededUnit(`${group.name}-${index}`);
  const phase = seed * Math.PI * 2;

  return {
    id: `${group.name}-${String(index + 1).padStart(2, "0")}`,
    type: "satellite",
    category: group.category,
    operator: group.operator,
    military: group.category === "military",
    lonBase: -180 + seed * 360,
    phase,
    inclination: group.inclination,
    drift: group.drift * (seed > 0.5 ? 1 : -1),
    delta: 0.02 + seed * 0.018,
    lon: normalizeLon(-180 + seed * 360),
    lat: Math.sin(phase) * Math.min(group.inclination, 80),
    heading: seed * 360,
    altitude: group.altitude,
    speed: 26500 + Math.round(seed * 1800),
  };
}

export function buildInitialTracks(): Track[] {
  const aircraft = AIR_ROUTES.flatMap((route, routeIndex) =>
    Array.from({ length: route.count }, (_, i) => createRouteTrack("aircraft", route, routeIndex * 10 + i))
  );
  const vessels = SEA_LANES.flatMap((route, routeIndex) =>
    Array.from({ length: route.count }, (_, i) => createRouteTrack("vessel", route, routeIndex * 10 + i))
  );
  const satellites = SATELLITE_GROUPS.flatMap((group) =>
    Array.from({ length: group.count }, (_, i) => createSatelliteTrack(group, i))
  );
  return [...aircraft, ...vessels, ...satellites];
}

export function stepTrack(track: Track, frame: number): Track {
  if (track.type === "satellite") {
    const nextPhase = (track.phase ?? 0) + (track.delta ?? 0.02);
    return {
      ...track,
      phase: nextPhase,
      lat: Math.sin(nextPhase) * Math.min(track.inclination ?? 53, 80),
      lon: normalizeLon((track.lonBase ?? 0) + nextPhase * (track.drift ?? 1) * 22),
      heading: normalizeLon((track.heading || 0) + (track.drift ?? 1) * 3),
    };
  }

  const nextProgress = ((track.progress ?? 0) + (track.delta ?? 0.003)) % 1;
  const interp = geoInterpolate(
    [track.fromLon ?? 0, track.fromLat ?? 0],
    [track.toLon ?? 0, track.toLat ?? 0]
  );
  const here = interp(nextProgress);
  const ahead = interp(Math.min(0.999, nextProgress + 0.01));
  const heading = ((Math.atan2(ahead[0] - here[0], ahead[1] - here[1]) * 180) / Math.PI + 360) % 360;

  return {
    ...track,
    progress: nextProgress,
    lon: normalizeLon(here[0]),
    lat: clamp(here[1], -82, 82),
    heading,
    altitude:
      track.type === "aircraft"
        ? clamp((track.altitude || 34000) + Math.sin(frame * 0.15 + nextProgress * 6) * 40, 25000, 43000)
        : 0,
    speed:
      track.type === "aircraft"
        ? clamp((track.speed || 450) + Math.sin(frame * 0.08 + nextProgress * 8), 360, 620)
        : clamp((track.speed || 18) + Math.sin(frame * 0.03 + nextProgress * 10) * 0.2, 8, 34),
  };
}

export function validateSeed(seed: Track[]): string[] {
  const ids = new Set<string>();
  const errors: string[] = [];
  seed.forEach((track) => {
    if (ids.has(track.id)) errors.push(`Duplicate track id: ${track.id}`);
    ids.add(track.id);
    if (!["aircraft", "vessel", "satellite"].includes(track.type)) errors.push(`Invalid type for ${track.id}`);
    if (typeof track.lon !== "number" || typeof track.lat !== "number") errors.push(`Invalid coordinates for ${track.id}`);
  });
  return errors;
}

export function validateRegionPresets(defs: Record<string, { lon: number; lat: number; scale: number; name: string }>): string[] {
  const errors: string[] = [];
  Object.values(defs).forEach((r) => {
    if (typeof r.lon !== "number" || typeof r.lat !== "number" || typeof r.scale !== "number")
      errors.push(`Invalid region preset: ${r.name}`);
  });
  return errors;
}
