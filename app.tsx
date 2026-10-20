// bb-plugin-voice-shortcut — right-⌘ voice input for BB.
//
// Double-tap right ⌘ to toggle voice input into the draft. Hold right ⌘ to
// talk; release to send after a one-second countdown (Escape keeps the
// draft). See keyboard.ts and send-countdown.tsx.
import { definePluginApp } from "@get-bb/plugin-sdk/app";
import { mountKeyboardShortcuts } from "./keyboard";
import { VoiceSendBanner } from "./send-countdown";

export default definePluginApp((app) => {
  app.contentScripts.register({
    id: "right-command-voice",
    mount: mountKeyboardShortcuts,
  });
  app.composer.customize({
    id: "push-to-talk",
    scopes: ["thread", "new-thread"],
    banners: [{ id: "send-countdown", component: VoiceSendBanner }],
  });
});
