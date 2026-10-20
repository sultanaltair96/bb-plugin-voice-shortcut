// @vitest-environment jsdom
import { act } from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { installTestPluginRuntime, renderSlot } from "@get-bb/plugin-sdk/testing/app";
import { requestSend } from "./bus";
import { SEND_DELAY_MS, SendCountdown } from "./send-countdown";

installTestPluginRuntime();

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function render(voiceActive: boolean, text = "") {
  const slot = renderSlot({ component: SendCountdown }, { voiceActive }, { composer: { text } });
  const setVoiceActive = (active: boolean) =>
    slot.lifecycle.rerender(<SendCountdown voiceActive={active} />);
  return { slot, setVoiceActive };
}

async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

/** Release while recording, then the transcript lands. */
async function releaseAndTranscribe(transcript: string) {
  const view = render(true, "draft so far");
  act(() => requestSend());
  view.setVoiceActive(false);
  await view.slot.behavior.setComposerText(transcript);
  return view;
}

test("submits one second after the transcript lands", async () => {
  const { slot } = await releaseAndTranscribe("draft so far fix the login bug");
  expect(slot.getByRole("status").textContent).toContain("Esc");
  await advance(SEND_DELAY_MS - 1);
  expect(slot.inspection.composer.submits).toEqual([]);
  await advance(1);
  expect(slot.inspection.composer.submits).toEqual([{ experimental_data: null }]);
  expect(slot.queryByRole("status")).toBeNull();
});

test("Escape during the countdown keeps the draft", async () => {
  const { slot } = await releaseAndTranscribe("fix the login bug");
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
  await advance(SEND_DELAY_MS * 3);
  expect(slot.inspection.composer.submits).toEqual([]);
  expect(slot.queryByRole("status")).toBeNull();
});

test("editing the transcript during the countdown keeps the draft", async () => {
  const { slot } = await releaseAndTranscribe("fix the login bug");
  await slot.behavior.setComposerText("fix the login bug please");
  await advance(SEND_DELAY_MS * 3);
  expect(slot.inspection.composer.submits).toEqual([]);
});

test("a composer that is not recording ignores the release", async () => {
  const { slot } = render(false);
  act(() => requestSend());
  await slot.behavior.setComposerText("typed by hand");
  await advance(SEND_DELAY_MS * 3);
  expect(slot.inspection.composer.submits).toEqual([]);
});

test("gives up when voice input ends without a transcript", async () => {
  const { slot, setVoiceActive } = render(true);
  act(() => requestSend());
  setVoiceActive(false);
  await advance(2000);
  await slot.behavior.setComposerText("typed later");
  await advance(SEND_DELAY_MS * 3);
  expect(slot.inspection.composer.submits).toEqual([]);
});

test("unmounting during the countdown keeps the draft", async () => {
  const { slot } = await releaseAndTranscribe("fix the login bug");
  slot.lifecycle.unmount();
  await advance(SEND_DELAY_MS * 3);
  expect(slot.inspection.composer.submits).toEqual([]);
});
