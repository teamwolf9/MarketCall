"use client";

import { useState } from "react";
import Link from "next/link";
import {
  visibleSequence,
  type IntakeAnswers,
} from "@/server/intake/questions";
import { saveBriefField } from "@/server/intake/actions";

export function GuidedBrief({
  projectId,
  initialAnswers,
  assistEnabled,
}: {
  projectId: string;
  initialAnswers: IntakeAnswers;
  assistEnabled: boolean;
}) {
  const [answers, setAnswers] = useState<IntakeAnswers>(initialAnswers);
  // Start where they left off: first unanswered question in the visible set.
  const [idx, setIdx] = useState(() => {
    const seq = visibleSequence(initialAnswers);
    const i = seq.findIndex((s) => !(initialAnswers[s.field.id] ?? "").trim());
    return i === -1 ? seq.length : i;
  });
  const [value, setValue] = useState(() => {
    const seq = visibleSequence(initialAnswers);
    const i = seq.findIndex((s) => !(initialAnswers[s.field.id] ?? "").trim());
    const start = i === -1 ? seq.length : i;
    return start < seq.length ? (initialAnswers[seq[start].field.id] ?? "") : "";
  });
  const [saving, setSaving] = useState(false);
  const [assisting, setAssisting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seq = visibleSequence(answers);
  const total = seq.length;
  const answeredCount = seq.filter((s) =>
    (answers[s.field.id] ?? "").trim(),
  ).length;

  function jump(toIdx: number, ans: IntakeAnswers) {
    const s = visibleSequence(ans);
    const clamped = Math.max(0, Math.min(toIdx, s.length));
    setIdx(clamped);
    setValue(clamped < s.length ? (ans[s[clamped].field.id] ?? "") : "");
  }

  async function saveAndNext() {
    if (idx >= total) return;
    const fieldId = seq[idx].field.id;
    const v = value.trim();
    let nextAnswers = answers;
    if (v) {
      setSaving(true);
      const ok = await saveBriefField(projectId, fieldId, v);
      setSaving(false);
      if (!ok) {
        setError("Couldn't save that — please try again.");
        return;
      }
      nextAnswers = { ...answers, [fieldId]: v };
      setAnswers(nextAnswers);
    }
    setError(null);
    // Advance relative to the (possibly newly expanded) visible sequence.
    const nextSeq = visibleSequence(nextAnswers);
    const here = nextSeq.findIndex((s) => s.field.id === fieldId);
    jump(here + 1, nextAnswers);
  }

  function skip() {
    if (idx >= total) return;
    const fieldId = seq[idx].field.id;
    const here = seq.findIndex((s) => s.field.id === fieldId);
    setError(null);
    jump(here + 1, answers);
  }

  async function helpMeWrite() {
    const { field } = seq[idx];
    setAssisting(true);
    setError(null);
    try {
      const res = await fetch("/api/brief/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, fieldId: field.id, draft: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't draft an answer.");
      setValue(data.text || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't draft an answer.");
    } finally {
      setAssisting(false);
    }
  }

  // Completion screen.
  if (idx >= total) {
    return (
      <div className="rise mx-auto max-w-xl py-10 text-center">
        <div className="font-display text-3xl font-semibold text-ink">
          You&apos;re all set 🎉
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          You&apos;ve answered {answeredCount} of {total} questions. The assistant
          will now work from everything you shared — strategy, copy, and
          calendars will all reflect this project.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href={`/projects/${projectId}/brief`} className="btn btn-outline">
            Review the full brief
          </Link>
          <Link href={`/projects/${projectId}`} className="btn btn-primary">
            Start chatting
          </Link>
        </div>
        {answeredCount < total && (
          <button
            onClick={() => jump(0, answers)}
            className="mt-6 text-sm text-accent hover:text-accent-hover"
          >
            Go back and fill in the ones I skipped
          </button>
        )}
      </div>
    );
  }

  const { sectionTitle, field } = seq[idx];
  const pct = Math.round(((idx + 1) / total) * 100);

  return (
    <div className="rise mx-auto max-w-xl py-8">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span className="label">{sectionTitle}</span>
        <span>
          Question {idx + 1} of {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Question */}
      <div className="mt-8">
        <h2 className="font-display text-2xl font-semibold leading-snug text-ink">
          {field.label}
          {field.required && <span className="ml-1 text-accent">*</span>}
        </h2>
        {field.help && (
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            {field.help}
          </p>
        )}
        {field.example && field.type !== "select" && (
          <p className="mt-3 rounded-lg surface-inset px-3 py-2 text-sm text-muted">
            <span className="font-medium text-ink-soft">Example:</span>{" "}
            {field.example}
          </p>
        )}
      </div>

      {/* Answer */}
      <div className="mt-5">
        {field.type === "select" ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input"
          >
            <option value="">Choose one…</option>
            {field.options?.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={field.type === "text" ? 2 : 4}
            placeholder={field.placeholder ?? "Type your answer…"}
            className="input resize-y"
          />
        )}

        {field.type !== "select" && assistEnabled && (
          <button
            onClick={helpMeWrite}
            disabled={assisting}
            className="btn btn-ghost mt-2 text-accent disabled:opacity-50"
          >
            {assisting ? "Drafting…" : "✨ Help me write this"}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={() => jump(idx - 1, answers)}
          disabled={idx === 0}
          className="btn btn-ghost disabled:opacity-30"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <button onClick={skip} className="btn btn-ghost">
            Skip
          </button>
          <button
            onClick={saveAndNext}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? "Saving…" : "Save & continue"}
          </button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Your answers save as you go — leave any time and pick up where you left off.
      </p>
    </div>
  );
}
