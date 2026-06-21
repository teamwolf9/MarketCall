"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";

type MessageMeta = { specialist?: string; model?: string };

/** Join a UI message's text parts for rendering. */
function renderText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function Chat({
  threadId,
  initialMessages,
  canPost,
}: {
  threadId: string;
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
          <div className="mx-auto mt-20 max-w-sm text-center">
            <p className="font-display text-lg text-ink">How can I help?</p>
            <p className="mt-2 text-sm text-ink-soft">
              Ask for a campaign plan, ad copy, or a content calendar for this
              project. Everything is a draft — nothing gets published.
            </p>
          </div>
        )}
        {messages.map((m) => {
          const meta = m.metadata as MessageMeta | undefined;
          const caption =
            m.role === "assistant" && (meta?.specialist || meta?.model)
              ? [meta?.specialist, meta?.model].filter(Boolean).join(" · ")
              : null;
          return (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "flex flex-col items-end"
                  : "flex flex-col items-start"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm leading-relaxed text-accent-ink"
                    : "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm leading-relaxed text-ink"
                }
              >
                {renderText(m) || (busy ? "…" : "")}
              </div>
              {caption && (
                <div className="ml-1 mt-1 font-mono text-[11px] text-muted">
                  {caption}
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
