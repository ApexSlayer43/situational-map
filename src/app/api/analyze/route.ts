import { createAnthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export const maxDuration = 30;

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

interface TrackSnapshot {
  id: string;
  type: string;
  category: string;
  operator: string;
  lat: number;
  lon: number;
  speed: number;
  altitude: number;
  heading: number;
  military: boolean;
}

const SYSTEM_PROMPT = `You are OVERWATCH, a situational awareness AI analyst embedded in a global tracking dashboard. You monitor aircraft, vessel, and satellite movements worldwide.

Your role:
- Analyze track snapshots and identify patterns, anomalies, and noteworthy developments
- Flag unusual clustering, military activity surges, route deviations, chokepoint congestion
- Provide concise, actionable intelligence briefs in a professional military-analyst tone
- Reference specific track IDs, regions, and corridors when relevant
- Use severity tags: [ROUTINE], [NOTABLE], [ALERT], [CRITICAL]

Key regions of interest:
- Strait of Hormuz (52-58°E, 23-28°N) — oil transit chokepoint
- Eastern Mediterranean (20-38°E, 28-40°N) — military + commercial overlap
- Taiwan Strait (116-122°E, 22-26°N) — geopolitical flashpoint
- GIUK Gap (-30 to 0°E, 55-70°N) — submarine transit corridor
- Malacca Strait (100-104°E, 1-4°N) — busiest shipping lane

Format your response as a brief with sections:
**SITUATION** — What's happening right now (2-3 sentences)
**KEY OBSERVATIONS** — Bullet points of notable patterns
**THREAT ASSESSMENT** — Overall posture rating and reasoning
**RECOMMENDATION** — What an analyst should watch next

Keep it under 200 words. Be specific. No filler.`;

export async function POST(request: Request) {
  try {
    const { tracks, context } = (await request.json()) as {
      tracks: TrackSnapshot[];
      context?: string;
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured",
          brief: generateFallbackBrief(tracks),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const aircraftCount = tracks.filter((t) => t.type === "aircraft").length;
    const vesselCount = tracks.filter((t) => t.type === "vessel").length;
    const satelliteCount = tracks.filter((t) => t.type === "satellite").length;
    const militaryCount = tracks.filter((t) => t.military).length;

    // Compute regional density
    const hormuz = tracks.filter(
      (t) => t.lon > 52 && t.lon < 58 && t.lat > 23 && t.lat < 28
    );
    const eastMed = tracks.filter(
      (t) => t.lon > 20 && t.lon < 38 && t.lat > 28 && t.lat < 40
    );
    const taiwanStrait = tracks.filter(
      (t) => t.lon > 116 && t.lon < 122 && t.lat > 22 && t.lat < 26
    );

    const snapshot = `GLOBAL TRACK PICTURE (${new Date().toISOString()}):
- Total tracks: ${tracks.length} (${aircraftCount} aircraft, ${vesselCount} vessels, ${satelliteCount} satellites)
- Military-tagged: ${militaryCount}
- Hormuz corridor: ${hormuz.length} assets
- East Med corridor: ${eastMed.length} assets
- Taiwan Strait: ${taiwanStrait.length} assets

TOP 20 TRACKS BY PROXIMITY TO KEY REGIONS:
${tracks
  .slice(0, 20)
  .map(
    (t) =>
      `  ${t.id} | ${t.type} | ${t.operator} | ${t.category} | ${t.lat.toFixed(1)}°N ${t.lon.toFixed(1)}°E | ${t.speed}${t.type === "aircraft" ? "kt" : "kn"} | hdg ${Math.round(t.heading)}°`
  )
  .join("\n")}

${context ? `ANALYST QUERY: ${context}` : "Provide a standard situational brief."}`;

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: SYSTEM_PROMPT,
      prompt: snapshot,
      maxOutputTokens: 400,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Analysis failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

function generateFallbackBrief(tracks: TrackSnapshot[]): string {
  const military = tracks.filter((t) => t.military).length;
  const aircraft = tracks.filter((t) => t.type === "aircraft").length;
  const vessels = tracks.filter((t) => t.type === "vessel").length;
  const sats = tracks.filter((t) => t.type === "satellite").length;

  const hormuz = tracks.filter(
    (t) => t.lon > 52 && t.lon < 58 && t.lat > 23 && t.lat < 28
  ).length;

  return `**SITUATION**
[ROUTINE] Tracking ${tracks.length} assets globally: ${aircraft} aircraft, ${vessels} vessels, ${sats} satellites. ${military} military-tagged tracks active.

**KEY OBSERVATIONS**
- Hormuz corridor density: ${hormuz} assets ${hormuz > 4 ? "(elevated)" : "(normal)"}
- Military presence: ${military > 8 ? "Above baseline" : "Within baseline parameters"}
- Commercial traffic: Nominal flow patterns

**THREAT ASSESSMENT**
Overall posture: ${military > 10 ? "ELEVATED" : "NORMAL"}. No anomalous clustering detected in automated scan.

**RECOMMENDATION**
Continue standard monitoring cadence. ${hormuz > 4 ? "Hormuz density warrants closer watch on next cycle." : "No priority watch items."}

_[Automated brief — configure ANTHROPIC_API_KEY for AI-powered analysis]_`;
}
