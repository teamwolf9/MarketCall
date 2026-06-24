"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type ActiveJob = {
  id: string;
  kind: string;
  goal: string;
  step: string | null;
  progress: number;
  projectId: string;
  projectName: string;
  brandName: string;
};

/**
 * A small global indicator of agent work in flight (background campaign jobs).
 * Polls /api/activity and shows a floating pill on any page when agents are
 * working; hidden when idle or signed out.
 */
export function AgentActivity() {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest jobs, so the poll loop can adapt its interval without resubscribing.
  const jobsRef = useRef<ActiveJob[]>([]);
  jobsRef.current = jobs;

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch("/api/activity");
        if (alive && res.ok) {
          const data = await res.json();
          setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        } else if (alive) {
          setJobs([]);
        }
      } catch {
        if (alive) setJobs([]);
      }
      // Poll faster while something is running, slower when idle.
      if (alive) {
        timer.current = setTimeout(poll, jobsRef.current.length ? 3000 : 8000);
      }
    }
    poll();
    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {open && (
        <div className="card mb-2 w-72 overflow-hidden p-0 shadow-lg">
          <div className="border-b border-line px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted">
            Agents at work
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {jobs.map((j) => (
              <li key={j.id} className="px-4 py-3">
                <Link
                  href={`/projects/${j.projectId}/jobs`}
                  className="block"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                    </span>
                    <span className="truncate text-sm font-medium text-ink">
                      {j.step ?? "Working…"}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-xs text-muted">
                    {j.goal} · {j.brandName} / {j.projectName}
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${Math.max(4, j.progress)}%` }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-medium text-ink shadow-md transition hover:shadow-lg"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
        </span>
        {jobs.length} {jobs.length === 1 ? "agent" : "agents"} working
      </button>
    </div>
  );
}
