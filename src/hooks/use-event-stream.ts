"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Track } from "@/types";

interface StreamState {
  connected: boolean;
  tracks: Track[];
  lastUpdate: Date | null;
  errors: string[];
}

export function useEventStream(enabled: boolean) {
  const [state, setState] = useState<StreamState>({
    connected: false,
    tracks: [],
    lastUpdate: null,
    errors: [],
  });

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Close existing connection
    sourceRef.current?.close();

    const es = new EventSource("/api/stream");
    sourceRef.current = es;

    es.addEventListener("connected", () => {
      setState((prev) => ({ ...prev, connected: true, errors: [] }));
    });

    es.addEventListener("aircraft", (event) => {
      try {
        const data = JSON.parse(event.data);
        setState((prev) => ({
          ...prev,
          tracks: data.tracks || [],
          lastUpdate: new Date(),
        }));
      } catch {
        // ignore parse errors
      }
    });

    es.addEventListener("heartbeat", () => {
      setState((prev) => ({ ...prev, lastUpdate: new Date() }));
    });

    es.addEventListener("error", (event) => {
      if (es.readyState === EventSource.CLOSED) {
        setState((prev) => ({
          ...prev,
          connected: false,
          errors: ["Stream disconnected, reconnecting..."],
        }));

        // Auto-reconnect after 5s
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    });

    es.onerror = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      sourceRef.current?.close();
      setState({
        connected: false,
        tracks: [],
        lastUpdate: null,
        errors: [],
      });
    }

    return () => {
      sourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, connect]);

  const disconnect = useCallback(() => {
    sourceRef.current?.close();
    setState((prev) => ({ ...prev, connected: false }));
  }, []);

  return { ...state, disconnect };
}
