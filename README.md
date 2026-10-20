# Voice Shortcut for bb

Talk to your [bb](https://getbb.app) agents without touching the mouse. This
plugin drives bb's own voice input from a single **voice key**:

| System | Default voice key |
| --- | --- |
| macOS | right **⌘ Command** |
| Windows, Linux | right **Ctrl** |

You can pick another key (right Ctrl, right ⌘ / Windows / Super, right Option /
Alt, or right Shift) in the plugin's settings. Off the Mac, right Ctrl is the
default because the Windows and Super keys open the Start menu or the desktop
overview.

| Gesture | What happens |
| --- | --- |
| **Hold** the voice key (about 0.4 s) | Recording starts (soft click). Keep holding and talk. |
| **Release** | bb transcribes, the text lands in the composer, and a "Sending… press Esc to keep as draft" bar appears. After 1 second it sends exactly like Enter: it sends, or queues if the agent is busy. |
| **Double-tap** the voice key | Toggle voice input into the draft without sending. |

Safety rails:

- Pressing any other key or clicking while holding the voice key, or
  switching apps, discards the recording, so shortcuts like ⌘C or Ctrl+C keep
  working.
- Recordings shorter than half a second are discarded as accidental.
- The 1-second countdown starts only once the transcript is in. **Escape**,
  editing the text, or leaving the thread keeps it as a draft.

## Install

Requires bb 0.46 or later.

```sh
bb plugin install git:https://github.com/sultanaltair96/bb-plugin-voice-shortcut
```

Then reload the bb window (⌘R on Mac, Ctrl+R elsewhere). Change the key or
turn the click sounds off in the plugin's settings in bb, or from a terminal:

```sh
bb plugin config voice-shortcut set voiceKey ShiftRight   # auto, MetaRight, ControlRight, AltRight, ShiftRight
bb plugin config voice-shortcut set sounds false
```

Using it together with [Plan Toggle](https://github.com/sultanaltair96/bb-plugin-plan-toggle)?
Their defaults don't overlap: off the Mac, Voice Shortcut uses right Ctrl and
Plan Toggle uses left Ctrl.

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
