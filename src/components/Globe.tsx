import { lazy, Suspense, useEffect, useState } from "react";

const GlobeCanvas = lazy(() => import("./GlobeCanvas"));

export function Globe() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-full border-2 border-sky-500/30 border-t-sky-400 spin-slow" />
          <p className="text-xs tracking-wide text-slate-500">Loading Earth…</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full border-2 border-sky-500/30 border-t-sky-400 spin-slow" />
        </div>
      }
    >
      <GlobeCanvas />
    </Suspense>
  );
}
