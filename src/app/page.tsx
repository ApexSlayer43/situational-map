"use client";

import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import("@/components/dashboard/dashboard"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-zinc-700 border-t-cyan-400" />
        <p>Initializing theater globe&hellip;</p>
      </div>
    </div>
  ),
});

export default function Page() {
  return <Dashboard />;
}
