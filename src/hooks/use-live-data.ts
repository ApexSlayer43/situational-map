"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Track } from "@/types";

interface OpenSkyState {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  longitude: number;
  latitude: number;
  baro_altitude: number | null;
  velocity: number | null;
  true_track: number | null;
  on_ground: boolean;
}

interface SatellitePos {
  name: string;
  noradId: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
}

interface VesselPos {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  speed: number;
  heading: number;
  shipType: string;
}

function openskyToTrack(s: OpenSkyState): Track {
  return {
    id: s.callsign?.trim() || s.icao24,
    type: "aircraft",
    category: "commercial",
    operator: s.origin_country,
    military: false,
    lon: s.longitude,
    lat: s.latitude,
    heading: s.true_track ?? 0,
    speed: s.velocity ? Math.round(s.velocity * 1.944) : 0, // m/s → knots
    altitude: s.baro_altitude ? Math.round(s.baro_altitude * 3.281) : 0, // m → ft
    isLive: true,
  };
}

function satelliteToTrack(s: SatellitePos): Track {
  return {
    id: `SAT-${s.noradId}`,
    type: "satellite",
    category: "commercial",
    operator: s.name,
    military: false,
    lon: s.lon,
    lat: s.lat,
    heading: 0,
    speed: Math.round(s.velocity),
    altitude: Math.round(s.altitude),
    isLive: true,
  };
}

function vesselToTrack(v: VesselPos): Track {
  return {
    id: `V-${v.mmsi}`,
    type: "vessel",
    category: "commercial",
    operator: v.name,
    military: false,
    lon: v.lon,
    lat: v.lat,
    heading: v.heading,
    speed: v.speed,
    altitude: 0,
    isLive: true,
  };
}

export interface LiveDataState {
  aircraft: Track[];
  satellites: Track[];
  vessels: Track[];
  errors: string[];
  lastFetch: Date | null;
  loading: boolean;
}

export function useLiveData(enabled: boolean, intervalMs: number = 20000) {
  const [state, setState] = useState<LiveDataState>({
    aircraft: [],
    satellites: [],
    vessels: [],
    errors: [],
    lastFetch: null,
    loading: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchAll = useCallback(async () => {
    if (!enabled) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({ ...prev, loading: true, errors: [] }));

    const errors: string[] = [];

    // Fetch all three in parallel
    const [aircraftRes, satelliteRes, vesselRes] = await Promise.allSettled([
      fetch("/api/opensky", { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => (data.states || []).map(openskyToTrack)),
      fetch("/api/satellites", { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => (data.satellites || []).map(satelliteToTrack)),
      fetch("/api/vessels", { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => (data.vessels || []).map(vesselToTrack)),
    ]);

    const aircraft =
      aircraftRes.status === "fulfilled" ? aircraftRes.value : [];
    if (aircraftRes.status === "rejected")
      errors.push("Aircraft data unavailable");

    const satellites =
      satelliteRes.status === "fulfilled" ? satelliteRes.value : [];
    if (satelliteRes.status === "rejected")
      errors.push("Satellite data unavailable");

    const vessels =
      vesselRes.status === "fulfilled" ? vesselRes.value : [];
    if (vesselRes.status === "rejected")
      errors.push("Vessel data unavailable");

    if (!controller.signal.aborted) {
      setState({
        aircraft,
        satellites,
        vessels,
        errors,
        lastFetch: new Date(),
        loading: false,
      });
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    fetchAll();
    const timer = setInterval(fetchAll, intervalMs);
    return () => {
      clearInterval(timer);
      abortRef.current?.abort();
    };
  }, [enabled, intervalMs, fetchAll]);

  return state;
}
