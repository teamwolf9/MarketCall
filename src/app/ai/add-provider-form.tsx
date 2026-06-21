"use client";

import { useActionState, useState } from "react";
import { addProvider, type AddProviderState } from "@/server/ai/manage";

const PRESETS: Record<string, { type: string; baseUrl: string; model: string }> = {
  OpenAI: { type: "openai-compatible", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  Gemini: {
    type: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    model: "gemini-2.5-flash",
  },
  OpenRouter: {
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "anthropic/claude-sonnet-4.6",
  },
  Groq: { type: "openai-compatible", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  Ollama: { type: "openai-compatible", baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
  Anthropic: { type: "anthropic", baseUrl: "", model: "claude-sonnet-4-6" },
};

export function AddProviderForm() {
  const [state, action, pending] = useActionState<AddProviderState, FormData>(
    addProvider,
    {},
  );
  const [type, setType] = useState("openai-compatible");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  function applyPreset(name: string) {
    const p = PRESETS[name];
    if (!p) return;
    setType(p.type);
    setBaseUrl(p.baseUrl);
    setModel(p.model);
  }

  return (
    <form action={action} className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(PRESETS).map((name) => (
          <button key={name} type="button" onClick={() => applyPreset(name)} className="chip">
            {name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="label">Name</span>
          <input name="name" required placeholder="e.g. Gemini (Studio)" className="input" />
        </label>
        <label className="space-y-1.5">
          <span className="label">Provider type</span>
          <select
            name="providerType"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input"
          >
            <option value="openai-compatible">openai-compatible</option>
            <option value="anthropic">anthropic</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="label">
          Base URL {type === "openai-compatible" ? "(required)" : "(optional)"}
        </span>
        <input
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="input font-mono text-xs"
        />
      </label>

      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-1.5">
          <span className="label">Model</span>
          <input
            name="model"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="input"
          />
        </label>
        <label className="space-y-1.5">
          <span className="label">Fast (optional)</span>
          <input name="modelFast" placeholder="defaults to Model" className="input" />
        </label>
        <label className="space-y-1.5">
          <span className="label">Smart (optional)</span>
          <input name="modelSmart" placeholder="defaults to Model" className="input" />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="label">API key (stored encrypted)</span>
        <input name="apiKey" type="password" required placeholder="sk-… / AIza…" className="input" />
      </label>

      {state.error && (
        <p className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="rounded-xl border border-success/30 bg-success-soft px-3 py-2.5 text-sm text-success">
          Provider tested and saved.
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Testing connection…" : "Test & save provider"}
      </button>
    </form>
  );
}
