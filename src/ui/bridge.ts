// Copyright (c) 2026 Lucas. See LICENSE.
import type { MainToUi, UiToMain } from "../shared/messages";

/** The UI never touches the figma API; everything goes through these typed messages. */
export function send(msg: UiToMain): void {
  parent.postMessage({ pluginMessage: msg }, "*");
}

export function listen(handler: (msg: MainToUi) => void): () => void {
  const onMessage = (event: MessageEvent) => {
    const msg: unknown = event.data?.pluginMessage;
    if (msg && typeof msg === "object" && typeof (msg as { type?: unknown }).type === "string") {
      handler(msg as MainToUi);
    }
  };
  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}

/** Shows a figma.notify toast. */
export function toast(message: string, error = false): void {
  send({ type: "notify", message, error });
}
