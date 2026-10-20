// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { loadPluginApp, mountPluginContentScripts } from "@get-bb/plugin-sdk/testing/app";
import { onSendRequested } from "./bus";

let events: string[] = [];
let dispose: () => Promise<void>;
let stopListening: () => void;

/** A composer whose voice buttons swap like bb's: Start ⇄ Cancel + Stop. */
function composer(name = "composer"): HTMLElement {
  const box = document.createElement("div");
  box.setAttribute("data-promptbox", "");
  const textarea = document.createElement("textarea");
  box.append(textarea);
  const button = (label: string, onClick: () => void) => {
    const element = document.createElement("button");
    element.setAttribute("aria-label", label);
    element.addEventListener("click", () => {
      events.push(`${name}:${label}`);
      onClick();
    });
    return element;
  };
  const showIdle = () => {
    box.querySelectorAll("button").forEach((element) => element.remove());
    box.append(button("Start voice input", showRecording));
  };
  const showRecording = () => {
    box.querySelectorAll("button").forEach((element) => element.remove());
    box.append(button("Cancel recording", showIdle), button("Stop and add to draft", showIdle));
  };
  showIdle();
  document.body.append(box);
  return box;
}

function key(type: "keydown" | "keyup", code: string, at: number) {
  const event = new KeyboardEvent(type, {
    code,
    key: code.startsWith("Meta") ? "Meta" : code,
    location: code === "MetaRight" ? 2 : code === "MetaLeft" ? 1 : 0,
    bubbles: true,
  });
  Object.defineProperty(event, "timeStamp", { value: at });
  window.dispatchEvent(event);
}
function tap(code: string, down: number, up = down + 80) {
  key("keydown", code, down);
  key("keyup", code, up);
}
/** Press right ⌘ at `down`, keep holding past the push-to-talk threshold. */
function holdDown(down: number) {
  key("keydown", "MetaRight", down);
  vi.advanceTimersByTime(400);
}

beforeEach(async () => {
  vi.useFakeTimers();
  events = [];
  document.body.innerHTML = "";
  // jsdom has no layout; treat every element as visible.
  Element.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
  stopListening = onSendRequested(() => events.push("send-requested"));
  const app = await loadPluginApp(() => import("./app"));
  const mounted = await mountPluginContentScripts(app, { pluginId: "voice-shortcut", generation: 1 });
  dispose = () => mounted.lifecycle.dispose();
});
afterEach(async () => {
  stopListening();
  await dispose();
  vi.useRealTimers();
});

test("double-tap toggles voice input into the draft without sending", () => {
  composer();
  tap("MetaRight", 1000);
  tap("MetaRight", 1250);
  tap("MetaRight", 3000);
  tap("MetaRight", 3250);
  expect(events).toEqual(["composer:Start voice input", "composer:Stop and add to draft"]);
});

test("double-tap ignores slow taps, left command, long presses, and command shortcuts", () => {
  composer();
  tap("MetaRight", 1000);
  tap("MetaRight", 1600); // too slow
  tap("MetaLeft", 3000);
  tap("MetaLeft", 3200);
  tap("MetaRight", 5000, 5350); // too long for a tap, too short for push-to-talk
  tap("MetaRight", 5450);
  key("keydown", "MetaRight", 8000); // ⌘C
  key("keydown", "KeyC", 8020);
  key("keyup", "MetaRight", 8080);
  tap("MetaRight", 8200);
  vi.advanceTimersByTime(1000);
  expect(events).toEqual([]);
});

test("double-tap prefers the focused composer", () => {
  composer("first");
  const second = composer("second");
  second.querySelector("textarea")!.focus();
  tap("MetaRight", 1000);
  tap("MetaRight", 1200);
  expect(events).toEqual(["second:Start voice input"]);
});

test("hold starts recording and release stops it and requests a send", () => {
  composer();
  key("keydown", "MetaRight", 1000);
  vi.advanceTimersByTime(399);
  expect(events).toEqual([]);
  vi.advanceTimersByTime(1);
  expect(events).toEqual(["composer:Start voice input"]);
  key("keyup", "MetaRight", 3000);
  expect(events).toEqual([
    "composer:Start voice input",
    "send-requested",
    "composer:Stop and add to draft",
  ]);
});

test("a release right after recording starts discards it", () => {
  composer();
  holdDown(1000);
  key("keyup", "MetaRight", 1000 + 400 + 300);
  expect(events).toEqual(["composer:Start voice input", "composer:Cancel recording"]);
});

test("another key, a click, or leaving the window discards the recording", () => {
  composer();
  holdDown(1000);
  key("keydown", "KeyC", 2000);
  key("keyup", "MetaRight", 2100);

  holdDown(5000);
  window.dispatchEvent(new Event("pointerdown"));
  key("keyup", "MetaRight", 6000);

  holdDown(9000);
  window.dispatchEvent(new Event("blur"));

  expect(events).toEqual([
    "composer:Start voice input",
    "composer:Cancel recording",
    "composer:Start voice input",
    "composer:Cancel recording",
    "composer:Start voice input",
    "composer:Cancel recording",
  ]);
});

test("a command shortcut pressed before the hold threshold never records", () => {
  composer();
  key("keydown", "MetaRight", 1000);
  key("keydown", "KeyK", 1100);
  vi.advanceTimersByTime(1000);
  key("keyup", "MetaRight", 2000);
  expect(events).toEqual([]);
});

test("hold does nothing while a recording is already running", () => {
  composer();
  tap("MetaRight", 1000);
  tap("MetaRight", 1200); // double-tap draft recording
  holdDown(3000);
  key("keyup", "MetaRight", 5000);
  expect(events).toEqual(["composer:Start voice input"]);
});

test("stops listening after dispose", async () => {
  composer();
  await dispose();
  dispose = async () => {};
  tap("MetaRight", 1000);
  tap("MetaRight", 1200);
  holdDown(3000);
  expect(events).toEqual([]);
});
