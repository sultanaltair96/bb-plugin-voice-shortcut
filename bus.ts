// Shared state between the keyboard content script and the per-composer send
// banners. Both live in this plugin's single frontend bundle, so module state
// is shared within one bb window.

type Listener = () => void;

const sendListeners = new Set<Listener>();

/** Push-to-talk released: the composer that is recording should send its transcript. */
export function requestSend(): void {
  for (const listener of [...sendListeners]) listener();
}

export function onSendRequested(listener: Listener): () => void {
  sendListeners.add(listener);
  return () => {
    sendListeners.delete(listener);
  };
}

/** Mirrors the plugin's settings; updated by mounted composer banners. */
export const preferences = { sounds: true };
