"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onTogglePlay: () => void;
  onReset: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFocusSearch: () => void;
  onToggleLabels: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case " ":
          e.preventDefault();
          handlers.onTogglePlay();
          break;
        case "r":
        case "R":
          if (!e.metaKey && !e.ctrlKey) {
            handlers.onReset();
          }
          break;
        case "ArrowDown":
        case "j":
          e.preventDefault();
          handlers.onNextTrack();
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          handlers.onPrevTrack();
          break;
        case "=":
        case "+":
          e.preventDefault();
          handlers.onZoomIn();
          break;
        case "-":
          e.preventDefault();
          handlers.onZoomOut();
          break;
        case "/":
          e.preventDefault();
          handlers.onFocusSearch();
          break;
        case "l":
        case "L":
          if (!e.metaKey && !e.ctrlKey) {
            handlers.onToggleLabels();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}
