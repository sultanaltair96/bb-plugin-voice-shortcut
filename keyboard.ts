// Voice key gestures (right ⌘ on Mac, right Ctrl elsewhere by default),
// installed as a content script:
// - double-tap: toggle voice input into the draft (no send)
// - hold: push-to-talk; release sends after the composer's countdown
//
// BB has no bindable voice-input command, so this presses the composer's own
// voice buttons. It depends on their aria-labels; update the selectors below
// if a BB release renames them.
import type { PluginContentScriptContext } from "@get-bb/plugin-sdk/app";
import { preferences, requestSend } from "./bus";
import { disposeCues, playCue } from "./cues";
import { matchesVoiceKey, resolveVoiceKey } from "./keys";

/** Max gap between the two taps of a double-tap. */
export const DOUBLE_TAP_MS = 350;
/** A press held longer than this is not a tap. */
export const MAX_TAP_HOLD_MS = 300;
/** Holding this long starts push-to-talk. */
export const HOLD_TO_TALK_MS = 400;
/** Push-to-talk recordings shorter than this are discarded as accidental. */
export const MIN_RECORDING_MS = 500;

const PROMPTBOX = "[data-promptbox]";
const START_BUTTON = 'button[aria-label="Start voice input"]:not([disabled])';
const STOP_BUTTON = 'button[aria-label="Stop and add to draft"]:not([disabled])';
const CANCEL_BUTTON = 'button[aria-label="Cancel recording"]:not([disabled])';

function isVoiceKey(event: KeyboardEvent): boolean {
  return matchesVoiceKey(event, resolveVoiceKey(preferences.voiceKey));
}

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0;
}

/** Prefers the focused composer, then the last one focused, then any visible one. */
function pickPromptbox(lastFocused: Element | null): Element | null {
  const focused = document.activeElement?.closest(PROMPTBOX);
  if (focused) return focused;
  if (lastFocused?.isConnected && isVisible(lastFocused)) return lastFocused;
  return Array.from(document.querySelectorAll(PROMPTBOX)).find(isVisible) ?? null;
}

function findVisibleButton(selector: string, within: Element | null): HTMLButtonElement | null {
  if (within?.isConnected) {
    const button = within.querySelector<HTMLButtonElement>(selector);
    if (button) return button;
  }
  return (
    Array.from(document.querySelectorAll<HTMLButtonElement>(selector)).find(isVisible) ?? null
  );
}

function findStartButton(promptbox: Element | null): HTMLButtonElement | null {
  // The start button can be display:none while the composer is collapsed;
  // click() still reaches its React handler.
  return (
    promptbox?.querySelector<HTMLButtonElement>(START_BUTTON) ??
    Array.from(document.querySelectorAll<HTMLButtonElement>(START_BUTTON)).find((button) =>
      isVisible(button.closest(PROMPTBOX) ?? button),
    ) ??
    null
  );
}

export function mountKeyboardShortcuts({ signal }: PluginContentScriptContext): () => void {
  let pressStartedAt: number | null = null;
  let pressIsClean = false;
  let lastTapAt = 0;
  let lastFocusedPromptbox: Element | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let pushToTalk: { promptbox: Element | null; startedAt: number } | null = null;

  const clearHoldTimer = () => {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
  };

  const toggleVoiceInput = () => {
    const stop = findVisibleButton(STOP_BUTTON, null);
    if (stop) {
      stop.click();
      return;
    }
    findStartButton(pickPromptbox(lastFocusedPromptbox))?.click();
  };

  const startPushToTalk = (startedAt: number) => {
    holdTimer = null;
    if (!pressIsClean || findVisibleButton(STOP_BUTTON, null)) return;
    const promptbox = pickPromptbox(lastFocusedPromptbox);
    const start = findStartButton(promptbox);
    if (!start) return;
    start.click();
    pushToTalk = { promptbox: start.closest(PROMPTBOX) ?? promptbox, startedAt };
    playCue("start");
  };

  const cancelPushToTalk = () => {
    if (!pushToTalk) return;
    findVisibleButton(CANCEL_BUTTON, pushToTalk.promptbox)?.click();
    pushToTalk = null;
  };

  const finishPushToTalk = (releasedAt: number) => {
    if (!pushToTalk) return;
    if (releasedAt - pushToTalk.startedAt < MIN_RECORDING_MS) {
      cancelPushToTalk();
      return;
    }
    const stop = findVisibleButton(STOP_BUTTON, pushToTalk.promptbox);
    pushToTalk = null;
    if (!stop) return;
    requestSend();
    stop.click();
  };

  /** Anything other than a lone voice-key press cancels every gesture in progress. */
  const interrupt = () => {
    pressIsClean = false;
    lastTapAt = 0;
    clearHoldTimer();
    cancelPushToTalk();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (isVoiceKey(event)) {
      if (event.repeat) return;
      pressStartedAt = event.timeStamp;
      pressIsClean = true;
      clearHoldTimer();
      const startedAt = event.timeStamp + HOLD_TO_TALK_MS;
      holdTimer = setTimeout(() => startPushToTalk(startedAt), HOLD_TO_TALK_MS);
      return;
    }
    // ⌘C, ⌘K, plain typing: not a voice gesture.
    interrupt();
  };

  const onKeyUp = (event: KeyboardEvent) => {
    if (!isVoiceKey(event)) return;
    clearHoldTimer();
    if (pushToTalk) {
      pressStartedAt = null;
      pressIsClean = false;
      lastTapAt = 0;
      finishPushToTalk(event.timeStamp);
      return;
    }
    const isTap =
      pressIsClean &&
      pressStartedAt !== null &&
      event.timeStamp - pressStartedAt <= MAX_TAP_HOLD_MS;
    pressStartedAt = null;
    pressIsClean = false;
    if (!isTap) {
      lastTapAt = 0;
      return;
    }
    if (lastTapAt && event.timeStamp - lastTapAt <= DOUBLE_TAP_MS) {
      lastTapAt = 0;
      toggleVoiceInput();
      return;
    }
    lastTapAt = event.timeStamp;
  };

  const onFocusIn = (event: FocusEvent) => {
    const promptbox = (event.target as Element | null)?.closest?.(PROMPTBOX);
    if (promptbox) lastFocusedPromptbox = promptbox;
  };

  const options = { capture: true, signal } as const;
  window.addEventListener("keydown", onKeyDown, options);
  window.addEventListener("keyup", onKeyUp, options);
  window.addEventListener("pointerdown", interrupt, options);
  // ⌘Tab to another app: the release never reaches this window.
  window.addEventListener("blur", interrupt, options);
  document.addEventListener("focusin", onFocusIn, options);

  return () => {
    // The abort signal already removed the listeners.
    clearHoldTimer();
    cancelPushToTalk();
    lastFocusedPromptbox = null;
    disposeCues();
  };
}
