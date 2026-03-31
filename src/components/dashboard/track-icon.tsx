"use client";

import { Plane, Satellite, Ship, Activity } from "lucide-react";
import type { TrackType } from "@/types";

export function TrackIcon({ type }: { type: TrackType }) {
  if (type === "aircraft") return <Plane className="h-4 w-4" />;
  if (type === "satellite") return <Satellite className="h-4 w-4" />;
  if (type === "seismic") return <Activity className="h-4 w-4" />;
  return <Ship className="h-4 w-4" />;
}
