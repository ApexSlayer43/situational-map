"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Search,
  Play,
  Pause,
  RotateCcw,
  Layers,
  AlertTriangle,
  Camera,
  Eye,
  Activity,
  Radio,
} from "lucide-react";
import { useLiveData } from "@/hooks/use-live-data";
import { useEventStream } from "@/hooks/use-event-stream";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { Track, GlobeView, UIState, TrackHistory, LiveFeedEntry } from "@/types";
import { REGION_PRESETS, EVENTS, CAMERAS, HISTORY_STEPS } from "@/lib/data/constants";
import {
  buildInitialTracks,
  stepTrack,
  validateSeed,
  validateRegionPresets,
  clamp,
} from "@/lib/data/tracks";
import { formatClock, buildLiveEntries } from "@/lib/data/feed";
import { badgeTone } from "@/lib/data/styles";
import { GlobeSurface } from "./globe-surface";
import { RegistryRow } from "./registry-row";
import { AnalystPanel } from "./ai/analyst-panel";

const TRACKS_SEED = buildInitialTracks();

export default function Dashboard() {
  const [tracks, setTracks] = useState<Track[]>(TRACKS_SEED);
  const [history, setHistory] = useState<TrackHistory>(
    Object.fromEntries(TRACKS_SEED.map((t) => [t.id, [[t.lon, t.lat]] as [number, number][]]))
  );
  const [selected, setSelected] = useState<Track | null>(TRACKS_SEED[0]);
  const [playing, setPlaying] = useState(true);
  const [liveMode, setLiveMode] = useState(true);
  const frameRef = useRef(0);
  const [timeline, setTimeline] = useState([56]);
  const [regionKey, setRegionKey] = useState("global");
  const [view, setView] = useState<GlobeView>(REGION_PRESETS.global);
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
  });
  const [refreshMs, setRefreshMs] = useState([1200]);
  const [useRealData, setUseRealData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [liveFeed, setLiveFeed] = useState<LiveFeedEntry[]>([
    {
      id: "boot-0",
      ts: new Date(),
      level: "info",
      title: "Live feed ready",
      detail: "Synthetic global watch surface online.",
    },
  ]);

  // Real data from APIs
  const liveData = useLiveData(useRealData, 20000);

  // Merge real + synthetic tracks
  const mergedTracks = useMemo(() => {
    if (!useRealData) return tracks;
    const live = [...liveData.aircraft, ...liveData.satellites, ...liveData.vessels];
    if (live.length === 0) return tracks; // fallback to synthetic if no data yet
    return [...live, ...tracks.filter((t) => !t.isLive)];
  }, [useRealData, tracks, liveData.aircraft, liveData.satellites, liveData.vessels]);

  const validationErrors = useMemo(
    () => [...validateSeed(TRACKS_SEED), ...validateRegionPresets(REGION_PRESETS)],
    []
  );

  // Stable ref for selected ID to avoid stale closures in interval
  const selectedIdRef = useRef(selected?.id);
  selectedIdRef.current = selected?.id;

  useEffect(() => {
    if (!playing || !liveMode) return;
    const timer = setInterval(() => {
      frameRef.current += 1;
      const currentFrame = frameRef.current;

      setTracks((prev) => {
        const next = prev.map((t) => stepTrack(t, currentFrame));
        setHistory((old) => {
          const copy = { ...old };
          next.forEach((t) => {
            const arr = [...(copy[t.id] || []), [t.lon, t.lat] as [number, number]];
            copy[t.id] = arr.slice(-HISTORY_STEPS);
          });
          return copy;
        });
        setLastUpdated(new Date());
        setLiveFeed((old) => {
          const entries = buildLiveEntries(next, currentFrame, selectedIdRef.current);
          return [...entries, ...old].slice(0, 24);
        });
        return next;
      });
    }, refreshMs[0]);
    return () => clearInterval(timer);
  }, [playing, liveMode, refreshMs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return mergedTracks.filter((t) => {
      if (!showTypes[t.type]) return false;
      if (onlyMilitary && !t.military) return false;
      if (hideCommercial && t.category === "commercial") return false;
      if (!q) return true;
      return [t.id, t.operator, t.type, t.category, t.origin, t.dest]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [mergedTracks, query, onlyMilitary, hideCommercial, showTypes]);

  const selectedLive =
    filtered.find((t) => t.id === selected?.id) ||
    tracks.find((t) => t.id === selected?.id) ||
    filtered[0] ||
    tracks[0];

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

  const timelineEvent = useMemo(
    () => [...EVENTS].sort((a, b) => Math.abs(a.t - timeline[0]) - Math.abs(b.t - timeline[0]))[0],
    [timeline]
  );

  const stats = useMemo(
    () => ({
      aircraft: mergedTracks.filter((t) => t.type === "aircraft").length,
      vessels: mergedTracks.filter((t) => t.type === "vessel").length,
      satellites: mergedTracks.filter((t) => t.type === "satellite").length,
    }),
    [mergedTracks]
  );

  const liveStatus = liveMode ? (playing ? "Live" : "Standby") : "Offline";

  const handleReset = useCallback(() => {
    const reset = buildInitialTracks();
    setTracks(reset);
    setHistory(Object.fromEntries(reset.map((t) => [t.id, [[t.lon, t.lat]] as [number, number][]])));
    setSelected(reset[0]);
    setRegionKey("global");
    setView(REGION_PRESETS.global);
    setTimeline([56]);
    frameRef.current = 0;
    setLastUpdated(new Date());
    setLiveFeed([
      {
        id: `boot-${Date.now()}`,
        ts: new Date(),
        level: "info",
        title: "Feed reset",
        detail: "Live stream reset to baseline synthetic state.",
      },
    ]);
  }, []);

  // SSE stream for real-time data
  const stream = useEventStream(useRealData && liveMode);

  // Merge SSE stream tracks when available
  const finalTracks = useMemo(() => {
    if (stream.connected && stream.tracks.length > 0) {
      // SSE stream provides aircraft; keep synthetic vessels + satellites
      const nonAircraft = filtered.filter((t) => t.type !== "aircraft");
      return [...stream.tracks, ...nonAircraft];
    }
    return filtered;
  }, [stream.connected, stream.tracks, filtered]);

  // Search input ref for keyboard shortcut
  const searchRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    useMemo(
      () => ({
        onTogglePlay: () => setPlaying((v) => !v),
        onReset: handleReset,
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
      [finalTracks, selectedLive, handleReset]
    )
  );

  return (
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 md:p-6 lg:p-8">
      <div className="mx-auto max-w-[1820px] space-y-6">
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
                  Synthetic global traffic system inspired by public feed categories, now with a
                  controllable live stream layer.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                  <div>
                    <span className="text-zinc-200">1.</span> Choose a theater from the tabs above
                    the globe.
                  </div>
                  <div>
                    <span className="text-zinc-200">2.</span> Drag and zoom until country labels
                    settle.
                  </div>
                  <div>
                    <span className="text-zinc-200">3.</span> Click a track or use the registry to
                    inspect it.
                  </div>
                </div>
                <Input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search track, operator, route… ( / )"
                  className="border-zinc-700 bg-zinc-950"
                />
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["aircraft", `Aircraft ${stats.aircraft}`],
                      ["vessel", `Vessels ${stats.vessels}`],
                      ["satellite", `Satellites ${stats.satellites}`],
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
                    <div className="text-xs text-zinc-400">Cut the noise fast</div>
                  </div>
                  <Switch checked={onlyMilitary} onCheckedChange={setOnlyMilitary} />
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                  <div>
                    <div className="font-medium">Hide commercial</div>
                    <div className="text-xs text-zinc-400">Remove normal traffic</div>
                  </div>
                  <Switch checked={hideCommercial} onCheckedChange={setHideCommercial} />
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Activity
                        className={`h-4 w-4 ${liveMode ? "text-emerald-300" : "text-zinc-500"}`}
                      />
                      <div>
                        <div className="text-sm font-medium text-zinc-100">Live stream</div>
                        <div className="text-xs text-zinc-400">
                          {liveStatus} &bull; last update {formatClock(lastUpdated)}
                        </div>
                      </div>
                    </div>
                    <Switch checked={liveMode} onCheckedChange={setLiveMode} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Refresh cadence</span>
                      <span>{refreshMs[0]} ms</span>
                    </div>
                    <Slider value={refreshMs} onValueChange={(v) => setRefreshMs(Array.isArray(v) ? [...v] : [v])} min={500} max={3000} step={100} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`h-4 w-4 ${useRealData ? "text-cyan-300" : "text-zinc-500"}`}
                    />
                    <div>
                      <div className="font-medium">Real data</div>
                      <div className="text-xs text-zinc-400">
                        {useRealData
                          ? liveData.loading
                            ? "Fetching..."
                            : `${liveData.aircraft.length} aircraft, ${liveData.satellites.length} sats, ${liveData.vessels.length} vessels`
                          : "OpenSky + CelesTrak + AIS"}
                      </div>
                    </div>
                  </div>
                  <Switch checked={useRealData} onCheckedChange={setUseRealData} />
                </div>
                {liveData.errors.length > 0 && useRealData && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    {liveData.errors.map((err) => (
                      <div key={err}>{err} — using synthetic fallback</div>
                    ))}
                  </div>
                )}
                {validationErrors.length > 0 && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
                    {validationErrors.map((err) => (
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
                  Global fleet, route-by-route.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[420px] md:h-[520px] xl:h-[620px] pr-4">
                  <div className="space-y-3">
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

          {/* ── CENTER COLUMN: Globe + Timeline ── */}
          <div className="space-y-6">
            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md shadow-2xl shadow-black/30">
              <CardHeader>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <Globe className="h-6 w-6 text-cyan-300" /> Theater Globe
                    </CardTitle>
                    <CardDescription className="mt-2 text-zinc-400">
                      More map detail, denser world traffic, stronger labels, and a live operator
                      loop feeding state changes into the dashboard.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={`${
                        liveMode
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400"
                      }`}
                    >
                      {liveStatus}
                    </Badge>
                    <Button
                      variant="outline"
                      className="border-zinc-700 bg-zinc-950 text-zinc-100"
                      onClick={() => setPlaying((v) => !v)}
                    >
                      {playing ? (
                        <Pause className="mr-2 h-4 w-4" />
                      ) : (
                        <Play className="mr-2 h-4 w-4" />
                      )}
                      {playing ? "Pause" : "Play"}
                    </Button>
                    <Button
                      variant="outline"
                      className="border-zinc-700 bg-zinc-950 text-zinc-100"
                      onClick={handleReset}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5 text-zinc-300" /> Event timeline
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Use the globe to understand where, then the timeline to understand when.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-400">Closest event at current time marker</div>
                  <Badge className="border-zinc-700 bg-zinc-900 text-zinc-100">
                    T+ {timeline[0]} min
                  </Badge>
                </div>
                <Slider value={timeline} onValueChange={(v) => setTimeline(Array.isArray(v) ? [...v] : [v])} min={0} max={100} step={1} />
                <div className="grid gap-3 md:grid-cols-4">
                  {EVENTS.map((event) => (
                    <button
                      key={event.t}
                      onClick={() => setTimeline([event.t])}
                      className={`rounded-2xl border p-4 text-left ${
                        timelineEvent.t === event.t
                          ? "border-cyan-400/40 bg-zinc-900"
                          : "border-zinc-800 bg-zinc-950"
                      }`}
                    >
                      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                        T+ {event.t}
                      </div>
                      <div className="mt-1 font-medium text-zinc-100">{event.title}</div>
                      <div className="mt-2 text-xs text-zinc-400">{event.detail}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── RIGHT COLUMN: AI + Live Feed + Narrative + Sources + Alerts/Cameras ── */}
          <div className="space-y-6">
            {/* AI Analyst */}
            <AnalystPanel tracks={finalTracks} />

            {/* SSE Stream Status */}
            {useRealData && (
              <div className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${
                stream.connected
                  ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-200"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}>
                <div className={`h-2 w-2 rounded-full ${stream.connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                <div>
                  <span className="font-medium">{stream.connected ? "SSE Stream Active" : "Stream Disconnected"}</span>
                  {stream.lastUpdate && (
                    <span className="ml-2 text-xs text-zinc-500">
                      Last: {formatClock(stream.lastUpdate)}
                    </span>
                  )}
                </div>
              </div>
            )}

            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5 text-emerald-300" /> Live feed
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Rolling updates generated from the moving global traffic picture.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {liveFeed.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium text-zinc-100">{entry.title}</div>
                          <div className="text-xs text-zinc-400">{formatClock(entry.ts)}</div>
                        </div>
                        <Badge
                          className={
                            entry.level === "warning"
                              ? "border-orange-400/20 bg-orange-500/10 text-orange-200"
                              : "border-zinc-700 bg-zinc-900 text-zinc-100"
                          }
                        >
                          {entry.level}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm text-zinc-300">{entry.detail}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-300" /> Narrative
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  A tighter read of what matters right now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    What changed
                  </div>
                  <div className="mt-2 text-sm text-zinc-200">{timelineEvent?.detail}</div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Region</div>
                  <div className="mt-2 text-sm text-zinc-200">{timelineEvent?.region}</div>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                    Selected asset
                  </div>
                  <div className="mt-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-zinc-100">{selectedLive?.id}</div>
                      <div className="text-xs text-zinc-400">{selectedLive?.operator}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={badgeTone(selectedLive?.type, selectedLive?.category)}>
                        {selectedLive?.category}
                      </Badge>
                      <Badge className="border-zinc-700 bg-zinc-900 text-zinc-100">
                        {selectedLive?.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                    <div className="rounded-xl bg-zinc-900 p-3">
                      Lat
                      <br />
                      <span className="text-zinc-200">{selectedLive?.lat?.toFixed(2)}</span>
                    </div>
                    <div className="rounded-xl bg-zinc-900 p-3">
                      Lon
                      <br />
                      <span className="text-zinc-200">{selectedLive?.lon?.toFixed(2)}</span>
                    </div>
                    <div className="rounded-xl bg-zinc-900 p-3">
                      Heading
                      <br />
                      <span className="text-zinc-200">
                        {Math.round(selectedLive?.heading || 0)}&deg;
                      </span>
                    </div>
                    <div className="rounded-xl bg-zinc-900 p-3">
                      Speed
                      <br />
                      <span className="text-zinc-200">
                        {Math.round(selectedLive?.speed || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="h-5 w-5 text-cyan-300" /> Sources
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  What this surface is actually showing you.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  [
                    "Map layer",
                    "Higher-resolution world geometry with country and city labels.",
                  ],
                  [
                    "Air / sea / orbit",
                    "A synthetic tracking system built from airport corridors, shipping lanes, and satellite constellations.",
                  ],
                  [
                    "Public cameras",
                    "Traffic and transit only, not person-level insight.",
                  ],
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

            <Tabs defaultValue="alerts">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900/60">
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
                <TabsTrigger value="cameras">Cameras</TabsTrigger>
              </TabsList>
              <TabsContent value="alerts">
                <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
                  <CardContent className="space-y-3 p-6">
                    {EVENTS.map((event) => (
                      <div
                        key={event.t}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-zinc-100">{event.title}</div>
                            <div className="text-xs text-zinc-400">{event.region}</div>
                          </div>
                          <Badge
                            className={
                              event.severity === "high"
                                ? "border-red-400/20 bg-red-500/10 text-red-200"
                                : event.severity === "medium"
                                  ? "border-orange-400/20 bg-orange-500/10 text-orange-200"
                                  : "border-zinc-700 bg-zinc-900 text-zinc-100"
                            }
                          >
                            {event.severity}
                          </Badge>
                        </div>
                        <div className="mt-2 text-sm text-zinc-300">{event.detail}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="cameras">
                <Card className="rounded-[28px] border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
                  <CardContent className="space-y-3 p-6">
                    {CAMERAS.map((cam) => (
                      <div
                        key={cam.name}
                        className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-zinc-100">{cam.name}</div>
                            <div className="text-xs text-zinc-400">{cam.city}</div>
                          </div>
                          <Camera className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div className="mt-3 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/60 p-5 text-center text-xs text-zinc-500">
                          {cam.note}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>

        {/* Keyboard shortcuts bar */}
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-2 text-xs text-zinc-400 backdrop-blur-sm">
          <span><kbd className="kbd">Space</kbd> Play/Pause</span>
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> Cycle tracks</span>
          <span><kbd className="kbd">+</kbd><kbd className="kbd">-</kbd> Zoom</span>
          <span><kbd className="kbd">/</kbd> Search</span>
          <span><kbd className="kbd">L</kbd> Labels</span>
          <span><kbd className="kbd">R</kbd> Reset</span>
        </div>
      </div>
    </div>
  );
}
