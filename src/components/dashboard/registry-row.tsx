"use client";

import { Badge } from "@/components/ui/badge";
import type { Track } from "@/types";
import { TrackIcon } from "./track-icon";
import { badgeTone } from "@/lib/data/styles";

interface RegistryRowProps {
  track: Track;
  selected: Track | null;
  onSelect: (track: Track) => void;
}

export function RegistryRow({ track, selected, onSelect }: RegistryRowProps) {
  return (
    <button
      onClick={() => onSelect(track)}
      className={`w-full rounded-2xl border p-3 text-left transition ${
        selected?.id === track.id
          ? "border-cyan-400/50 bg-zinc-900"
          : "border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-zinc-900 p-2">
            <TrackIcon type={track.type} />
          </div>
          <div>
            <div className="font-medium text-zinc-100">{track.id}</div>
            <div className="text-xs text-zinc-400">{track.operator}</div>
          </div>
        </div>
        <Badge className={badgeTone(track.type, track.category)}>{track.category}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-zinc-400">
        <div>{track.type}</div>
        <div>Lat {track.lat.toFixed(1)}</div>
        <div>Lon {track.lon.toFixed(1)}</div>
      </div>
    </button>
  );
}
