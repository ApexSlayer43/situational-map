"use client";

import { useEffect } from "react";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Car } from "lucide-react";

function TrafficLayer() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    return () => {
      trafficLayer.setMap(null);
    };
  }, [map]);

  return null;
}

interface TrafficMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
}

export function TrafficMap({
  center = { lat: 40.7128, lng: -74.006 },
  zoom = 11,
}: TrafficMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <Card className="rounded-[28px] border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Car className="h-5 w-5 text-green-400" /> Street Traffic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
            <Car className="mx-auto h-8 w-8 text-zinc-600" />
            <div className="mt-2 text-sm text-zinc-500">
              Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable live traffic
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[28px] border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="h-5 w-5 text-green-400" /> Street Traffic
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Real-time Google Maps traffic layer. Green = clear, Yellow = slow, Red = heavy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <APIProvider apiKey={apiKey}>
            <Map
              defaultCenter={center}
              defaultZoom={zoom}
              mapId="traffic-dark"
              style={{ width: "100%", height: "280px" }}
              colorScheme="DARK"
              disableDefaultUI
            >
              <TrafficLayer />
            </Map>
          </APIProvider>
        </div>
      </CardContent>
    </Card>
  );
}
