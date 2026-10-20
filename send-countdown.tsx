// Per-composer banner: after a push-to-talk release, waits for this
// composer's transcript, counts down, then submits it the way Enter does
// (send, or queue while the agent is busy). Escape keeps it as a draft.
import { useEffect, useRef, useState } from "react";
import { useComposer, useSettings } from "@get-bb/plugin-sdk/app";
import { onSendRequested, preferences } from "./bus";
import { playCue } from "./cues";
import { parseVoiceKeySetting } from "./keys";

/** Time to press Escape after the transcript lands. */
export const SEND_DELAY_MS = 1000;
/** Voice ended but no transcript arrived: give up after this long. */
const TRANSCRIPT_GRACE_MS = 1500;
/** Upper bound on transcription time. */
const TRANSCRIPT_TIMEOUT_MS = 60_000;

/** The host's submit-blocked reason while this composer records or transcribes. */
const VOICE_INPUT_BLOCKED_REASON = "Finish voice input first.";

type Phase =
  | { kind: "idle" }
  | { kind: "awaiting-transcript"; baseline: string }
  | { kind: "countdown"; text: string };

const IDLE: Phase = { kind: "idle" };

export function VoiceSendBanner() {
  const composer = useComposer();
  const { sounds, voiceKey } = useSettings().values ?? {};
  useEffect(() => {
    preferences.sounds = sounds !== false;
    preferences.voiceKey = parseVoiceKeySetting(voiceKey);
  }, [sounds, voiceKey]);
  return (
    <SendCountdown voiceActive={composer.submittingBlockedReason === VOICE_INPUT_BLOCKED_REASON} />
  );
}

export function SendCountdown({ voiceActive }: { voiceActive: boolean }) {
  const composer = useComposer();
  const text = composer.text;
  const [phase, setPhase] = useState<Phase>(IDLE);
  const latest = useRef({ voiceActive, text });
  latest.current = { voiceActive, text };

  // Only the composer that is recording claims the release.
  useEffect(
    () =>
      onSendRequested(() => {
        if (latest.current.voiceActive) {
          setPhase({ kind: "awaiting-transcript", baseline: latest.current.text });
        }
      }),
    [],
  );

  useEffect(() => {
    if (phase.kind !== "awaiting-transcript") return;
    if (text !== phase.baseline && text.trim()) {
      setPhase({ kind: "countdown", text });
      return;
    }
    const timer = setTimeout(
      () => setPhase(IDLE),
      voiceActive ? TRANSCRIPT_TIMEOUT_MS : TRANSCRIPT_GRACE_MS,
    );
    return () => clearTimeout(timer);
  }, [phase, text, voiceActive]);

  useEffect(() => {
    if (phase.kind !== "countdown") return;
    // Editing the transcript means the user wants to review it.
    if (text !== phase.text) {
      setPhase(IDLE);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPhase(IDLE);
    };
    window.addEventListener("keydown", onKeyDown, true);
    const timer = setTimeout(() => {
      setPhase(IDLE);
      composer.submit({ experimental_data: null }).then(
        () => playCue("send"),
        (error: unknown) => console.warn("[voice-shortcut] send failed; kept as draft", error),
      );
    }, SEND_DELAY_MS);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [phase, text, composer]);

  if (phase.kind !== "countdown") return null;
  return <CountdownBar />;
}

function CountdownBar() {
  const [draining, setDraining] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDraining(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div role="status" style={{ display: "grid", gap: 6, padding: "6px 10px", fontSize: 12 }}>
      <span>
        Sending… press <kbd>Esc</kbd> to keep as draft
      </span>
      <div style={{ height: 2, borderRadius: 1, background: "currentColor", opacity: 0.15 }}>
        <div
          style={{
            height: "100%",
            borderRadius: 1,
            background: "currentColor",
            width: draining ? "0%" : "100%",
            transition: `width ${SEND_DELAY_MS}ms linear`,
          }}
        />
      </div>
    </div>
  );
}
