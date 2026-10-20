// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { matchesVoiceKey, parseVoiceKeySetting, resolveVoiceKey } from "./keys";

afterEach(() => vi.unstubAllGlobals());

function onPlatform(platform: string) {
  vi.stubGlobal("navigator", { platform, userAgent: "" });
}

test("automatic: right command on Mac, right Ctrl on Windows and Linux", () => {
  onPlatform("MacIntel");
  expect(resolveVoiceKey("auto")).toBe("MetaRight");
  onPlatform("Win32");
  expect(resolveVoiceKey("auto")).toBe("ControlRight");
  onPlatform("Linux x86_64");
  expect(resolveVoiceKey("auto")).toBe("ControlRight");
});

test("an explicit choice wins on every platform", () => {
  onPlatform("Win32");
  expect(resolveVoiceKey("MetaRight")).toBe("MetaRight");
  onPlatform("MacIntel");
  expect(resolveVoiceKey("ShiftRight")).toBe("ShiftRight");
});

test("unknown stored values fall back to automatic", () => {
  expect(parseVoiceKeySetting("F13")).toBe("auto");
  expect(parseVoiceKeySetting(undefined)).toBe("auto");
  expect(parseVoiceKeySetting("AltRight")).toBe("AltRight");
});

test("matches by physical key, falling back to key name and side", () => {
  const event = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);
  expect(matchesVoiceKey(event({ code: "ControlRight", key: "Control", location: 2 }), "ControlRight")).toBe(true);
  expect(matchesVoiceKey(event({ code: "ControlLeft", key: "Control", location: 1 }), "ControlRight")).toBe(false);
  expect(matchesVoiceKey(event({ key: "Control", location: 2 }), "ControlRight")).toBe(true);
  expect(matchesVoiceKey(event({ key: "AltGraph", location: 2 }), "AltRight")).toBe(true);
  expect(matchesVoiceKey(event({ key: "Meta", location: 1 }), "MetaRight")).toBe(false);
});
