import type { ProviderId } from "./llm/models";

/**
 * API keys are saved locally in this browser (localStorage), one per provider,
 * by default, with a visible notice and an opt-out. They are never sent anywhere
 * except that provider's API.
 */
const keyName = (provider: ProviderId) => `wencheng.key.${provider}`;
const LEGACY_ANTHROPIC_KEY = "wencheng.anthropicKey";
const PROVIDER = "wencheng.provider";
const modelName = (provider: ProviderId) => `wencheng.model.${provider}`;
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
  /** The key saved on this device for that provider, if any */
  loadSaved: (provider: ProviderId): string | null =>
    read(keyName(provider)) ?? (provider === "anthropic" ? read(LEGACY_ANTHROPIC_KEY) : null),
  save: (provider: ProviderId, apiKey: string) => {
    write(keyName(provider), apiKey.trim() ? apiKey : null);
    if (provider === "anthropic") write(LEGACY_ANTHROPIC_KEY, null);
  },
  forget: (provider: ProviderId) => {
    write(keyName(provider), null);
    if (provider === "anthropic") write(LEGACY_ANTHROPIC_KEY, null);
  },
  /** Removes the keys of every provider */
  forgetAll: (providers: readonly ProviderId[]) => providers.forEach((p) => keyStore.forget(p)),
  /** Saving is on unless the user turned it off on this device */
  loadSaveEnabled: (): boolean => read(NO_SAVE) !== "1",
  setSaveEnabled: (enabled: boolean) => write(NO_SAVE, enabled ? null : "1"),
  loadProvider: (): string | null => read(PROVIDER),
  saveProvider: (provider: ProviderId) => write(PROVIDER, provider),
  loadModel: (provider: ProviderId): string | null => read(modelName(provider)),
  saveModel: (provider: ProviderId, model: string) => write(modelName(provider), model),
};
