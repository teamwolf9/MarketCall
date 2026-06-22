"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};
const ttsSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window;
const serverFalse = () => false;

/**
 * Optional spoken replies — reads an assistant message aloud via the browser's
 * SpeechSynthesis (zero dependency, offline). Hidden where unsupported. Swap in
 * ElevenLabs behind this button for higher-quality voices later.
 */
export function SpeakButton({ text }: { text: string }) {
  const supported = useSyncExternalStore(noopSubscribe, ttsSupported, serverFalse);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => {
      if (ttsSupported()) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported || !text.trim()) return null;

  function toggle() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="font-mono text-[11px] text-muted transition hover:text-ink"
      title={speaking ? "Stop" : "Read aloud"}
    >
      {speaking ? "◼ stop" : "🔊 listen"}
    </button>
  );
}
