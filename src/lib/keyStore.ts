/**
 * The user's API key is saved locally in this browser (localStorage) by default,
 * with a visible notice and an opt-out. It is never sent anywhere except the
 * provider's API.
 */
const KEY = "wencheng.anthropicKey";
const MODEL = "wencheng.model";
const NO_SAVE = "wencheng.doNotSaveKey";

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
  /** The key saved on this device, if any */
  loadSaved: (): string | null => read(KEY),
  save: (apiKey: string) => write(KEY, apiKey.trim() ? apiKey : null),
  forget: () => write(KEY, null),
  /** Saving is on unless the user turned it off on this device */
  loadSaveEnabled: (): boolean => read(NO_SAVE) !== "1",
  setSaveEnabled: (enabled: boolean) => write(NO_SAVE, enabled ? null : "1"),
  loadModel: (): string | null => read(MODEL),
  saveModel: (model: string) => write(MODEL, model),
};
