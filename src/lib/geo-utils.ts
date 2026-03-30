import type { GeoProjection } from "d3-geo";

export function projectedLabels<T extends { lon: number; lat: number }>(
  items: T[],
  projection: GeoProjection,
  minDistance: number
): (T & { x: number; y: number })[] {
  const accepted: (T & { x: number; y: number })[] = [];
  items.forEach((item) => {
    const p = projection([item.lon, item.lat]);
    if (!p) return;
    const clear = accepted.every(
      (existing) => (existing.x - p[0]) ** 2 + (existing.y - p[1]) ** 2 > minDistance ** 2
    );
    if (clear) accepted.push({ ...item, x: p[0], y: p[1] });
  });
  return accepted;
}
