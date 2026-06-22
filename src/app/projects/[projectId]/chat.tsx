"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useSpeechRecognition } from "@/app/_components/use-speech-recognition";
import { SpeakButton } from "@/app/_components/speak-button";

type MessageMeta = { specialist?: string; model?: string };

/** One-click starter prompts shown on an empty thread. Each routes to a
 * specialist and several exercise the calendar tools so a click produces real,
 * visible work (events on the calendar), not just advice. */
const STARTERS = [
  "Plan a 1-week content calendar for next week and add each post to the calendar.",
  "Draft 3 ad headline variants with primary text for our next launch.",
  "What's already on the calendar this month?",
  "Build an SEO content brief for our top keyword.",
];

/** Join a UI message's text parts for rendering. */
function renderText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

type ToolPart = {
  type: string;
  state?: string;
  output?: unknown;
};

/** A short, friendly date for a calendar chip. */
function chipDate(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  if (allDay) return date;
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${date}, ${time}`;
}

const CHIP_BASE =
  "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs border";
const CHIP_OK = "border-line bg-surface-2 text-ink-soft";
const CHIP_FAIL = "border-danger/30 bg-danger-soft text-danger";

/** Tool calls the assistant made on this turn, shown as compact action chips. */
function toolChips(message: UIMessage, projectId: string) {
  return (message.parts as ToolPart[])
    .filter((p) => typeof p.type === "string" && p.type.startsWith("tool-"))
    .map((p, i) => {
      const out = p.output as
        | {
            ok?: boolean;
            error?: string;
            id?: string;
            title?: string;
            startsAt?: string;
            allDay?: boolean;
            count?: number;
          }
        | undefined;
      const pending =
        p.state && p.state !== "output-available" && p.state !== "output-error";
      const failed = out?.ok === false;

      // A saved deliverable / deck links straight to its page so a click opens it.
      if (
        !pending &&
        !failed &&
        out?.id &&
        (p.type === "tool-save_deliverable" || p.type === "tool-create_presentation")
      ) {
        const isDeck = p.type === "tool-create_presentation";
        return (
          <Link
            key={i}
            href={`/projects/${projectId}/deliverables/${out.id}`}
            className={`${CHIP_BASE} ${CHIP_OK} transition hover:border-accent/40 hover:text-ink`}
          >
            {isDeck ? "📊 Built deck" : "📄 Saved deliverable"} — {out.title ?? "untitled"} ↗
          </Link>
        );
      }

      let label: string;
      if (pending) {
        label = "Working…";
      } else if (failed) {
        label = `⚠ ${out?.error ?? "Action failed"}`;
      } else if (p.type === "tool-schedule_calendar_event") {
        label = `📅 Added to calendar — ${out?.title ?? "event"}${
          out?.startsAt ? ` · ${chipDate(out.startsAt, out.allDay ?? false)}` : ""
        }`;
      } else if (p.type === "tool-list_calendar_events") {
        label = `🔎 Checked calendar — ${out?.count ?? 0} item${out?.count === 1 ? "" : "s"}`;
      } else {
        label = "✓ Done";
      }
      return (
        <div key={i} className={`${CHIP_BASE} ${failed ? CHIP_FAIL : CHIP_OK}`}>
          {label}
        </div>
      );
    });
}

export function Chat({
  threadId,
  projectId,
  initialMessages,
  canPost,
}: {
  threadId: string;
  projectId: string;
  initialMessages: UIMessage[];
  canPost: boolean;
}) {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: { threadId },
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  // Voice input: dictation appends to whatever was typed when the mic started.
  const dictationBase = useRef("");
  const { supported: micSupported, listening, toggle: toggleMic } =
    useSpeechRecognition((t) =>
      setInput((dictationBase.current ? dictationBase.current + " " : "") + t),
    );
  function onMic() {
    if (!listening) dictationBase.current = input.trim();
    toggleMic();
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-6">
        {messages.length === 0 && (
          <div className="mx-auto mt-20 max-w-md text-center">
            <p className="font-display text-lg text-ink">How can I help?</p>
            <p className="mt-2 text-sm text-ink-soft">
              Ask for a campaign plan, ad copy, or a content calendar for this
              project. Everything is a draft — nothing gets published.
            </p>
            {canPost && (
              <div className="mt-6 flex flex-col gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (busy) return;
                      sendMessage({ text: s });
                    }}
                    className="rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-left text-sm text-ink-soft transition hover:border-accent/40 hover:text-ink disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {messages.map((m) => {
          const meta = m.metadata as MessageMeta | undefined;
          const caption =
            m.role === "assistant" && (meta?.specialist || meta?.model)
              ? [meta?.specialist, meta?.model].filter(Boolean).join(" · ")
              : null;
          const text = renderText(m);
          const chips = m.role === "assistant" ? toolChips(m, projectId) : [];
          return (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "flex flex-col items-end gap-1.5"
                  : "flex flex-col items-start gap-1.5"
              }
            >
              {chips}
              {(text || (busy && chips.length === 0)) && (
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-ink"
                      : "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-ink"
                  }
                >
                  {text || (busy ? "…" : "")}
                </div>
              )}
              {(caption || (m.role === "assistant" && text)) && (
                <div className="ml-1 mt-1 flex items-center gap-3">
                  {caption && (
                    <span className="font-mono text-[11px] text-muted">
                      {caption}
                    </span>
                  )}
                  {m.role === "assistant" && text && <SpeakButton text={text} />}
                </div>
              )}
            </div>
          );
        })}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm text-muted">
              Thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">
            {error.message || "Something went wrong. Check the server logs."}
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex items-end gap-2 border-t border-line py-4"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          rows={1}
          disabled={!canPost}
          placeholder={
            canPost ? "Message MarketCall…" : "You have view-only access here."
          }
          className="input max-h-40 flex-1 resize-none disabled:opacity-50"
        />
        {micSupported && (
          <button
            type="button"
            onClick={onMic}
            disabled={!canPost || busy}
            aria-pressed={listening}
            title={listening ? "Stop dictation" : "Dictate"}
            className={
              "btn btn-outline " +
              (listening ? "animate-pulse border-accent text-accent" : "")
            }
          >
            {listening ? "● Mic" : "🎤"}
          </button>
        )}
        <button
          type="submit"
          disabled={!canPost || busy || !input.trim()}
          className="btn btn-primary"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
