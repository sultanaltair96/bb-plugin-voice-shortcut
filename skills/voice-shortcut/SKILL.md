---
name: voice-shortcut
description: Explain or troubleshoot the Voice Shortcut plugin, which drives BB voice input from one voice key (right Command on Mac, right Ctrl on Windows and Linux by default): hold to talk and send, double-tap to dictate a draft.
---

# Voice Shortcut

Two gestures on one **voice key**. Default: right **⌘ Command** on macOS,
right **Ctrl** on Windows and Linux (the Windows and Super keys are reserved by
those systems). The setting **Voice key** (`voiceKey`: `auto`, `MetaRight`,
`ControlRight`, `AltRight`, `ShiftRight`) picks another key; the left-hand key
of the same kind is ignored.

## Hold to talk (sends)

1. Hold the voice key for 0.4 s: recording starts (soft click).
2. Release: bb transcribes, the text lands in the composer, and a
   "Sending… press Esc to keep as draft" bar appears above it.
3. After 1 s it submits exactly like Enter: sends, or queues if the agent is
   busy (soft click on send).

The recording is discarded if you release within 0.5 s of it starting, press
any other key or click while holding, or switch away from the window. The
countdown is cancelled by **Escape**, by editing the text, or by leaving the
thread. A cancelled countdown leaves the text as a draft.

## Double-tap (draft only)

Two quick taps (each under 300 ms, within 350 ms of each other) start
recording. Two more taps stop it and add the text to the draft without
sending.

## Details

- Target composer: the focused one, else the last one focused, else the first
  visible one. Thread and new-thread composers send; other composers only get
  the draft.
- Key events do not reach the bb window while a terminal or Browser tab
  (webview) has focus, so the gestures do nothing there.
- Settings: **Voice key** and **Play sounds** (default on) in the plugin's
  settings, or `bb plugin config voice-shortcut set <key> <value>`.
- Source: https://github.com/sultanaltair96/bb-plugin-voice-shortcut
  (`keyboard.ts` for the keys, `send-countdown.tsx` for the countdown).

If it stops working after a bb update, check that the composer's voice buttons
still use the aria-labels `Start voice input`, `Stop and add to draft` and
`Cancel recording`, and that the composer still reports the submit-blocked
reason `Finish voice input first.` while recording.
