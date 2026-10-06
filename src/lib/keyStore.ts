/**
 * The user's API key lives in memory by default. It is written to localStorage
 * only when the user ticks "remember on this device", and is never sent anywhere
 * except the provider's API.
 */
const KEY = "wencheng.anthropicKey";
const MODEL = "wencheng.model";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(name: string): string | null {
  try {
    return storage()?.getItem(name) ?? null;
  } catch {
    return null;
  }
}

function write(name: string, value: string | null) {
  try {
    const s = storage();
    if (!s) return;
    if (value === null) s.removeItem(name);
    else s.setItem(name, value);
  } catch {
    // Private mode or blocked storage: the key simply stays in memory.
  }
}

export const keyStore = {
  /** A key remembered on this device, if any */
  loadRemembered: (): string | null => read(KEY),
  remember: (apiKey: string) => write(KEY, apiKey),
  forget: () => write(KEY, null),
  loadModel: (): string | null => read(MODEL),
  saveModel: (model: string) => write(MODEL, model),
};
