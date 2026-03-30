"use client";

import { useRef, useCallback } from "react";
import type { GlobeView } from "@/types";
import { normalizeLon, clamp } from "@/lib/data/tracks";

export function useDragGlobe(setView: React.Dispatch<React.SetStateAction<GlobeView>>) {
  const dragRef = useRef<{
    x: number;
    y: number;
    lon: number;
    lat: number;
    scale: number;
  } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent, view: GlobeView) => {
      dragRef.current = { x: event.clientX, y: event.clientY, lon: view.lon, lat: view.lat, scale: view.scale };
    },
    []
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragRef.current) return;
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      const sensitivity = 140 / dragRef.current.scale;
      setView((prev) => ({
        ...prev,
        lon: normalizeLon(dragRef.current!.lon - dx * sensitivity),
        lat: clamp(dragRef.current!.lat + dy * sensitivity, -80, 80),
      }));
    },
    [setView]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}
