"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type JobStatus = {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed";
  progress: number;
  step?: string | null;
  result?: { summary?: string } | null;
  error?: string | null;
};

/**
 * Kicks off a campaign job and polls its status until it settles. State lives
 * server-side (the jobs row), so this is a thin observer — if the user reloads,
 * the jobs list still shows the run; this just gives live progress for the one
 * they just launched. On completion it refreshes the server components so the
 * new deliverables/events and the job list appear.
 */
export function CampaignLauncher({
  projectId,
  canRun,
}: {
  projectId: string;
  canRun: boolean;
}) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [job, setJob] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const active = job?.status === "queued" || job?.status === "running";

  function startPolling(id: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await fetch(`/api/jobs/${id}`);
      if (!r.ok) return;
      const j: JobStatus = await r.json();
      setJob(j);
      if (j.status === "succeeded" || j.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        router.refresh(); // surface new deliverables/events + the job list
      }
    }, 1500);
  }

  async function launch() {
    const g = goal.trim();
    if (!g || launching || active) return;
    setError(null);
    setLaunching(true);
    try {
      const r = await fetch("/api/jobs/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, goal: g }),
      });
      if (!r.ok) {
        const t = (await r.json().catch(() => ({}))) as { error?: string };
        setError(t.error || `Couldn't start the job (${r.status}).`);
        return;
      }
      const { jobId } = (await r.json()) as { jobId: string };
      setGoal("");
      setJob({ id: jobId, status: "queued", progress: 0, step: "Queued…" });
      startPolling(jobId);
    } catch {
      setError("Network error starting the job.");
    } finally {
      setLaunching(false);
    }
  }

  if (!canRun) {
    return (
      <p className="text-sm text-muted">
        You need editor access to run campaign generation.
      </p>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-lg text-ink">Generate a campaign</h2>
      <p className="mt-1 text-sm text-ink-soft">
        A long run: the assistant drafts a strategy, builds a content calendar
        (added to the calendar), and writes ad copy — saved as deliverables. It
        keeps running if you navigate away.
      </p>

      <textarea
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        rows={2}
        disabled={active || launching}
        placeholder="e.g. Spring sale launch for our running-shoe line, 3-week push"
        className="input mt-4 w-full resize-none disabled:opacity-60"
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={launch}
          disabled={!goal.trim() || active || launching}
          className="btn btn-primary"
        >
          {active ? "Running…" : launching ? "Starting…" : "Generate campaign"}
        </button>
        {error && <span className="text-sm text-danger">{error}</span>}
      </div>

      {job && (
        <div className="mt-5">
          {active && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-soft">{job.step ?? "Working…"}</span>
                <span className="font-mono text-xs text-muted">{job.progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${Math.max(5, job.progress)}%` }}
                />
              </div>
            </>
          )}
          {job.status === "succeeded" && (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent-hover">
              ✓ {job.result?.summary ?? "Campaign generated."} See the
              Deliverables and Calendar tabs.
            </p>
          )}
          {job.status === "failed" && (
            <p className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
              ⚠ {job.error ?? "The run failed."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
