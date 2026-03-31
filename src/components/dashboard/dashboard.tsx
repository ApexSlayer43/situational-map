"use client";

import { useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Search,
  Layers,
  AlertTriangle,
  Camera,
  Eye,
  Activity,
} from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { useEventStream } from "@/hooks/use-event-stream";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { Track, GlobeView, UIState, TrackHistory, LiveFeedEntry } from "@/types";
import { REGION_PRESETS, EVENTS, CAMERAS } from "@/lib/data/constants";
import { clamp } from "@/lib/data/tracks";
import { formatClock } from "@/lib/data/feed";
import { badgeTone } from "@/lib/data/styles";
import { GlobeSurface } from "./globe-surface";
import { RegistryRow } from "./registry-row";
import { AnalystPanel } from "./ai/analyst-panel";
import dynamic from "next/dynamic";

const Globe3D = dynamic(() => import("./globe-3d").then((m) => ({ default: m.Globe3D })), {
  ssr: false,
  loading: () => (
    <div className="flex h-[50vh] min-h-[380px] items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
        <p className="text-zinc-400 text-sm">Loading 3D globe...</p>
      </div>
    </div>
  ),
});

const TrafficMap = dynamic(() => import("./traffic-map").then((m) => ({ default: m.TrafficMap })), {
  ssr: false,
  loading: () => null,
});

export default function Dashboard() {
  const [selected, setSelected] = useState<Track | null>(null);
  const [history, setHistory] = useState<TrackHistory>({});
  const [regionKey, setRegionKey] = useState("global");
  const [view, setView] = useState<GlobeView>(REGION_PRESETS.global);
  const [globeMode, setGlobeMode] = useState<"2d" | "3d">("2d");
  const [ui, setUi] = useState<UIState>({
    labels: true,
    trails: true,
    traffic: true,
    mode: "standard",
  });
  const [query, setQuery] = useState("");
  const [onlyMilitary, setOnlyMilitary] = useState(false);
  const [hideCommercial, setHideCommercial] = useState(false);
  const [showTypes, setShowTypes] = useState({
    aircraft: true,
    vessel: true,
    satellite: true,
    seismic: true,
  });
  const [liveFeed, setLiveFeed] = useState<LiveFeedEntry[]>([
    {
      id: "boot-0",
      ts: new Date(),
      level: "info",
      title: "System online",
      detail: "Connecting to live data sources...",
    },
  ]);

  // Always fetch live data
  const liveData = useLiveData(true, 20000);

  // SSE stream for real-time aircraft updates
  const stream = useEventStream(true);

  // All tracks from live sources
  const allTracks = useMemo(() => {
    const live = [...liveData.aircraft, ...liveData.satellites, ...liveData.vessels, ...liveData.seismic];
    return live;
  }, [liveData.aircraft, liveData.satellites, liveData.vessels, liveData.seismic]);

  // Update history when tracks change
  useMemo(() => {
    const newHistory: TrackHistory = { ...history };
    allTracks.forEach((t) => {
      const arr = [...(newHistory[t.id] || []), [t.lon, t.lat] as [number, number]];
      newHistory[t.id] = arr.slice(-32);
    });
    return newHistory;
  }, [allTracks]);

  // Filter tracks
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTracks.filter((t) => {
      if (!showTypes[t.type]) return false;
      if (onlyMilitary && !t.military) return false;
      if (hideCommercial && t.category === "commercial") return false;
      if (!q) return true;
      return [t.id, t.operator, t.type, t.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [allTracks, query, onlyMilitary, hideCommercial, showTypes]);

  // Merge SSE stream when available
  const finalTracks = useMemo(() => {
    if (stream.connected && stream.tracks.length > 0) {
      const nonAircraft = filtered.filter((t) => t.type !== "aircraft");
      return [...stream.tracks, ...nonAircraft];
    }
    return filtered;
  }, [stream.connected, stream.tracks, filtered]);

  const selectedLive =
    finalTracks.find((t) => t.id === selected?.id) || finalTracks[0];

  const focusSelected = useCallback(() => {
    if (!selectedLive) return;
    setView({
      lon: selectedLive.lon,
      lat: selectedLive.lat,
      scale:
        selectedLive.type === "satellite"
          ? 820
          : selectedLive.type === "aircraft"
            ? 700
            : 620,
    });
  }, [selectedLive]);

  const stats = useMemo(
    () => ({
      aircraft: allTracks.filter((t) => t.type === "aircraft").length,
      vessels: allTracks.filter((t) => t.type === "vessel").length,
      satellites: allTracks.filter((t) => t.type === "satellite").length,
      seismic: allTracks.filter((t) => t.type === "seismic").length,
    }),
    [allTracks]
  );

  const totalTracks = stats.aircraft + stats.vessels + stats.satellites + stats.seismic;

  // Search input ref for keyboard shortcut
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    useMemo(
      () => ({
        onTogglePlay: () => {},
        onReset: () => {},
        onNextTrack: () => {
          const idx = finalTracks.findIndex((t) => t.id === selectedLive?.id);
          if (idx < finalTracks.length - 1) setSelected(finalTracks[idx + 1]);
        },
        onPrevTrack: () => {
          const idx = finalTracks.findIndex((t) => t.id === selectedLive?.id);
          if (idx > 0) setSelected(finalTracks[idx - 1]);
        },
        onZoomIn: () => setView((prev) => ({ ...prev, scale: clamp(prev.scale * 1.15, 180, 1200) })),
        onZoomOut: () => setView((prev) => ({ ...prev, scale: clamp(prev.scale / 1.15, 180, 1200) })),
        onFocusSearch: () => searchRef.current?.focus(),
        onToggleLabels: () => setUi((v) => ({ ...v, labels: !v.labels })),
      }),
      [finalTracks, selectedLive]
    )
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1820px] space-y-6">
        {/* Live status banner */}
        <div className="flex items-center justify-between rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <span className="font-semibold text-emerald-200">LIVE</span>
              <span className="ml-3 text-sm text-zinc-400">
                {liveData.loading
                  ? "Connecting to data sources..."
                  : `${totalTracks} tracks from OpenSky + CelesTrak + AISstream + USGS`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stream.connected && (
              <Badge className="border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                SSE Active
              </Badge>
            )}
            <span className="text-xs text-zinc-500">
              {liveData.lastFetch ? `Updated ${formatClock(liveData.lastFetch)}` : ""}
            </span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_360px]"
        >
          {/* ── LEFT COLUMN: Filters + Registry ── */}
          <div className="space-y-6">
            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5 text-cyan-300" /> Focus
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Real-time global tracking powered by live data feeds.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                  <div>
                    <span className="text-zinc-200">1.</span> Choose a theater from the tabs above the globe.
                  </div>
                  <div>
                    <span className="text-zinc-200">2.</span> Drag and zoom until country labels settle.
                  </div>
                  <div>
                    <span className="text-zinc-200">3.</span> Click a track or use the registry to inspect it.
                  </div>
                </div>
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search track, operator, route… ( / )"
                  className="border-zinc-700 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["aircraft", `Aircraft ${stats.aircraft}`],
                      ["vessel", `Vessels ${stats.vessels}`],
                      ["satellite", `Satellites ${stats.satellites}`],
                      ["seismic", `Seismic ${stats.seismic}`],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setShowTypes((s) => ({ ...s, [key]: !s[key] }))}
                      className={`rounded-xl border px-3 py-2 text-left text-sm ${
                        showTypes[key]
                          ? "border-cyan-400/40 bg-zinc-900 text-zinc-100"
                          : "border-zinc-800 bg-zinc-950 text-zinc-500"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                  <div>
                    <div className="font-medium">Only military</div>
                    <div className="text-xs text-zinc-400">Show military tracks only</div>
                  </div>
                  <Switch checked={onlyMilitary} onCheckedChange={setOnlyMilitary} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                  <div>
                    <div className="font-medium">Hide commercial</div>
                    <div className="text-xs text-zinc-400">Filter out commercial traffic</div>
                  </div>
                  <Switch checked={hideCommercial} onCheckedChange={setHideCommercial} />
                </div>
                {/* Data source status */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                  <div className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Data Sources</div>
                  {[
                    ["OpenSky", stats.aircraft, "Aircraft (ADS-B)"],
                    ["CelesTrak", stats.satellites, "Satellite orbits"],
                    ["AISstream", stats.vessels, "Vessel positions"],
                    ["USGS", stats.seismic, "Seismic events (24h)"],
                  ].map(([source, count, desc]) => (
                    <div key={source as string} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${(count as number) > 0 ? "bg-emerald-400" : "bg-zinc-600"}`} />
                        <span className="text-zinc-400">{source}</span>
                      </div>
                      <span className="text-zinc-500">{count} {desc}</span>
                    </div>
                  ))}
                </div>
                {liveData.errors.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    {liveData.errors.map((err) => (
                      <div key={err}>{err}</div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-violet-300" /> Registry
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Live global fleet from all data sources.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[420px] md:h-[520px] xl:h-[620px] pr-4">
                  <div className="space-y-3">
                    {filtered.length === 0 && (
                      <div className="text-center text-sm text-zinc-500 py-8">
                        {liveData.loading ? "Loading live tracks..." : "No tracks match current filters"}
                      </div>
                    )}
                    {filtered.map((track) => (
                      <RegistryRow
                        key={track.id}
                        track={track}
                        selected={selectedLive}
                        onSelect={setSelected}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* ── CENTER COLUMN: Globe ── */}
          <div className="space-y-6">
            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md shadow-2xl shadow-black/30">
              <CardHeader>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Globe className="h-6 w-6 text-cyan-300" /> Theater Globe
                    </CardTitle>
                    <CardDescription className="mt-2 text-zinc-400">
                      Real-time global situational awareness — live aircraft, vessels, satellites, and seismic activity.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
                      <button
                        onClick={() => setGlobeMode("2d")}
                        className={`px-3 py-1.5 text-xs font-medium transition ${
                          globeMode === "2d"
                            ? "bg-cyan-500/20 text-cyan-200"
                            : "bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        2D
                      </button>
                      <button
                        onClick={() => setGlobeMode("3d")}
                        className={`px-3 py-1.5 text-xs font-medium transition ${
                          globeMode === "3d"
                            ? "bg-cyan-500/20 text-cyan-200"
                            : "bg-zinc-950 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        3D
                      </button>
                    </div>
                    <Badge className="border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                      Live
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {globeMode === "3d" ? (
                  <Globe3D
                    tracks={finalTracks}
                    history={history}
                    selected={selectedLive}
                    onSelect={setSelected}
                    regionKey={regionKey}
                    setRegionKey={setRegionKey}
                    view={view}
                    setView={setView}
                    ui={ui}
                    setUi={setUi}
                    focusSelected={focusSelected}
                  />
                ) : (
                  <GlobeSurface
                    tracks={finalTracks}
                    history={history}
                    selected={selectedLive}
                    onSelect={setSelected}
                    regionKey={regionKey}
                    setRegionKey={setRegionKey}
                    view={view}
                    setView={setView}
                    ui={ui}
                    setUi={setUi}
                    focusSelected={focusSelected}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN: AI + Traffic + Feed + Selected Asset ── */}
          <div className="space-y-6">
            {/* AI Analyst */}
            <AnalystPanel tracks={allTracks} />

            {/* Street Traffic */}
            <TrafficMap
              center={
                regionKey === "usaEast" ? { lat: 40.71, lng: -74.01 } :
                regionKey === "europe" ? { lat: 48.86, lng: 2.35 } :
                regionKey === "gulf" ? { lat: 25.28, lng: 55.30 } :
                regionKey === "eastAsia" ? { lat: 35.68, lng: 139.69 } :
                regionKey === "atlantic" ? { lat: 51.51, lng: -0.13 } :
                { lat: 40.71, lng: -74.01 }
              }
              zoom={regionKey === "global" ? 3 : 12}
            />

            {/* SSE Stream Status */}
            <div className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${
              stream.connected
                ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-200"
                : "border-zinc-800 bg-zinc-950 text-zinc-400"
            }`}>
              <div className={`h-2 w-2 rounded-full ${stream.connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
              <div>
                <span className="font-medium">{stream.connected ? "SSE Stream Active" : "Stream Connecting..."}</span>
                {stream.lastUpdate && (
                  <span className="ml-2 text-xs text-zinc-500">
                    Last: {formatClock(stream.lastUpdate)}
                  </span>
                )}
              </div>
            </div>

            {/* Selected asset detail */}
            {selectedLive && (
              <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="h-5 w-5 text-zinc-300" /> Selected Asset
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-zinc-100">{selectedLive.id}</div>
                        <div className="text-xs text-zinc-400">{selectedLive.operator}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={badgeTone(selectedLive.type, selectedLive.category)}>
                          {selectedLive.category}
                        </Badge>
                        <Badge className="border-zinc-700 bg-zinc-900 text-zinc-100">
                          {selectedLive.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                      <div className="rounded-xl bg-zinc-900 p-3">
                        Lat<br />
                        <span className="text-zinc-200">{selectedLive.lat?.toFixed(2)}</span>
                      </div>
                      <div className="rounded-xl bg-zinc-900 p-3">
                        Lon<br />
                        <span className="text-zinc-200">{selectedLive.lon?.toFixed(2)}</span>
                      </div>
                      <div className="rounded-xl bg-zinc-900 p-3">
                        Heading<br />
                        <span className="text-zinc-200">{Math.round(selectedLive.heading || 0)}&deg;</span>
                      </div>
                      <div className="rounded-xl bg-zinc-900 p-3">
                        {selectedLive.type === "seismic" ? "Magnitude" : "Speed"}<br />
                        <span className="text-zinc-200">
                          {selectedLive.type === "seismic"
                            ? `M${selectedLive.mag?.toFixed(1)}`
                            : Math.round(selectedLive.speed || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-cyan-300" /> Sources
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Live data feeds powering this surface.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["Aircraft", "OpenSky Network ADS-B — real-time global flight tracking."],
                  ["Vessels", "AISstream.io — live maritime AIS positions worldwide."],
                  ["Satellites", "CelesTrak TLE + satellite.js — orbital propagation from NORAD data."],
                  ["Seismic", "USGS GeoJSON feed — M2.5+ earthquakes in the last 24 hours."],
                  ["Traffic", "Google Maps Traffic Layer — real-time road congestion."],
                ].map(([title, note]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                      {title}
                    </div>
                    <div className="mt-2 text-sm text-zinc-300">{note}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Keyboard shortcuts bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-400 backdrop-blur-sm">
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> Cycle tracks</span>
          <span><kbd className="kbd">+</kbd><kbd className="kbd">-</kbd> Zoom</span>
          <span><kbd className="kbd">/</kbd> Search</span>
          <span><kbd className="kbd">L</kbd> Labels</span>
        </div>
      </div>
    </div>
  );
}
