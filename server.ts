// bb-plugin-voice-shortcut — backend entry. Behavior lives in the frontend
// (app.tsx); the server declares the plugin's settings.
import type { BbPluginApi } from "@get-bb/plugin-sdk";

export default async function plugin(bb: BbPluginApi) {
  bb.settings.define({
    sounds: {
      type: "boolean",
      label: "Play sounds",
      description: "A quiet click when push-to-talk starts recording and when it sends.",
      default: true,
    },
  });
  bb.log.info("loaded");
}
