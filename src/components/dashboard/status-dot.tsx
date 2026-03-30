"use client";

type Status = "live" | "stale" | "offline";

interface StatusDotProps {
  status: Status;
  className?: string;
}

export function StatusDot({ status, className = "" }: StatusDotProps) {
  const colors: Record<Status, { dot: string; ring: string }> = {
    live: { dot: "bg-emerald-400", ring: "bg-emerald-400/40" },
    stale: { dot: "bg-amber-400", ring: "bg-amber-400/40" },
    offline: { dot: "bg-zinc-500", ring: "" },
  };

  const { dot, ring } = colors[status];

  return (
    <span className={`relative inline-flex h-2.5 w-2.5 ${className}`}>
      {status !== "offline" && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ring} opacity-75`} />
      )}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dot}`} />
    </span>
  );
}
