import {
  createAutomationAction,
  toggleAutomationAction,
  deleteAutomationAction,
  runAutomationNowAction,
} from "@/server/actions";
import type { Automation } from "@/server/db/schema";

const fmt = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

/**
 * Autonomous automations: run a goal on a cadence, each run saving a deliverable.
 * Server-rendered with action forms. The scheduler (/api/cron) runs due ones;
 * "Run now" triggers one immediately.
 */
export function AutomationsSection({
  projectId,
  automations,
  canRun,
}: {
  projectId: string;
  automations: Automation[];
  canRun: boolean;
}) {
  return (
    <section className="mt-12">
      <h2 className="label">Automations</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Autonomous agents that run on a schedule and save a deliverable each time.
        A scheduler calls <code className="text-xs">/api/cron</code> to run due
        ones — or use “Run now”.
      </p>

      {canRun && (
        <form
          action={createAutomationAction}
          className="card mt-3 flex flex-wrap items-center gap-2 p-3"
        >
          <input type="hidden" name="projectId" value={projectId} />
          <input
            name="goal"
            required
            placeholder="e.g. Draft next week's content plan"
            className="input min-w-0 flex-1"
          />
          <select name="cadence" defaultValue="weekly" className="input w-32 shrink-0">
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
          <button type="submit" className="btn btn-primary shrink-0">
            Add
          </button>
        </form>
      )}

      {automations.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No automations yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {automations.map((a) => (
            <li
              key={a.id}
              className="card flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink">{a.goal}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {a.cadence}
                  {" · "}
                  {a.enabled ? `next ${fmt(a.nextRunAt)}` : "paused"}
                  {a.lastRunAt ? ` · last ran ${fmt(a.lastRunAt)}` : ""}
                </div>
              </div>
              {canRun && (
                <div className="flex shrink-0 items-center gap-3">
                  <form action={runAutomationNowAction}>
                    <input type="hidden" name="automationId" value={a.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <button type="submit" className="btn btn-outline">
                      Run now
                    </button>
                  </form>
                  <form action={toggleAutomationAction}>
                    <input type="hidden" name="automationId" value={a.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <input type="hidden" name="enabled" value={String(!a.enabled)} />
                    <button
                      type="submit"
                      className="text-xs text-ink-soft transition hover:text-ink"
                    >
                      {a.enabled ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={deleteAutomationAction}>
                    <input type="hidden" name="automationId" value={a.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <button
                      type="submit"
                      className="text-xs text-muted transition hover:text-danger"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
