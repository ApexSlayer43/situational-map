"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Brain, Loader2, Send, Zap } from "lucide-react";
import type { Track } from "@/types";

interface AnalystPanelProps {
  tracks: Track[];
}

export function AnalystPanel({ tracks }: AnalystPanelProps) {
  const [query, setQuery] = useState("");
  const [lastBrief, setLastBrief] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fallbackBrief, setFallbackBrief] = useState<string | null>(null);

  const requestBrief = useCallback(
    async (context?: string) => {
      setIsAnalyzing(true);
      setFallbackBrief(null);

      try {
        const snapshot = tracks.slice(0, 50).map((t) => ({
          id: t.id,
          type: t.type,
          category: t.category,
          operator: t.operator,
          lat: t.lat,
          lon: t.lon,
          speed: t.speed,
          altitude: t.altitude,
          heading: t.heading,
          military: t.military,
        }));

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tracks: snapshot, context }),
        });

        const contentType = res.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
          // Fallback response (no API key)
          const data = await res.json();
          setFallbackBrief(data.brief || data.error);
          setLastBrief(null);
        } else {
          // Streaming response
          const reader = res.body?.getReader();
          const decoder = new TextDecoder();
          let accumulated = "";

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });

              // Parse SSE data chunks from Vercel AI SDK
              const lines = chunk.split("\n");
              for (const line of lines) {
                if (line.startsWith("0:")) {
                  // Text delta from AI SDK stream protocol
                  try {
                    const text = JSON.parse(line.slice(2));
                    accumulated += text;
                    setLastBrief(accumulated);
                  } catch {
                    // Not valid JSON, skip
                  }
                }
              }
            }
          }

          if (!accumulated) {
            setLastBrief("Analysis complete but no content received.");
          }
        }
      } catch (err) {
        setFallbackBrief("Analysis request failed. Check network connection.");
      } finally {
        setIsAnalyzing(false);
      }
    },
    [tracks]
  );

  const displayBrief = lastBrief || fallbackBrief;

  return (
    <Card className="rounded-[28px] border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-violet-400" />
          OVERWATCH AI
        </CardTitle>
        <CardDescription className="text-zinc-400">
          AI-powered situational analysis of the global track picture.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            className="justify-start border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-violet-400/50 hover:bg-violet-500/10"
            onClick={() => requestBrief()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4 text-violet-400" />
            )}
            Situation brief
          </Button>
          <Button
            variant="outline"
            className="justify-start border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-violet-400/50 hover:bg-violet-500/10"
            onClick={() => requestBrief("Focus on military activity and any anomalous patterns")}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4 text-amber-400" />
            )}
            Threat scan
          </Button>
        </div>

        {/* Custom query */}
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask OVERWATCH anything..."
            className="border-zinc-700 bg-zinc-950"
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                requestBrief(query.trim());
                setQuery("");
              }
            }}
          />
          <Button
            variant="outline"
            className="border-zinc-700 bg-zinc-950 text-zinc-100"
            onClick={() => {
              if (query.trim()) {
                requestBrief(query.trim());
                setQuery("");
              }
            }}
            disabled={isAnalyzing || !query.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Analysis output */}
        {isAnalyzing && !displayBrief && (
          <div className="flex items-center gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
            <div>
              <div className="text-sm font-medium text-violet-200">Analyzing...</div>
              <div className="text-xs text-zinc-400">
                Processing {tracks.length} tracks across global theater
              </div>
            </div>
          </div>
        )}

        {displayBrief && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge className="border-violet-400/20 bg-violet-500/10 text-violet-200">
                {isAnalyzing ? "Streaming..." : "Analysis complete"}
              </Badge>
              <div className="text-xs text-zinc-500">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="prose prose-invert prose-sm max-w-none text-sm text-zinc-300 [&_strong]:text-zinc-100 [&_li]:text-zinc-300">
                {displayBrief.split("\n").map((line, i) => {
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return (
                      <h4 key={i} className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                        {line.replace(/\*\*/g, "")}
                      </h4>
                    );
                  }
                  if (line.startsWith("- ")) {
                    return (
                      <div key={i} className="flex gap-2 text-sm">
                        <span className="text-violet-400">•</span>
                        <span>{line.slice(2)}</span>
                      </div>
                    );
                  }
                  if (line.includes("[CRITICAL]")) {
                    return (
                      <p key={i} className="text-red-300">
                        {line}
                      </p>
                    );
                  }
                  if (line.includes("[ALERT]")) {
                    return (
                      <p key={i} className="text-amber-300">
                        {line}
                      </p>
                    );
                  }
                  if (line.trim()) {
                    return <p key={i}>{line}</p>;
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        )}

        {!displayBrief && !isAnalyzing && (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
            <Brain className="mx-auto h-8 w-8 text-zinc-600" />
            <div className="mt-2 text-sm text-zinc-500">
              Request a situation brief or ask a specific question
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              OVERWATCH analyzes all visible tracks in real-time
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
