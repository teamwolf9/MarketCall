"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { marked } from "marked";
import type { Editor } from "@tiptap/react";

type Meta = { specialist?: string; model?: string };

function renderText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function DeliverableChat({
  deliverableId,
  editor,
}: {
  deliverableId: string;
  editor: Editor | null;
}) {
  const [input, setInput] = useState("");
  // Read the live document at send-time so the agent sees unsaved edits.
  const docRef = useRef(() => editor?.getText() ?? "");
  docRef.current = () => editor?.getText() ?? "";

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/deliverables/${deliverableId}/chat`,
      prepareSendMessagesRequest: ({ messages, body }) => ({
        body: { ...body, messages, document: docRef.current() },
      }),
    }),
  });
  const busy = status === "submitted" || status === "streaming";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || busy) return;
    sendMessage({ text: t });
    setInput("");
  }

  function insert(text: string) {
    if (!editor || !text.trim()) return;
    const html = marked.parse(text, { async: false }) as string;
    editor.chain().focus().insertContent(html).run();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-8 text-center text-sm text-ink-soft">
            Ask the agents about this document — “tighten the intro”, “add a
            section on pricing”, “make it more on-brand”. Insert any reply
            straight into the doc.
          </div>
        )}
        {messages.map((m) => {
          const text = renderText(m);
          const meta = m.metadata as Meta | undefined;
          return (
            <div
              key={m.id}
              className={m.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}
            >
              <div
                className={
                  m.role === "user"
                    ? "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-accent-ink"
                    : "max-w-[92%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-surface-2 px-3.5 py-2 text-sm text-ink"
                }
              >
                {text || (busy ? "…" : "")}
              </div>
              {m.role === "assistant" && text && (
                <div className="ml-1 mt-1 flex items-center gap-2">
                  {meta?.specialist && (
                    <span className="font-mono text-[11px] text-muted">
                      {meta.specialist}
                    </span>
                  )}
                  {editor && (
                    <button
                      onClick={() => insert(text)}
                      className="text-[11px] font-medium text-accent hover:text-accent-hover"
                    >
                      ↳ Insert into document
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Routing…
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error.message || "Something went wrong."}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) submit(e);
          }}
          rows={1}
          placeholder="Ask about this document…"
          className="input max-h-32 flex-1 resize-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="btn btn-primary"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
