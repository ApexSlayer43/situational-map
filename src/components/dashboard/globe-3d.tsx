"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Track, GlobeView, UIState, TrackHistory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, ZoomIn, ZoomOut, LocateFixed, RotateCcw } from "lucide-react";
import {
  REGION_PRESETS,
  REGION_KEYS,
} from "@/lib/data/constants";
import { tone } from "@/lib/data/styles";

// Set Cesium base URL before any import
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
}

interface Globe3DProps {
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

const REGION_CAMERAS: Record<string, { lon: number; lat: number; height: number }> = {
  global: { lon: 0, lat: 15, height: 20000000 },
  atlantic: { lon: -35, lat: 35, height: 8000000 },
  europe: { lon: 20, lat: 38, height: 5000000 },
  gulf: { lon: 54, lat: 24, height: 2500000 },
  eastAsia: { lon: 125, lat: 28, height: 5000000 },
  usaEast: { lon: -78, lat: 34, height: 4000000 },
};

export function Globe3D({
  tracks,
  history,
  selected,
  onSelect,
  regionKey,
  setRegionKey,
  view,
  setView,
  ui,
  focusSelected,
}: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const entitiesRef = useRef<Map<string, any>>(new Map());
  const cesiumRef = useRef<typeof import("cesium") | null>(null);

  // Initialize Cesium viewer
  useEffect(() => {
    if (!containerRef.current) return;

    let destroyed = false;

    import("cesium").then((Cesium) => {
      if (destroyed || !containerRef.current) return;

      cesiumRef.current = Cesium;

      // Import CSS
      import("cesium/Build/Cesium/Widgets/widgets.css");

      Cesium.RequestScheduler.requestsByServer["tile.googleapis.com:443"] = 18;

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      const viewerOptions: any = {
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        vrButton: false,
        infoBox: false,
        selectionIndicator: false,
        requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        creditContainer: document.createElement("div"),
      };

      // Disable default globe and imagery when using Google 3D Tiles
      if (apiKey) {
        viewerOptions.imageryProvider = false;
        viewerOptions.globe = false;
      }

      const viewer = new Cesium.Viewer(containerRef.current, viewerOptions);

      viewerRef.current = viewer;

      // Load Google 3D Tiles if API key is available
      if (apiKey) {
        Cesium.Cesium3DTileset.fromUrl(
          `https://tile.googleapis.com/v1/3dtiles/root.json?key=${apiKey}`,
          { showCreditsOnScreen: true }
        ).then((tileset: any) => {
          if (!destroyed) {
            viewer.scene.primitives.add(tileset);
          }
        }).catch(() => {
          // Fallback: re-enable default globe if Google tiles fail
          if (!destroyed && viewer.scene) {
            viewer.scene.globe = new Cesium.Globe(Cesium.Ellipsoid.WGS84);
          }
        });
      }

      // Set initial camera
      const cam = REGION_CAMERAS[regionKey] || REGION_CAMERAS.global;
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, cam.height),
      });

      // Dark sky
      viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#09090b");
      if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false;
      if (viewer.scene.sun) viewer.scene.sun.show = false;
      if (viewer.scene.moon) viewer.scene.moon.show = false;

      // Click handler
      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const picked = viewer.scene.pick(click.position);
        if (Cesium.defined(picked) && picked.id?.trackData) {
          onSelect(picked.id.trackData);
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      viewer.scene.requestRender();
    });

    return () => {
      destroyed = true;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Update entities when tracks change
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = cesiumRef.current;
    if (!viewer || !Cesium || viewer.isDestroyed()) return;

    const existing = entitiesRef.current;
    const currentIds = new Set(tracks.map((t) => t.id));

    // Remove entities for tracks that no longer exist
    for (const [id, entity] of existing) {
      if (!currentIds.has(id)) {
        viewer.entities.remove(entity);
        existing.delete(id);
      }
    }

    // Add or update entities
    for (const track of tracks) {
      const color = Cesium.Color.fromCssColorString(tone(track));
      const position = Cesium.Cartesian3.fromDegrees(
        track.lon,
        track.lat,
        track.type === "satellite" ? track.altitude * 100 : track.type === "aircraft" ? (track.altitude || 10000) * 0.3048 : 500
      );

      const isSelected = selected?.id === track.id;

      if (existing.has(track.id)) {
        const entity = existing.get(track.id);
        entity.position = position;
        entity.point.color = color;
        entity.point.pixelSize = isSelected ? 14 : track.type === "seismic" ? Math.max(8, (track.mag ?? 3) * 3) : track.type === "satellite" ? 6 : 8;
        entity.point.outlineColor = isSelected ? Cesium.Color.WHITE : color.withAlpha(0.5);
        entity.point.outlineWidth = isSelected ? 3 : 1;
      } else {
        const entity = viewer.entities.add({
          position,
          point: {
            pixelSize: isSelected ? 14 : track.type === "seismic" ? Math.max(8, (track.mag ?? 3) * 3) : track.type === "satellite" ? 6 : 8,
            color,
            outlineColor: isSelected ? Cesium.Color.WHITE : color.withAlpha(0.5),
            outlineWidth: isSelected ? 3 : 1,
            scaleByDistance: new Cesium.NearFarScalar(1e3, 1.5, 1e7, 0.5),
          },
          label: ui.labels
            ? {
                text: track.type === "seismic" ? `M${track.mag?.toFixed(1)}` : track.id,
                font: "11px monospace",
                fillColor: color,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                pixelOffset: new Cesium.Cartesian2(12, -8),
                scaleByDistance: new Cesium.NearFarScalar(1e3, 1, 1e7, 0.3),
                distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 5e6),
              }
            : undefined,
        });
        (entity as any).trackData = track;
        existing.set(track.id, entity);
      }
    }

    viewer.scene.requestRender();
  }, [tracks, selected, ui.labels]);

  // Fly to region when region changes
  const flyToRegion = useCallback(
    (key: string) => {
      const viewer = viewerRef.current;
      const Cesium = cesiumRef.current;
      if (!viewer || !Cesium || viewer.isDestroyed()) return;

      const cam = REGION_CAMERAS[key] || REGION_CAMERAS.global;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(cam.lon, cam.lat, cam.height),
        duration: 1.5,
      });
    },
    []
  );

  useEffect(() => {
    flyToRegion(regionKey);
  }, [regionKey, flyToRegion]);

  return (
    <div className="space-y-4">
      {/* Region buttons */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-zinc-100">Areas</div>
            <div className="text-xs text-zinc-400">
              Select a theater, then orbit and zoom the 3D globe.
            </div>
          </div>
          <Badge className="border-zinc-700 bg-zinc-900 text-zinc-100">
            {REGION_PRESETS[regionKey]?.name ?? "Custom"}
          </Badge>
        </div>
        <div className="grid w-full grid-cols-3 gap-1.5 lg:grid-cols-6">
          {REGION_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => {
                setRegionKey(key);
                setView(REGION_PRESETS[key]);
                flyToRegion(key);
              }}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                regionKey === key
                  ? "bg-cyan-500/20 text-cyan-200 border border-cyan-400/40"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:border-zinc-600"
              }`}
            >
              {REGION_PRESETS[key].name}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Globe */}
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
            <Badge className="border-yellow-400/20 bg-yellow-400/10 text-yellow-200">
              {tracks.filter((t) => t.type === "seismic").length} seismic
            </Badge>
          </div>
          <div className="text-xs text-zinc-400">
            Drag to orbit. Scroll to zoom. Click a marker to inspect.
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-zinc-800 bg-black">
          <div
            ref={containerRef}
            className="h-[50vh] min-h-[380px] max-h-[680px] w-full"
          />
        </div>
      </div>
    </div>
  );
}
