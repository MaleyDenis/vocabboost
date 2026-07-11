import { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState("...");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setHealth(d.status ?? "unknown"))
      .catch(() => setHealth("error"));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-900">
      <h1 className="text-3xl font-semibold">VocabBoost</h1>
      <p className="text-slate-500">Skeleton is running.</p>
      <p className="text-sm">
        API health: <span className="font-mono">{health}</span>
      </p>
    </div>
  );
}
