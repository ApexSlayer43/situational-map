// ── Core domain types ──

export interface Coordinates {
  lon: number;
  lat: number;
}

export interface Airport extends Coordinates {
  code: string;
  city: string;
  country: string;
}

export interface Port extends Coordinates {
  code: string;
  city: string;
  country: string;
}

export interface RegionPreset extends Coordinates {
  key: string;
  name: string;
  scale: number;
}

export interface GlobeView {
  key?: string;
  name?: string;
  lon: number;
  lat: number;
  scale: number;
}

export type TrackType = "aircraft" | "vessel" | "satellite";
export type TrackCategory = "commercial" | "military" | "civil";

export interface Track {
  id: string;
  type: TrackType;
  category: TrackCategory;
  operator: string;
  military: boolean;
  lon: number;
  lat: number;
  heading: number;
  speed: number;
  altitude: number;
  // Route-based tracks
  origin?: string;
  dest?: string;
  fromLon?: number;
  fromLat?: number;
  toLon?: number;
  toLat?: number;
  progress?: number;
  delta?: number;
  // Satellite-specific
  lonBase?: number;
  phase?: number;
  inclination?: number;
  drift?: number;
  // Live data flag
  isLive?: boolean;
}

export interface AirRoute {
  operator: string;
  from: string;
  to: string;
  category: TrackCategory;
  count: number;
}

export interface SeaLane {
  operator: string;
  from: string;
  to: string;
  category: TrackCategory;
  count: number;
}

export interface SatelliteGroup {
  operator: string;
  name: string;
  category: TrackCategory;
  count: number;
  inclination: number;
  altitude: number;
  drift: number;
}

export interface NoFlyZone {
  name: string;
  west: number;
  south: number;
  east: number;
  north: number;
  kind: "high" | "medium";
}

export interface TrafficZone {
  name: string;
  lon: number;
  lat: number;
  radius: number;
}

export interface TimelineEvent {
  t: number;
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  region: string;
}

export interface CameraFeed {
  name: string;
  city: string;
  note: string;
}

export interface LiveFeedEntry {
  id: string;
  ts: Date;
  level: "info" | "warning";
  title: string;
  detail: string;
}

export interface CountryLabel extends Coordinates {
  name: string;
}

export interface CityLabel extends Coordinates {
  name: string;
  tier: 1 | 2;
}

export interface UIState {
  labels: boolean;
  trails: boolean;
  traffic: boolean;
  mode: "standard" | "night" | "thermal" | "traffic";
}

export type TrackHistory = Record<string, [number, number][]>;
