// Quiet click sounds for push-to-talk start and send.
import { preferences } from "./bus";

let context: AudioContext | null = null;

export function playCue(kind: "start" | "send"): void {
  if (!preferences.sounds || typeof AudioContext === "undefined") return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = kind === "start" ? 880 : 1320;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.07);
  } catch {
    // Audio is a nicety; never let it break the shortcut.
  }
}

export function disposeCues(): void {
  void context?.close();
  context = null;
}
