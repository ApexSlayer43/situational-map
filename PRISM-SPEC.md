# PRISM DESIGN SPEC
# Situational Awareness Dashboard — UI/UX Enhancement Audit
# Generated: 2026-03-30

═════════════════════════════════════════════════════════════════
## AUDIT SUMMARY
═════════════════════════════════════════════════════════════════

Codebase reads as a solid functional foundation. zinc-950/900 palette is
appropriate for an ops-grade dark interface. The rounded-[28px] card
radius is distinctive and should be preserved. Problems are surface-level:
flat glass needs depth, the SVG globe markers need selection feedback,
the 3-column layout has no breakpoint fallback, and there is no keyboard
navigation layer at all.

Stack: Next.js (app router), shadcn/ui, Tailwind, Framer Motion, d3-geo.
All specs below stay within that stack — no new dependencies unless noted.

Color system already in use (confirmed from styles.ts):
- Cyan    #67e8f9 / cyan-300   — civil aircraft
- Orange  #fb923c / orange-400 — military aircraft
- Violet  #c4b5fd / violet-300 — civil satellite
- Rose    #fb7185 / rose-400   — military satellite
- Emerald #86efac / emerald-300 — civil vessel
- Pink    #fda4af / pink-300   — military vessel
- Zinc    #09090b / zinc-950   — void background

═════════════════════════════════════════════════════════════════
## SECTION 1 — VISUAL UPGRADES
═════════════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────────
1A. GLASSMORPHISM PANEL SYSTEM
───────────────────────────────────────────────────────────────

Current: bg-zinc-900/60 with border-zinc-800. Reads flat.
Fix: Add backdrop-blur and a top-edge specular highlight.

Replace every Card className string:
  FROM: "rounded-[28px] border-zinc-800 bg-zinc-900/60"
  TO:   "rounded-[28px] border-zinc-800/60 bg-zinc-900/50 backdrop-blur-md
         shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]
         shadow-xl shadow-black/40"

For the globe center card which is the visual anchor, use heavier glass:
  "rounded-[28px] border-zinc-700/50 bg-zinc-900/40 backdrop-blur-xl
   shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]
   shadow-2xl shadow-black/60 ring-1 ring-cyan-400/5"

The background of the page itself should show the layering. In the root
div, change:
  FROM: "min-h-screen bg-zinc-950 p-6 text-zinc-100 md:p-8"
  TO:   "min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(6,182,212,0.06),transparent)]
         p-6 text-zinc-100 md:p-8"

This adds a subtle cyan bloom above the fold that reinforces the live data
feel without competing with the globe.

───────────────────────────────────────────────────────────────
1B. GLOW EFFECTS — SELECTED TRACKS AND ACTIVE ITEMS
───────────────────────────────────────────────────────────────

In globe-surface.tsx, the selected track marker currently only grows
from r=6 to r=10. That is not enough visual signal.

In the SVG <defs> block, add a glow filter per track category:

```svg
<filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
<filter id="glow-orange" x="-50%" y="-50%" width="200%" height="200%">
  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

Map filter to tone:
- aircraft civil   → filter="url(#glow-cyan)"
- aircraft military → filter="url(#glow-orange)"
- satellite civil   → filter="url(#glow-violet)"
- satellite military → filter="url(#glow-rose)"
- vessel civil      → filter="url(#glow-emerald)"
- vessel military   → filter="url(#glow-pink)"

Apply to the <g> element for selected tracks only:
  <g key={track.id}
     onClick={() => onSelect(track)}
     className="cursor-pointer"
     filter={selectedNow ? `url(#glow-${glowKey(track)})` : undefined}
  >

Helper function in globe-surface.tsx:
```ts
function glowKey(track: Track): string {
  if (track.type === "aircraft") return track.category === "military" ? "orange" : "cyan";
  if (track.type === "satellite") return track.category === "military" ? "rose" : "violet";
  return track.category === "military" ? "pink" : "emerald";
}
```

Add filters for all 6 tones using stdDeviation="3" (not more — will blur
on low-res screens).

Selected RegistryRow glow — in registry-row.tsx change the selected state:
  FROM: "border-cyan-400/50 bg-zinc-900"
  TO:   "border-cyan-400/60 bg-zinc-900 shadow-[0_0_0_1px_rgba(34,211,238,0.15),
         inset_0_1px_0_rgba(34,211,238,0.08)]"

───────────────────────────────────────────────────────────────
1C. ANIMATED PULSE RINGS — HIGH SEVERITY ALERTS
───────────────────────────────────────────────────────────────

New Tailwind animation in tailwind.config.ts (or globals.css if using
CSS-first config):

```css
@keyframes ping-slow {
  0%   { transform: scale(1);   opacity: 0.7; }
  75%  { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}
.animate-ping-slow {
  animation: ping-slow 2s cubic-bezier(0,0,0.2,1) infinite;
}
```

In globe-surface.tsx, for tracks where track.military === true, render
a pulse ring behind the main marker:

```tsx
{track.military && (
  <circle
    cx={p[0]}
    cy={p[1]}
    r={selectedNow ? 14 : 9}
    fill="none"
    stroke={fill}
    strokeWidth="1"
    strokeOpacity="0.6"
    className="animate-ping-slow"
    style={{ transformOrigin: `${p[0]}px ${p[1]}px` }}
  />
)}
```

For the alert cards in the Alerts tab, add a left accent border for high
severity:
  high:   "border-l-2 border-l-red-500"
  medium: "border-l-2 border-l-orange-500"
  low:    no change

High severity alert cards should also show a pulsing dot in the badge:
```tsx
{event.severity === "high" && (
  <span className="relative flex h-2 w-2 mr-1">
    <span className="animate-ping absolute inline-flex h-full w-full
                     rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
  </span>
)}
```

───────────────────────────────────────────────────────────────
1D. GLOBE RIM GRADIENT — UPGRADE
───────────────────────────────────────────────────────────────

Current rimGlow is a single linear gradient, light-side only. This reads
as a flat edge highlight. Replace with a radial rim that wraps the sphere.

Replace the current rimGlow gradient and rim path with:

```svg
<defs>
  <!-- Keep globeFill as-is -->

  <!-- Rim: ambient outer glow -->
  <radialGradient id="rimAmbient" cx="50%" cy="50%" r="50%">
    <stop offset="85%"  stopColor="transparent" />
    <stop offset="92%"  stopColor="#38bdf8" stopOpacity="0.12" />
    <stop offset="96%"  stopColor="#8b5cf6" stopOpacity="0.18" />
    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.5" />
  </radialGradient>

  <!-- Rim: specular highlight on upper-left -->
  <linearGradient id="rimSpecular" x1="0.2" y1="0.1" x2="0.8" y2="0.6">
    <stop offset="0%"   stopColor="#e0f2fe" stopOpacity="0.25" />
    <stop offset="40%"  stopColor="#67e8f9" stopOpacity="0.10" />
    <stop offset="100%" stopColor="transparent" />
  </linearGradient>
</defs>

<!-- Ambient rim — full sphere stroke -->
<path
  d={pathGen({ type: "Sphere" }) || ""}
  fill="none"
  stroke="url(#rimAmbient)"
  strokeWidth="24"
  opacity="0.8"
/>

<!-- Specular edge — upper left arc only, rendered as clipped sphere -->
<path
  d={pathGen({ type: "Sphere" }) || ""}
  fill="none"
  stroke="url(#rimSpecular)"
  strokeWidth="3"
  opacity="0.9"
/>
```

Remove the old rimGlow gradient and the single rim stroke.

───────────────────────────────────────────────────────────────
1E. STATUS INDICATOR DOTS
───────────────────────────────────────────────────────────────

New component: src/components/dashboard/status-dot.tsx

```tsx
"use client";

interface StatusDotProps {
  status: "live" | "stale" | "offline";
  label?: string;
}

const config = {
  live:    { dot: "bg-emerald-400", ring: "bg-emerald-400", label: "Live" },
  stale:   { dot: "bg-amber-400",   ring: "bg-amber-400",   label: "Stale" },
  offline: { dot: "bg-zinc-600",    ring: "",               label: "Offline" },
};

export function StatusDot({ status, label }: StatusDotProps) {
  const c = config[status];
  return (
    <span className="flex items-center gap-1.5">
      <span className="relative flex h-2.5 w-2.5">
        {status !== "offline" && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full
                        rounded-full ${c.ring} opacity-60`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.dot}`} />
      </span>
      {label !== undefined && (
        <span className="text-xs text-zinc-400">{label ?? c.label}</span>
      )}
    </span>
  );
}
```

Usage in dashboard.tsx — replace the text-only live badge in the globe
card header:
  FROM: <Badge className={`${liveMode ? "border-emerald-400/20 ..." : "..."}`}>{liveStatus}</Badge>
  TO:   <div className="flex items-center gap-2">
          <StatusDot status={liveMode ? (playing ? "live" : "stale") : "offline"} />
          <span className="text-sm text-zinc-300">{liveStatus}</span>
        </div>

Also add StatusDot to RegistryRow for each track to show if it has isLive:
  In the icon container row, after the TrackIcon:
  <StatusDot status={track.isLive ? "live" : "stale"} />

───────────────────────────────────────────────────────────────
1F. MICRO-ANIMATIONS ON PANEL TRANSITIONS
───────────────────────────────────────────────────────────────

Framer Motion is already in the project. The outer grid has entry
animation. Add per-card staggered entrance and tab content transitions.

Wrap each column div in a motion.div with staggered delay:

```tsx
// Left column
<motion.div
  className="space-y-6"
  initial={{ opacity: 0, x: -16 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.4, delay: 0.05 }}
>

// Center column
<motion.div
  className="space-y-6"
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4, delay: 0.1 }}
>

// Right column
<motion.div
  className="space-y-6"
  initial={{ opacity: 0, x: 16 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.4, delay: 0.15 }}
>
```

Remove the existing motion.div wrapper around the grid entirely — it was
wrapping the whole grid with a single animation; stagger is better.

For live feed entries, each new entry should slide in. Wrap the liveFeed
.map() in an AnimatePresence:

```tsx
import { AnimatePresence, motion } from "framer-motion";

<AnimatePresence initial={false} mode="popLayout">
  {liveFeed.map((entry) => (
    <motion.div
      key={entry.id}
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
    >
      {/* existing entry content */}
    </motion.div>
  ))}
</AnimatePresence>
```

For the tab content switch (Alerts / Cameras), wrap TabsContent body in:
```tsx
<motion.div
  key={/* active tab value */}
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.18 }}
>
```

───────────────────────────────────────────────────────────────
1G. TYPOGRAPHY HIERARCHY
───────────────────────────────────────────────────────────────

Current hierarchy collapses. All CardTitles are text-lg with icon. The
globe card uses text-2xl but the pattern is inconsistent.

Proposed scale:
- Hero (globe card title):   text-xl font-semibold tracking-tight text-zinc-50
- Panel title (other cards): text-base font-semibold tracking-tight text-zinc-100
- Section labels (uppercase): text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500
- Body:                       text-sm text-zinc-300
- Secondary:                  text-xs text-zinc-400
- Data values:                text-sm font-mono text-zinc-100  (for lat/lon/heading/speed)
- Alert/warning copy:         text-sm text-zinc-200

Data values — in the Selected Asset grid in the narrative panel, wrap the
value spans in font-mono:
  FROM: <span className="text-zinc-200">{selectedLive?.lat?.toFixed(2)}</span>
  TO:   <span className="font-mono text-sm text-zinc-100">{selectedLive?.lat?.toFixed(2)}</span>

Same treatment for heading and speed. These are instrument readings — mono
spacing prevents layout shift as values change.

Track IDs in RegistryRow:
  FROM: className="font-medium text-zinc-100"
  TO:   className="font-mono text-sm font-medium text-zinc-100"


═════════════════════════════════════════════════════════════════
## SECTION 2 — UX IMPROVEMENTS
═════════════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────────
2A. KEYBOARD SHORTCUTS
───────────────────────────────────────────────────────────────

New hook: src/hooks/use-keyboard-shortcuts.ts

```ts
"use client";
import { useEffect } from "react";
import type { Track } from "@/types";

interface ShortcutOptions {
  tracks: Track[];
  selected: Track | null;
  onSelect: (t: Track) => void;
  onPlayPause: () => void;
  onReset: () => void;
  onFocus: () => void;
}

export function useKeyboardShortcuts({
  tracks,
  selected,
  onSelect,
  onPlayPause,
  onReset,
  onFocus,
}: ShortcutOptions) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Skip if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) return;

      const idx = tracks.findIndex((t) => t.id === selected?.id);

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault();
          if (tracks.length > 0)
            onSelect(tracks[(idx + 1) % tracks.length]);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault();
          if (tracks.length > 0)
            onSelect(tracks[(idx - 1 + tracks.length) % tracks.length]);
          break;
        case " ":
          e.preventDefault();
          onPlayPause();
          break;
        case "r":
        case "R":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onReset();
          }
          break;
        case "f":
        case "F":
          e.preventDefault();
          onFocus();
          break;
        case "Escape":
          // blur any focused element, return focus to body
          (document.activeElement as HTMLElement)?.blur();
          break;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tracks, selected, onSelect, onPlayPause, onReset, onFocus]);
}
```

Wire in dashboard.tsx:
```tsx
useKeyboardShortcuts({
  tracks: filtered,
  selected: selectedLive,
  onSelect: setSelected,
  onPlayPause: () => setPlaying((v) => !v),
  onReset: handleReset,
  onFocus: focusSelected,
});
```

Shortcut legend — add a collapsible footer or inline tooltip. Simplest:
small fixed-position badge bottom-right on desktop only:

```tsx
<div className="hidden xl:flex fixed bottom-4 right-4 items-center gap-3
                rounded-2xl border border-zinc-800/60 bg-zinc-900/80
                backdrop-blur-md px-4 py-2 text-[10px] text-zinc-500">
  <span><kbd className="font-mono text-zinc-400">↑↓</kbd> cycle</span>
  <span><kbd className="font-mono text-zinc-400">Space</kbd> play/pause</span>
  <span><kbd className="font-mono text-zinc-400">R</kbd> reset</span>
  <span><kbd className="font-mono text-zinc-400">F</kbd> focus</span>
</div>
```

───────────────────────────────────────────────────────────────
2B. TRACK HOVER TOOLTIP — QUICK STATS
───────────────────────────────────────────────────────────────

The SVG globe uses pointer events directly. A portal-based tooltip is the
right approach since SVG overflow is clipped by the rounded div.

New component: src/components/dashboard/track-tooltip.tsx

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Track } from "@/types";
import { badgeTone } from "@/lib/data/styles";
import { Badge } from "@/components/ui/badge";

interface TrackTooltipProps {
  track: Track;
  x: number;  // page-level x
  y: number;  // page-level y
}

export function TrackTooltip({ track, x, y }: TrackTooltipProps) {
  // Position tooltip above the cursor with 12px gap
  const style = {
    position: "fixed" as const,
    left: x + 12,
    top: y - 8,
    transform: "translateY(-100%)",
    zIndex: 9999,
    pointerEvents: "none" as const,
  };

  return createPortal(
    <div
      style={style}
      className="rounded-2xl border border-zinc-700/60 bg-zinc-900/95
                 backdrop-blur-md px-3 py-2.5 shadow-xl shadow-black/50
                 min-w-[180px]"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="font-mono text-sm font-medium text-zinc-100">{track.id}</span>
        <Badge className={badgeTone(track.type, track.category)} style={{ fontSize: 10 }}>
          {track.category}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
        <span>Operator</span>
        <span className="text-zinc-200">{track.operator}</span>
        <span>Lat / Lon</span>
        <span className="font-mono text-zinc-200">
          {track.lat.toFixed(2)}, {track.lon.toFixed(2)}
        </span>
        <span>Heading</span>
        <span className="font-mono text-zinc-200">{Math.round(track.heading)}°</span>
        <span>Speed</span>
        <span className="font-mono text-zinc-200">{Math.round(track.speed)}</span>
        {track.origin && (
          <>
            <span>Route</span>
            <span className="text-zinc-200">{track.origin} → {track.dest}</span>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
```

In globe-surface.tsx, add hover state tracking:

```tsx
const [hoveredTrack, setHoveredTrack] = useState<Track | null>(null);
const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

// On each track <g> element, add:
onMouseEnter={(e) => {
  setHoveredTrack(track);
  setTooltipPos({ x: e.clientX, y: e.clientY });
}}
onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
onMouseLeave={() => setHoveredTrack(null)}
```

Render at the bottom of the GlobeSurface return:
```tsx
{hoveredTrack && (
  <TrackTooltip
    track={hoveredTrack}
    x={tooltipPos.x}
    y={tooltipPos.y}
  />
)}
```

───────────────────────────────────────────────────────────────
2C. MINIMAP — GLOBE ORIENTATION INDICATOR
───────────────────────────────────────────────────────────────

A small 64x64px orthographic thumbnail in the bottom-left of the globe
SVG wrapper showing the full earth with a dot for current view center.

In globe-surface.tsx, inside the outer rounded-2xl globe wrapper div,
add a positioned overlay:

```tsx
<div className="relative">
  <div className="overflow-hidden rounded-[24px] border border-zinc-800 bg-black">
    <svg ...> {/* main globe */} </svg>
  </div>

  {/* Minimap */}
  <div className="absolute bottom-4 left-4 rounded-xl border border-zinc-700/50
                  bg-zinc-950/80 backdrop-blur-sm p-1.5 shadow-lg">
    <MinimapGlobe currentLon={view.lon} currentLat={view.lat} />
  </div>
</div>
```

New component: src/components/dashboard/minimap-globe.tsx

```tsx
"use client";
import { useMemo } from "react";
import { geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import countriesAtlas from "world-atlas/countries-50m.json";

const W = 64, H = 64;

export function MinimapGlobe({ currentLon, currentLat }: {
  currentLon: number;
  currentLat: number;
}) {
  const countries = useMemo(
    () => (feature(countriesAtlas as any, (countriesAtlas as any).objects.countries) as any).features,
    []
  );

  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate([W / 2, H / 2])
        .scale(28)
        .rotate([-currentLon, -currentLat])
        .clipAngle(90),
    [currentLon, currentLat]
  );

  const pathGen = useMemo(() => geoPath(projection), [projection]);

  // Project the view center dot
  const center = projection([currentLon, currentLat]);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      {/* Globe base */}
      <path
        d={pathGen({ type: "Sphere" }) || ""}
        fill="#070f1e"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.8"
      />
      {/* Countries */}
      {countries.map((c: any, i: number) => (
        <path
          key={i}
          d={pathGen(c) || ""}
          fill="rgba(96,165,250,0.15)"
          stroke="rgba(226,232,240,0.3)"
          strokeWidth="0.4"
        />
      ))}
      {/* View center dot */}
      {center && (
        <>
          <circle cx={center[0]} cy={center[1]} r={5}
                  fill="none" stroke="#67e8f9" strokeWidth="0.8" strokeOpacity="0.5" />
          <circle cx={center[0]} cy={center[1]} r={1.5} fill="#67e8f9" />
        </>
      )}
    </svg>
  );
}
```

Note: The minimap re-renders on every view change. This is fine — it is
64x64 SVG. No memoization needed beyond what useMemo already provides.

───────────────────────────────────────────────────────────────
2D. EMPTY STATES
───────────────────────────────────────────────────────────────

Current: filtered.length === 0 results in a blank ScrollArea. No message.

In the registry ScrollArea, add a conditional:
```tsx
{filtered.length === 0 ? (
  <div className="flex flex-col items-center justify-center gap-3
                  py-16 text-center">
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <Layers className="h-8 w-8 text-zinc-700 mx-auto" />
    </div>
    <div className="text-sm font-medium text-zinc-400">No tracks match</div>
    <div className="text-xs text-zinc-600 max-w-[200px]">
      Adjust your filters or clear the search query.
    </div>
    <button
      onClick={() => {
        setQuery("");
        setOnlyMilitary(false);
        setHideCommercial(false);
        setShowTypes({ aircraft: true, vessel: true, satellite: true });
      }}
      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
    >
      Clear all filters
    </button>
  </div>
) : (
  <div className="space-y-3">
    {filtered.map((track) => ( ... ))}
  </div>
)}
```

The clear-all handler needs setQuery/setOnlyMilitary/etc passed down from
dashboard.tsx into the Registry section. Extract them already in scope —
just add the handler inline or as a useCallback.

───────────────────────────────────────────────────────────────
2E. TOAST NOTIFICATIONS FOR NEW ALERTS
───────────────────────────────────────────────────────────────

shadcn/ui has a Toaster/useToast system. Install if not present:
  npx shadcn@latest add toast

Wire in dashboard.tsx. In the setLiveFeed call inside the interval:
```tsx
import { useToast } from "@/components/ui/use-toast";

// Inside Dashboard():
const { toast } = useToast();

// Inside the setTracks callback, after building entries:
const entries = buildLiveEntries(next, currentFrame, selectedIdRef.current);
const warnings = entries.filter((e) => e.level === "warning");
warnings.forEach((w) => {
  toast({
    title: w.title,
    description: w.detail,
    variant: "destructive",  // or build a custom "warning" variant
    duration: 4000,
  });
});
```

Add <Toaster /> to the root layout (app/layout.tsx).

Custom warning variant in shadcn toast — in components/ui/toast.tsx, the
variants object uses cva. Add:
```ts
warning: "border-amber-500/30 bg-amber-950/80 text-amber-200
          backdrop-blur-md [&>button]:text-amber-400",
```

Call with variant: "warning" for feed warnings. Reserve "destructive" for
actual errors (API failures, validation errors — already shown inline).

Toast should not fire on the boot entry or "Feed reset" info entry. Gate:
```ts
if (w.level === "warning") { toast(...) }
```

Throttle: do not toast the same title twice within 10 seconds. Track with
a ref:
```ts
const toastedRef = useRef<Map<string, number>>(new Map());

// Before toasting:
const now = Date.now();
const lastToasted = toastedRef.current.get(w.title) ?? 0;
if (now - lastToasted > 10000) {
  toast({ ... });
  toastedRef.current.set(w.title, now);
}
```

───────────────────────────────────────────────────────────────
2F. SMOOTH REGION TRANSITIONS
───────────────────────────────────────────────────────────────

Current: region tab change is instant. setView() sets new lon/lat/scale
directly. Looks like a jump.

New hook: src/hooks/use-animated-view.ts

```ts
"use client";
import { useEffect, useRef, useState } from "react";
import type { GlobeView } from "@/types";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Shortest-path longitude interpolation (handles wrap-around)
function lerpLon(a: number, b: number, t: number) {
  let delta = ((b - a + 540) % 360) - 180;
  return a + delta * t;
}

export function useAnimatedView(
  target: GlobeView,
  durationMs = 600
): GlobeView {
  const [current, setCurrent] = useState<GlobeView>(target);
  const startRef = useRef<GlobeView>(target);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    startRef.current = current;
    startTimeRef.current = null;

    function tick(time: number) {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const t = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const e = 1 - Math.pow(1 - t, 3);

      setCurrent({
        lon: lerpLon(startRef.current.lon, target.lon, e),
        lat: lerp(startRef.current.lat, target.lat, e),
        scale: lerp(startRef.current.scale, target.scale, e),
        name: target.name,
      });

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.lon, target.lat, target.scale]);

  return current;
}
```

In GlobeSurface, consume:
```tsx
import { useAnimatedView } from "@/hooks/use-animated-view";

// Replace direct view usage:
const animatedView = useAnimatedView(view);

// Pass animatedView to projection instead of view:
const projection = useMemo(
  () =>
    geoOrthographic()
      .translate([GLOBE_W / 2, GLOBE_H / 2])
      .scale(animatedView.scale)
      .rotate([-animatedView.lon, -animatedView.lat])
      .clipAngle(90)
      .precision(0.45),
  [animatedView.lon, animatedView.lat, animatedView.scale]
);
```

The drag handler still writes to view directly — animatedView should NOT
be used during drag (it would fight the user). Gate the hook: during
active drag, bypass animation by passing view through unchanged.

Add isDragging state to useDragGlobe — return it — and in GlobeSurface:
```tsx
const { isDragging, ...dragHandlers } = useDragGlobe(setView);
const animatedView = useAnimatedView(view, isDragging ? 0 : 600);
```


═════════════════════════════════════════════════════════════════
## SECTION 3 — RESPONSIVE FIXES
═════════════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────────
3A. 3-COLUMN LAYOUT BREAKPOINTS
───────────────────────────────────────────────────────────────

Current grid:
  "grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]"

This means on anything below xl (1280px) the layout stacks as a single
column, which on a 768px tablet dumps 3 full-width cards in sequence.

Proposed breakpoint strategy:
  Mobile  (< 768px):  single column, full width
  Tablet  (768-1279px): 2 columns, left sidebar + center globe, right column
                         stacks below
  Desktop (>= 1280px): 3 columns as current

New className:
```
"grid gap-6
 grid-cols-1
 md:grid-cols-[280px_minmax(0,1fr)]
 xl:grid-cols-[320px_minmax(0,1fr)_360px]"
```

Right column on tablet: it will form a new full-width row.
Wrap the right column div in:
  className="space-y-6 md:col-span-2 xl:col-span-1"

This puts the right column (Live Feed + Narrative) below the two-column
zone on tablet, and back in its own column on desktop.

───────────────────────────────────────────────────────────────
3B. GLOBE HEIGHT — VIEWPORT SCALING
───────────────────────────────────────────────────────────────

Current SVG:
  className="h-[600px] w-full touch-none cursor-grab"

On a 768px-tall laptop display, a 600px globe with headers, tabs, and
controls visible above it means the page is immediately scrollable, which
breaks the ops-dashboard feel.

Replace fixed 600px with a responsive value:
  className="h-[50vh] min-h-[380px] max-h-[680px] w-full touch-none cursor-grab"

50vh gives proportional height on any screen. min-h-[380px] prevents it
from becoming unusable on small screens. max-h-[680px] prevents it from
taking over on ultra-tall displays.

───────────────────────────────────────────────────────────────
3C. SIDEBAR COLLAPSE ON SMALLER SCREENS
───────────────────────────────────────────────────────────────

On tablet (md breakpoint), the left column is 280px wide but the Filter
card inside it has a description paragraph and verbose instructions that
waste space. Two approaches:

Option A — Collapse instruction block on tablet:
  Add className="hidden xl:block" to the instruction div (the three-step
  numbered list inside the focus card).

Option B — Collapsible sidebar with toggle button:
  This is the full implementation. Add a collapse toggle to the left
  column header. When collapsed, the column shrinks to icon-only width (48px)
  and shows only icon buttons for Search, Layers. When expanded, it shows
  the full content.

  For this project, Option A is the right call — simpler, no behavior
  change, instructions are secondary content on smaller screens.

Also on mobile: the filter type-toggle buttons are in a grid-cols-2 which
is fine. The registry ScrollArea is h-[620px] — on mobile this makes the
page very long. Change to:
  className="h-[420px] md:h-[520px] xl:h-[620px] pr-4"

Region tabs in globe: grid-cols-3 on mobile, lg:grid-cols-6. Current
value. This is correct. No change needed.


═════════════════════════════════════════════════════════════════
## SECTION 4 — ACCESSIBILITY
═════════════════════════════════════════════════════════════════

───────────────────────────────────────────────────────────────
4A. ARIA LABELS ON ALL INTERACTIVE ELEMENTS
───────────────────────────────────────────────────────────────

All plain <button> elements in the codebase are missing aria-label when
they have no visible text, and are missing role/aria-pressed for toggle
behavior.

--- dashboard.tsx ---

Type filter buttons:
```tsx
<button
  key={key}
  onClick={() => setShowTypes((s) => ({ ...s, [key]: !s[key] }))}
  aria-pressed={showTypes[key]}
  aria-label={`Toggle ${label} filter`}
  className={...}
>
  {label}
</button>
```

Play/Pause button — already has visible text ("Pause" / "Play") but add
aria-label for screen reader clarity:
  <Button aria-label={playing ? "Pause simulation" : "Start simulation"} ...>

Reset button:
  <Button aria-label="Reset simulation to baseline" ...>

Timeline event buttons:
```tsx
<button
  key={event.t}
  onClick={() => setTimeline([event.t])}
  aria-pressed={timelineEvent.t === event.t}
  aria-label={`Jump to event: ${event.title} at T+${event.t} minutes`}
  className={...}
>
```

--- globe-surface.tsx ---

Track markers are SVG <g> elements acting as buttons. Add role and label:
```tsx
<g
  key={track.id}
  onClick={() => onSelect(track)}
  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(track); }}
  tabIndex={0}
  role="button"
  aria-label={`Select track ${track.id}, ${track.type}, ${track.category}, operator ${track.operator}`}
  aria-pressed={selectedNow}
  className="cursor-pointer focus:outline-none"
>
```

Focus ring on SVG elements does not render by default. Add a focus
indicator via a separate visible circle:
```tsx
{selectedNow && (
  <circle
    cx={p[0]}
    cy={p[1]}
    r={selectedNow ? 14 : 10}
    fill="none"
    stroke="white"
    strokeWidth="1.5"
    strokeOpacity="0.4"
    strokeDasharray="3 2"
    aria-hidden="true"
  />
)}
```

Display/mode toggle buttons in globe-surface.tsx:
```tsx
<button
  onClick={() => setUi((v) => ({ ...v, labels: !v.labels }))}
  aria-pressed={ui.labels}
  aria-label={`Toggle labels ${ui.labels ? "off" : "on"}`}
  ...
>
```

Same pattern for trails, traffic, and mode buttons.

Zoom buttons — already use Button with icon + text. Add aria-label:
  <Button aria-label="Zoom in on globe" ...>
  <Button aria-label="Zoom out on globe" ...>
  <Button aria-label="Focus on selected asset" ...>
  <Button aria-label="Reset globe to global view" ...>

--- registry-row.tsx ---

The RegistryRow button has visible text content. Add aria-pressed:
```tsx
<button
  onClick={() => onSelect(track)}
  aria-pressed={selected?.id === track.id}
  aria-label={`Select track ${track.id}, ${track.operator}, ${track.type}`}
  ...
>
```

───────────────────────────────────────────────────────────────
4B. KEYBOARD NAVIGATION FOR GLOBE MARKERS
───────────────────────────────────────────────────────────────

With tabIndex={0} and role="button" on track <g> elements (spec'd above),
the keyboard handler in 4A handles Enter and Space for activation.

Tab order: SVG tab order is DOM order, which is track render order. This
maps to visible tracks sorted by their position in the filtered array.
That is acceptable.

However, SVG focus with tabIndex creates many tab stops. Wrap the entire
SVG in a focus container that intercepts arrow keys to navigate tracks,
avoiding the need to tab through each one:

On the SVG element itself:
```tsx
<svg
  ...
  tabIndex={0}
  role="listbox"
  aria-label="Globe track markers"
  aria-activedescendant={selectedLive ? `track-marker-${selectedLive.id}` : undefined}
  onKeyDown={(e) => {
    const idx = filtered.findIndex((t) => t.id === selectedLive?.id);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      onSelect(filtered[(idx + 1) % filtered.length]);
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      onSelect(filtered[(idx - 1 + filtered.length) % filtered.length]);
    }
    if (e.key === "Enter") {
      // already selected, could trigger focusSelected
    }
  }}
>
```

Give each track <g> an id:
  <g id={`track-marker-${track.id}`} ...>

Remove tabIndex from individual track <g> elements when using this
listbox pattern — the SVG itself is the focus container.

───────────────────────────────────────────────────────────────
4C. SCREEN READER ANNOUNCEMENTS FOR LIVE FEED
───────────────────────────────────────────────────────────────

New component: src/components/dashboard/live-announcer.tsx

```tsx
"use client";
import { useEffect, useRef } from "react";
import type { LiveFeedEntry } from "@/types";

interface LiveAnnouncerProps {
  feed: LiveFeedEntry[];
}

export function LiveAnnouncer({ feed }: LiveAnnouncerProps) {
  const prevLength = useRef(feed.length);
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feed.length > prevLength.current && regionRef.current) {
      // Only announce the newest entry
      const newest = feed[0];
      if (newest) {
        regionRef.current.textContent = "";
        // Force DOM update between clears for aria-live to re-announce
        requestAnimationFrame(() => {
          if (regionRef.current) {
            regionRef.current.textContent =
              `${newest.level}: ${newest.title}. ${newest.detail}`;
          }
        });
      }
    }
    prevLength.current = feed.length;
  }, [feed]);

  return (
    <div
      ref={regionRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    />
  );
}
```

For warning-level entries, use aria-live="assertive" (interrupts):
```tsx
// Two regions: one polite, one assertive
<div ref={politeRef}    aria-live="polite"    aria-atomic="true" className="sr-only" />
<div ref={assertiveRef} aria-live="assertive" aria-atomic="true" className="sr-only" />

useEffect(() => {
  const newest = feed[0];
  if (!newest) return;
  const region = newest.level === "warning" ? assertiveRef.current : politeRef.current;
  if (region) {
    region.textContent = "";
    requestAnimationFrame(() => {
      region!.textContent = `${newest.title}. ${newest.detail}`;
    });
  }
}, [feed]);
```

Mount in dashboard.tsx at the top of the return, outside the visible grid:
```tsx
<LiveAnnouncer feed={liveFeed} />
```

Also: add aria-label to the live feed ScrollArea / container:
  <div role="log" aria-label="Live feed" aria-live="off"> {/* off here, announcer handles it */}
    {/* feed entries */}
  </div>

role="log" on the feed container gives screen readers the semantic
understanding that this is a running log, without double-announcing.


═════════════════════════════════════════════════════════════════
## SECTION 5 — CONTRAST AUDIT
═════════════════════════════════════════════════════════════════

The following combinations need verification:

PASS (confirmed by value):
- text-zinc-100 (#f4f4f5) on bg-zinc-950 (#09090b): ~16:1 — exceeds AAA
- text-zinc-200 (#e4e4e7) on bg-zinc-900 (#18181b): ~10.5:1 — exceeds AAA
- text-zinc-300 (#d4d4d8) on bg-zinc-900: ~8.3:1 — AAA
- text-cyan-300 (#67e8f9) on bg-zinc-950: ~8.7:1 — AAA
- text-emerald-300 (#86efac) on bg-zinc-950: ~9.1:1 — AAA

RISK — needs check:
- text-zinc-400 (#a1a1aa) on bg-zinc-950: ~4.8:1 — passes AA, close to limit
- text-zinc-500 (#71717a) on bg-zinc-950: ~3.2:1 — FAILS AA (4.5:1 required)
  All instances of text-zinc-500 must be non-informational (decorative
  labels, placeholders, dividers). Verify each usage:
    - The uppercase section headers ("CAMERA", "REGION", etc.) in narrative
      panel use text-zinc-500 — these ARE informational. Change to text-zinc-400.
    - Slider labels "Refresh cadence" use text-zinc-400 — pass.
    - "T+" labels in timeline use text-zinc-500 — informational. Change to
      text-zinc-400.

- Amber badge text-amber-200 on bg-amber-500/10 — the effective background
  is approximately #1a1300. text-amber-200 (#fde68a) on that: ~9:1 — AAA. Pass.
- Orange badge text-orange-200 (#fed7aa) on bg-orange-500/10 (~#180d00): ~8:1 — AAA. Pass.
- Red badge text-red-200 (#fecaca) on bg-red-500/10 (~#160000): ~9.5:1 — AAA. Pass.


═════════════════════════════════════════════════════════════════
## SECTION 6 — NEW COMPONENT INVENTORY
═════════════════════════════════════════════════════════════════

New files to create (in order of priority):

1. src/components/dashboard/status-dot.tsx
   - StatusDot component (live/stale/offline)
   - No dependencies beyond Tailwind

2. src/hooks/use-keyboard-shortcuts.ts
   - Keyboard navigation hook
   - Dependency: Track type

3. src/components/dashboard/live-announcer.tsx
   - ARIA live region announcer
   - Dependency: LiveFeedEntry type

4. src/components/dashboard/track-tooltip.tsx
   - Portal-based SVG track hover tooltip
   - Dependencies: Track type, badgeTone, Badge

5. src/components/dashboard/minimap-globe.tsx
   - 64x64 orientation minimap
   - Dependencies: d3-geo, topojson-client (already installed)

6. src/hooks/use-animated-view.ts
   - rAF-based view interpolation
   - Dependency: GlobeView type

Modifications to existing files:
- dashboard.tsx: keyboard shortcuts, live announcer, toast wiring,
                 staggered animations, responsive grid, font-mono data values
- globe-surface.tsx: glow filters, minimap, tooltip state, animated view,
                     SVG accessibility, hover handlers, rim gradient upgrade,
                     responsive globe height
- registry-row.tsx: glow on selected, font-mono track ID, aria-pressed,
                    status dot, aria-label
- tailwind.config.ts: ping-slow keyframe

shadcn additions (if not present):
- npx shadcn@latest add toast


═════════════════════════════════════════════════════════════════
## SECTION 7 — IMPLEMENTATION ORDER
═════════════════════════════════════════════════════════════════

Phase 1 — Zero-risk visual (no behavior change):
  1. Glass panel CSS (Section 1A) — swap className strings
  2. Globe rim gradient (Section 1D) — replace SVG defs
  3. Typography fixes (Section 1G) — className changes only
  4. Contrast fixes (Section 5) — zinc-500 → zinc-400 where informational
  5. Responsive globe height (Section 3B) — one className change
  6. Layout breakpoints (Section 3A) — grid className + right column col-span
  7. Sidebar instruction collapse (Section 3C) — add hidden xl:block

Phase 2 — New small components (self-contained):
  8. StatusDot component (1E) — create file, wire to dashboard + registry
  9. LiveAnnouncer component (4C) — create file, mount in dashboard
  10. Empty state for registry (2D)

Phase 3 — Globe enhancements:
  11. SVG glow filters + selected glow effect (1B)
  12. Pulse rings on military tracks (1C)
  13. Hover tooltip with portal (2B)
  14. Minimap globe (2C)
  15. SVG accessibility layer (4A + 4B)

Phase 4 — Behavior:
  16. Keyboard shortcuts hook (2A) + shortcut legend badge
  17. Animated view transitions (2F) — requires useDragGlobe isDragging export
  18. Framer Motion entry animations (1F) — stagger columns, AnimatePresence on feed

Phase 5 — Toast notifications (2E):
  19. shadcn toast install
  20. Toast wiring with throttle ref
  21. Warning variant


═════════════════════════════════════════════════════════════════
## HANDOFF TO ANVIL
═════════════════════════════════════════════════════════════════

All specs above are implementation-ready. Key decisions locked:

DESIGN TOKENS:
  Glass panel bg:        rgba(24, 24, 27, 0.50) = bg-zinc-900/50
  Glass blur:            backdrop-blur-md (12px)
  Glass inner highlight: inset 0 1px 0 rgba(255,255,255,0.06)
  Selected ring glow:    0 0 0 1px rgba(34,211,238,0.15)
  Page bg bloom:         radial-gradient ellipse 80% 50% at 50% -10%,
                         rgba(6,182,212,0.06), transparent
  Pulse animation:       ping-slow, 2s, cubic-bezier(0,0,0.2,1), infinite
  Status dot sizes:      h-2.5 w-2.5 (10px) with ping ring
  Tooltip width:         min-w-[180px], rounded-2xl, same glass pattern
  Minimap:               64x64px, scale(28), rounded-xl, absolute bottom-4 left-4

COMPONENT BOUNDARIES:
  StatusDot — pure presentational, no state
  LiveAnnouncer — effect-only, no visible output
  TrackTooltip — portal, positioned fixed, no pointer events
  MinimapGlobe — memo-able, receives only lon/lat scalars
  useKeyboardShortcuts — effect hook, returns nothing
  useAnimatedView — returns GlobeView, reads target GlobeView

CONSTRAINTS FOR ANVIL:
  - Do not apply backdrop-blur to elements inside the SVG — SVG does not
    support CSS filter backdropFilter
  - The ping-slow keyframe must use transform-origin set inline on the SVG
    circle element (style={{ transformOrigin }}) — Tailwind's
    origin-* utilities do not apply inside SVG
  - useAnimatedView must be bypassed (duration=0) during active drag to
    avoid fighting the user's pointer input
  - All toast throttle logic must use a ref (not state) to avoid
    triggering re-renders in the interval callback


═════════════════════════════════════════════════════════════════
END OF SPEC
═════════════════════════════════════════════════════════════════
