"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Browser speech-to-text via the Web Speech API — "text first, voice optional"
 * (the brief). Zero dependency, no keys; degrades to unsupported (mic hidden)
 * on browsers without it. For higher-quality transcription you'd swap in
 * Whisper/Deepgram behind the same callback.
 *
 * The Web Speech API isn't in the standard DOM lib, so we declare the slice we use.
 */
type RecognitionAlternative = { transcript: string };
type RecognitionResult = ArrayLike<RecognitionAlternative> & { isFinal: boolean };
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Capability detection via useSyncExternalStore — false on the server, real
// value on the client, with no setState-in-effect and no hydration mismatch.
const noopSubscribe = () => () => {};
const isSupported = () => getCtor() !== null;
const serverFalse = () => false;

/** `onTranscript` receives the running session transcript (final + interim). */
export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const supported = useSyncExternalStore(noopSubscribe, isSupported, serverFalse);
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const cbRef = useRef(onTranscript);

  // Keep the latest callback without touching the ref during render.
  useEffect(() => {
    cbRef.current = onTranscript;
  });

  useEffect(() => () => recRef.current?.stop(), []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const phrase = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += phrase;
        else interim += phrase;
      }
      cbRef.current((finalText + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    setListening(true);
    rec.start();
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { supported, listening, toggle };
}
