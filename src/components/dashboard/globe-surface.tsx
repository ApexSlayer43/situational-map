"use client";

import { useMemo, useCallback } from "react";
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countriesAtlas from "world-atlas/countries-50m.json";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, LocateFixed, ZoomIn, ZoomOut } from "lucide-react";
import type { Track, GlobeView, UIState, TrackHistory } from "@/types";
import {
  GLOBE_W,
  GLOBE_H,
  REGION_PRESETS,
  REGION_KEYS,
  NO_FLY,
  TRAFFIC_ZONES,
  COUNTRY_LABELS,
  CITY_LABELS,
} from "@/lib/data/constants";
import { clamp } from "@/lib/data/tracks";
import { tone } from "@/lib/data/styles";
import { projectedLabels } from "@/lib/geo-utils";
import { useDragGlobe } from "@/hooks/use-drag-globe";

interface GlobeSurfaceProps {
  tracks: Track[];
  history: TrackHistory;
  selected: Track | null;
  onSelect: (track: Track) => void;
  regionKey: string;
  setRegionKey: (key: string) => void;
  view: GlobeView;
  setView: React.Dispatch<React.SetStateAction<GlobeView>>;
  ui: UIState;
  setUi: React.Dispatch<React.SetStateAction<UIState>>;
  focusSelected: () => void;
}

export function GlobeSurface({
  tracks,
  history,
  selected,
  onSelect,
  regionKey,
  setRegionKey,
  view,
  setView,
  ui,
  setUi,
  focusSelected,
}: GlobeSurfaceProps) {
  const countries = useMemo(
    () => (feature(countriesAtlas as any, (countriesAtlas as any).objects.countries) as any).features as any[],
    []
  );

  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([GLOBE_W / 2, GLOBE_H / 2])
        .scale(view.scale)
        .rotate([-view.lon, -view.lat])
        .clipAngle(90)
        .precision(0.45),
    [view.lon, view.lat, view.scale]
  );

  const pathGen = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule10(), []);
  const drag = useDragGlobe(setView);

  const isFront = useCallback(
    (lon: number, lat: number) => geoDistance([lon, lat], [view.lon, view.lat]) <= Math.PI / 2,
    [view.lon, view.lat]
  );

  const visibleTracks = useMemo(
    () => tracks.filter((track) => isFront(track.lon, track.lat)),
    [tracks, isFront]
  );

  const visibleCountryLabels = useMemo(() => {
    const minDistance = view.scale > 600 ? 26 : view.scale > 420 ? 34 : 46;
    return projectedLabels(
      COUNTRY_LABELS.filter((item) => isFront(item.lon, item.lat)),
      projection,
      minDistance
    );
  }, [projection, view.scale, isFront]);

  const visibleCityLabels = useMemo(() => {
    const minDistance = view.scale > 600 ? 20 : 28;
    return projectedLabels(
      CITY_LABELS.filter((item) => isFront(item.lon, item.lat)),
      projection,
      minDistance
    );
  }, [projection, view.scale, isFront]);

  const zoomIn = () => setView((prev) => ({ ...prev, scale: clamp(prev.scale * 1.15, 180, 1200) }));
  const zoomOut = () => setView((prev) => ({ ...prev, scale: clamp(prev.scale / 1.15, 180, 1200) }));

  return (
    <div className="space-y-4">
      {/* Region tabs */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Areas</div>
            <div className="text-xs text-zinc-400">
              Theater tabs to jump fast, then drag the globe to refine.
            </div>
          </div>
          <Badge className="border-zinc-700 bg-zinc-900 text-zinc-100">
            {REGION_PRESETS[regionKey]?.name ?? "Custom"}
          </Badge>
        </div>
        <Tabs
          value={regionKey}
          onValueChange={(key) => {
            setRegionKey(key);
            setView(REGION_PRESETS[key]);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 bg-zinc-950">
            {REGION_KEYS.map((key) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {REGION_PRESETS[key].name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Globe */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge className="border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
              {tracks.filter((t) => t.type === "aircraft").length} aircraft
            </Badge>
            <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">
              {tracks.filter((t) => t.type === "vessel").length} vessels
            </Badge>
            <Badge className="border-violet-400/20 bg-violet-400/10 text-violet-200">
              {tracks.filter((t) => t.type === "satellite").length} satellites
            </Badge>
            <Badge className="border-zinc-700 bg-zinc-900 text-zinc-100">
              {visibleTracks.length} visible
            </Badge>
          </div>
          <div className="text-xs text-zinc-400">
            Drag to rotate. Use zoom buttons or mouse wheel. Click a marker to inspect it.
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-zinc-800 bg-black">
          <svg
            viewBox={`0 0 ${GLOBE_W} ${GLOBE_H}`}
            className="h-[50vh] min-h-[380px] max-h-[680px] w-full touch-none cursor-grab"
            onPointerDown={(e) => drag.onPointerDown(e, view)}
            onPointerMove={drag.onPointerMove}
            onPointerUp={drag.onPointerUp}
            onPointerLeave={drag.onPointerUp}
            onWheel={(e) => {
              e.preventDefault();
              if (e.deltaY < 0) zoomIn();
              else zoomOut();
            }}
          >
            <defs>
              <radialGradient id="globeFill" cx="45%" cy="35%" r="75%">
                <stop
                  offset="0%"
                  stopColor={
                    ui.mode === "thermal" ? "#3a1609" : ui.mode === "night" ? "#0b1c39" : "#12314d"
                  }
                />
                <stop
                  offset="62%"
                  stopColor={
                    ui.mode === "thermal" ? "#170a06" : ui.mode === "night" ? "#07101d" : "#091321"
                  }
                />
                <stop offset="100%" stopColor="#03060b" />
              </radialGradient>
              <linearGradient id="rimGlow" x1="0" x2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
              </linearGradient>
              <radialGradient id="rimAmbient" cx="50%" cy="50%" r="50%">
                <stop offset="85%" stopColor="transparent" />
                <stop offset="100%" stopColor="rgba(56,189,248,0.06)" />
              </radialGradient>
              {/* Glow filters for selected track */}
              <filter id="glowCyan" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#22d3ee" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glowAmber" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#fb923c" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="glowViolet" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feFlood floodColor="#8b5cf6" floodOpacity="0.6" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Globe base */}
            <path
              d={pathGen({ type: "Sphere" }) || ""}
              fill="url(#globeFill)"
              stroke="rgba(255,255,255,0.22)"
              strokeWidth="1.3"
            />
            <path
              d={pathGen({ type: "Sphere" }) || ""}
              fill="none"
              stroke="url(#rimGlow)"
              strokeWidth="14"
              opacity="0.45"
            />
            <path
              d={pathGen(graticule) || ""}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="0.8"
            />

            {/* Countries */}
            {countries.map((country: any, index: number) => (
              <path
                key={index}
                d={pathGen(country) || ""}
                fill="rgba(96,165,250,0.14)"
                stroke="rgba(226,232,240,0.42)"
                strokeWidth={view.scale > 650 ? 0.95 : 0.75}
              />
            ))}

            {/* No-fly zones */}
            {NO_FLY.map((zone) => {
              const shape = {
                type: "Polygon" as const,
                coordinates: [
                  [
                    [zone.west, zone.south],
                    [zone.east, zone.south],
                    [zone.east, zone.north],
                    [zone.west, zone.north],
                    [zone.west, zone.south],
                  ],
                ],
              };
              return (
                <path
                  key={zone.name}
                  d={pathGen(shape) || ""}
                  fill={zone.kind === "high" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)"}
                  stroke={zone.kind === "high" ? "rgba(248,113,113,0.9)" : "rgba(251,191,36,0.9)"}
                  strokeDasharray="6 5"
                  strokeWidth="1.5"
                />
              );
            })}

            {/* Traffic zones */}
            {ui.traffic &&
              TRAFFIC_ZONES.filter((z) => isFront(z.lon, z.lat)).map((zone) => {
                const p = projection([zone.lon, zone.lat]);
                if (!p) return null;
                const r = zone.radius * (view.scale / 255);
                return (
                  <circle
                    key={zone.name}
                    cx={p[0]}
                    cy={p[1]}
                    r={r}
                    fill="rgba(239,68,68,0.12)"
                    stroke="rgba(248,113,113,0.8)"
                  />
                );
              })}

            {/* Trail history */}
            {ui.trails &&
              visibleTracks.map((track) => {
                const line = { type: "LineString" as const, coordinates: history[track.id] || [] };
                const d = pathGen(line);
                if (!d) return null;
                return (
                  <path
                    key={`${track.id}-trail`}
                    d={d}
                    fill="none"
                    stroke={tone(track)}
                    strokeOpacity="0.36"
                    strokeWidth={track.type === "satellite" ? 1.6 : 2}
                  />
                );
              })}

            {/* Track markers */}
            {visibleTracks.map((track) => {
              const p = projection([track.lon, track.lat]);
              if (!p) return null;
              const fill = tone(track);
              const selectedNow = selected?.id === track.id;
              return (
                <g
                  key={track.id}
                  onClick={() => onSelect(track)}
                  className="cursor-pointer"
                  filter={selectedNow ? (track.military ? "url(#glowAmber)" : track.type === "satellite" ? "url(#glowViolet)" : "url(#glowCyan)") : undefined}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${track.id} ${track.type} ${track.operator}`}
                >
                  {/* Pulse ring for military tracks */}
                  {track.military && (
                    <circle
                      cx={p[0]}
                      cy={p[1]}
                      r={12}
                      fill="none"
                      stroke={fill}
                      strokeOpacity="0.4"
                      strokeWidth="1"
                    >
                      <animate attributeName="r" from="8" to="18" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="stroke-opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={p[0]}
                    cy={p[1]}
                    r={selectedNow ? 12 : track.type === "satellite" ? 5 : 6}
                    fill={fill}
                    fillOpacity={selectedNow ? "0.25" : "0.18"}
                  />
                  {track.type === "aircraft" && (
                    <path
                      d={`M ${p[0]} ${p[1] - 5} L ${p[0] + 4} ${p[1] + 5} L ${p[0]} ${p[1] + 2} L ${p[0] - 4} ${p[1] + 5} Z`}
                      fill={fill}
                    />
                  )}
                  {track.type === "satellite" && (
                    <g>
                      <rect x={p[0] - 2} y={p[1] - 2} width="4" height="4" fill={fill} />
                      <line x1={p[0] - 6} y1={p[1]} x2={p[0] - 2} y2={p[1]} stroke={fill} />
                      <line x1={p[0] + 2} y1={p[1]} x2={p[0] + 6} y2={p[1]} stroke={fill} />
                    </g>
                  )}
                  {track.type === "vessel" && (
                    <path
                      d={`M ${p[0]} ${p[1] - 5} L ${p[0] + 4} ${p[1] + 5} L ${p[0] - 4} ${p[1] + 5} Z`}
                      fill={fill}
                    />
                  )}
                  {ui.labels && view.scale > 320 && (
                    <>
                      <line
                        x1={p[0]}
                        y1={p[1]}
                        x2={p[0] + 14}
                        y2={p[1] - 10}
                        stroke={fill}
                        strokeOpacity="0.65"
                      />
                      <text x={p[0] + 17} y={p[1] - 12} fill={fill} fontSize="10.5">
                        {track.id}
                      </text>
                    </>
                  )}
                </g>
              );
            })}

            {/* Country labels */}
            {ui.labels &&
              view.scale > 260 &&
              visibleCountryLabels.map((country) => (
                <text
                  key={country.name}
                  x={country.x}
                  y={country.y}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.72)"
                  fontSize={view.scale > 650 ? 12 : 10.8}
                  style={{ letterSpacing: 1.05 }}
                >
                  {country.name.toUpperCase()}
                </text>
              ))}

            {/* City labels */}
            {ui.labels &&
              view.scale > 340 &&
              visibleCityLabels.map((city) => (
                <g key={city.name}>
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={city.tier === 1 ? 2.8 : 2.2}
                    fill="rgba(255,255,255,0.9)"
                  />
                  <text
                    x={city.x + 5}
                    y={city.y - 5}
                    fill="rgba(255,255,255,0.72)"
                    fontSize={city.tier === 1 ? 10.2 : 9.2}
                  >
                    {city.name}
                  </text>
                </g>
              ))}
          </svg>
        </div>
      </div>

      {/* Controls */}
      <div className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 lg:grid-cols-[1fr_1fr_1fr]">
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Camera
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="justify-start border-zinc-700 bg-zinc-950 text-zinc-100"
              onClick={focusSelected}
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              Focus asset
            </Button>
            <Button
              variant="outline"
              className="justify-start border-zinc-700 bg-zinc-950 text-zinc-300"
              onClick={() => {
                setRegionKey("global");
                setView(REGION_PRESETS.global);
              }}
            >
              <Globe className="mr-2 h-4 w-4" />
              Reset view
            </Button>
            <Button
              variant="outline"
              className="justify-start border-zinc-700 bg-zinc-950 text-zinc-300"
              onClick={zoomIn}
            >
              <ZoomIn className="mr-2 h-4 w-4" />
              Zoom in
            </Button>
            <Button
              variant="outline"
              className="justify-start border-zinc-700 bg-zinc-950 text-zinc-300"
              onClick={zoomOut}
            >
              <ZoomOut className="mr-2 h-4 w-4" />
              Zoom out
            </Button>
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Display
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setUi((v) => ({ ...v, labels: !v.labels }))}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${
                ui.labels
                  ? "border-cyan-400/50 bg-zinc-900 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              Labels {ui.labels ? "On" : "Off"}
            </button>
            <button
              onClick={() => setUi((v) => ({ ...v, trails: !v.trails }))}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${
                ui.trails
                  ? "border-cyan-400/50 bg-zinc-900 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              Trails {ui.trails ? "On" : "Off"}
            </button>
            <button
              onClick={() => setUi((v) => ({ ...v, traffic: !v.traffic }))}
              className={`rounded-xl border px-3 py-2 text-left text-sm ${
                ui.traffic
                  ? "border-cyan-400/50 bg-zinc-900 text-zinc-100"
                  : "border-zinc-800 bg-zinc-950 text-zinc-400"
              }`}
            >
              Traffic {ui.traffic ? "On" : "Off"}
            </button>
            <button
              onClick={() => setUi((v) => ({ ...v, labels: true, trails: true, traffic: true }))}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-400"
            >
              Restore defaults
            </button>
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Modes
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["standard", "Standard"],
                ["night", "Night"],
                ["thermal", "Thermal"],
                ["traffic", "Traffic"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setUi((v) => ({ ...v, mode: value }))}
                className={`rounded-xl border px-3 py-2 text-left text-sm ${
                  ui.mode === value
                    ? "border-cyan-400/50 bg-zinc-900 text-zinc-100"
                    : "border-zinc-800 bg-zinc-950 text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
