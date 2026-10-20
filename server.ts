// bb-plugin-voice-shortcut — backend entry. Behavior lives in the frontend
// (app.tsx); the server declares the plugin's settings.
import type { BbPluginApi } from "@get-bb/plugin-sdk";
import { VOICE_KEY_SETTING_LABELS, type VoiceKeySetting } from "./keys";

export default async function plugin(bb: BbPluginApi) {
  bb.settings.define({
    voiceKey: {
      type: "select",
      label: "Voice key",
      description:
        "Hold to talk and send; double-tap to dictate a draft. Use a key your system does not reserve.",
      options: Object.keys(VOICE_KEY_SETTING_LABELS) as VoiceKeySetting[],
      experimental_optionLabels: VOICE_KEY_SETTING_LABELS,
      default: "auto",
    },
    sounds: {
      type: "boolean",
      label: "Play sounds",
      description: "A quiet click when push-to-talk starts recording and when it sends.",
      default: true,
    },
  });
  bb.log.info("loaded");
}
