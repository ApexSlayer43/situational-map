import type { Track, LiveFeedEntry } from "@/types";

export function formatClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function buildLiveEntries(tracks: Track[], frame: number, selectedId?: string): LiveFeedEntry[] {
  const now = new Date();
  const entries: LiveFeedEntry[] = [];
  const selected = tracks.find((t) => t.id === selectedId) || tracks[0];
  const gulfTraffic = tracks.filter((t) => t.lon > 46 && t.lon < 60 && t.lat > 20 && t.lat < 30);
  const eastMedTraffic = tracks.filter((t) => t.lon > 20 && t.lon < 38 && t.lat > 28 && t.lat < 40);
  const militaryVisible = tracks.filter((t) => t.military).length;

  if (selected) {
    entries.push({
      id: `track-${frame}`,
      ts: now,
      level: selected.military ? "warning" : "info",
      title: `${selected.id} updated`,
      detail: `${selected.operator} ${selected.type} at ${selected.speed ? Math.round(selected.speed) : "--"}${selected.type === "aircraft" ? " kt" : selected.type === "vessel" ? " kn" : " km/h orbital"}.`,
    });
  }

  if (frame % 3 === 0) {
    entries.push({
      id: `gulf-${frame}`,
      ts: now,
      level: gulfTraffic.length > 4 ? "warning" : "info",
      title: "Gulf watch",
      detail: `${gulfTraffic.length} tracked assets inside Gulf / Hormuz corridor.`,
    });
  }

  if (frame % 4 === 0) {
    entries.push({
      id: `med-${frame}`,
      ts: now,
      level: eastMedTraffic.length > 5 ? "warning" : "info",
      title: "East Med corridor",
      detail: `${eastMedTraffic.length} tracked assets across the Eastern Mediterranean lane.`,
    });
  }

  if (frame % 5 === 0) {
    entries.push({
      id: `mil-${frame}`,
      ts: now,
      level: militaryVisible > 8 ? "warning" : "info",
      title: "Military picture",
      detail: `${militaryVisible} military-tagged tracks currently active in the global set.`,
    });
  }

  return entries.slice(0, 3);
}
