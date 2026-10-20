# Voice Shortcut for bb

Talk to your [bb](https://getbb.app) agents without touching the mouse. This
plugin drives bb's own voice input from the **right Command (⌘)** key on macOS.

| Gesture | What happens |
| --- | --- |
| **Hold** right ⌘ (about 0.4 s) | Recording starts (soft click). Keep holding and talk. |
| **Release** | bb transcribes, the text lands in the composer, and a "Sending… press Esc to keep as draft" bar appears. After 1 second it sends exactly like Enter: it sends, or queues if the agent is busy. |
| **Double-tap** right ⌘ | Toggle voice input into the draft without sending. |

Safety rails:

- Pressing any other key or clicking while holding ⌘, or switching apps,
  discards the recording, so ⌘C and ⌘K keep working.
- Recordings shorter than half a second are discarded as accidental.
- The 1-second countdown starts only once the transcript is in. **Escape**,
  editing the text, or leaving the thread keeps it as a draft.

## Install

Requires bb 0.46 or later.

```sh
bb plugin install git:https://github.com/sultanaltair96/bb-plugin-voice-shortcut
```

Then reload the bb window (⌘R). To turn the click sounds off, use the
plugin's settings in bb, or run:

```sh
bb plugin config voice-shortcut set sounds false
```

## How it works

bb has no bindable voice-input command, so a content script presses the
composer's own voice buttons, found by their accessible labels. Sending uses
bb's official composer API (`useComposer().submit()`). A future bb release that
renames those buttons may need a selector update in `keyboard.ts`.

Key events don't reach the bb window while a terminal or Browser tab inside
bb has focus, so the gestures do nothing there.

## Develop

```sh
npm install
npm test
bb plugin install .   # path install for local development
```

## License

MIT
