import type { Track, TrackType, TrackCategory } from "@/types";

export function tone(track: Track): string {
  if (track.type === "aircraft") return track.category === "military" ? "#fb923c" : "#67e8f9";
  if (track.type === "satellite") return track.category === "military" ? "#fb7185" : "#c4b5fd";
  if (track.type === "seismic") {
    const mag = track.mag ?? 0;
    if (mag >= 6) return "#ef4444";   // red — major
    if (mag >= 4.5) return "#f97316"; // orange — moderate
    return "#facc15";                  // yellow — light
  }
  return track.category === "military" ? "#fda4af" : "#86efac";
}

export function badgeTone(type?: TrackType, category?: TrackCategory): string {
  if (type === "aircraft")
    return category === "military"
      ? "bg-orange-500/15 text-orange-200 border-orange-400/20"
      : "bg-cyan-500/15 text-cyan-200 border-cyan-400/20";
  if (type === "satellite")
    return category === "military"
      ? "bg-rose-500/15 text-rose-200 border-rose-400/20"
      : "bg-violet-500/15 text-violet-200 border-violet-400/20";
  if (type === "seismic")
    return "bg-yellow-500/15 text-yellow-200 border-yellow-400/20";
  return category === "military"
    ? "bg-pink-500/15 text-pink-200 border-pink-400/20"
    : "bg-emerald-500/15 text-emerald-200 border-emerald-400/20";
}
