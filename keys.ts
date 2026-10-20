// Which physical key drives the voice gestures. Shared by the server (setting
// descriptor) and the app (key matching); touches the DOM only when called.

export const VOICE_KEYS = {
  MetaRight: { key: "Meta", label: "Right ⌘ Command (the right Windows or Super key elsewhere)" },
  ControlRight: { key: "Control", label: "Right Ctrl" },
  AltRight: { key: "Alt", label: "Right Option / Alt (avoid where it is AltGr)" },
  ShiftRight: { key: "Shift", label: "Right Shift" },
} as const;

export type VoiceKey = keyof typeof VOICE_KEYS;
export type VoiceKeySetting = "auto" | VoiceKey;

export const VOICE_KEY_SETTING_LABELS: Record<VoiceKeySetting, string> = {
  auto: "Automatic: right ⌘ on Mac, right Ctrl on Windows and Linux",
  ...Object.fromEntries(Object.entries(VOICE_KEYS).map(([code, { label }]) => [code, label])),
} as Record<VoiceKeySetting, string>;

export function parseVoiceKeySetting(value: unknown): VoiceKeySetting {
  return typeof value === "string" && value in VOICE_KEY_SETTING_LABELS
    ? (value as VoiceKeySetting)
    : "auto";
}

export function isApplePlatform(): boolean {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || nav.userAgent);
}

/**
 * Off the Mac the right Windows/Super key opens the Start menu or the
 * desktop overview, so the default there is right Ctrl.
 */
export function resolveVoiceKey(setting: VoiceKeySetting): VoiceKey {
  if (setting !== "auto") return setting;
  return isApplePlatform() ? "MetaRight" : "ControlRight";
}

export function matchesVoiceKey(event: KeyboardEvent, code: VoiceKey): boolean {
  if (event.code === code) return true;
  // Some keyboards and remote sessions report no `code`; fall back to the key and its side.
  if (event.location !== KeyboardEvent.DOM_KEY_LOCATION_RIGHT) return false;
  return event.key === VOICE_KEYS[code].key || (code === "AltRight" && event.key === "AltGraph");
}
