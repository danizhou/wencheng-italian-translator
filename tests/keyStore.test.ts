import { afterEach, describe, expect, it, vi } from "vitest";
import { keyStore } from "@/lib/keyStore";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe("keyStore", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("saves one key per provider, and forgets it", () => {
    const s = fakeStorage();
    vi.stubGlobal("window", { localStorage: s });
    keyStore.save("anthropic", "sk-ant-x");
    keyStore.save("xai", "xai-y");
    expect(keyStore.loadSaved("anthropic")).toBe("sk-ant-x");
    expect(keyStore.loadSaved("xai")).toBe("xai-y");
    expect(keyStore.loadSaved("openai")).toBeNull();
    keyStore.forget("anthropic");
    expect(keyStore.loadSaved("anthropic")).toBeNull();
    keyStore.forgetAll(["anthropic", "openai", "xai"]);
    expect(s.data.size).toBe(0);
  });

  it("reads the key saved by the previous version as the Anthropic key", () => {
    const s = fakeStorage({ "wencheng.anthropicKey": "sk-ant-old" });
    vi.stubGlobal("window", { localStorage: s });
    expect(keyStore.loadSaved("anthropic")).toBe("sk-ant-old");
    keyStore.save("anthropic", "sk-ant-new");
    expect([...s.data.keys()]).toEqual(["wencheng.key.anthropic"]);
  });

  it("does not store an empty key", () => {
    const s = fakeStorage();
    vi.stubGlobal("window", { localStorage: s });
    keyStore.save("openai", "  ");
    expect(s.data.size).toBe(0);
  });

  it("remembers provider and model per provider", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    keyStore.saveProvider("xai");
    keyStore.saveModel("xai", "grok-4.7");
    expect(keyStore.loadProvider()).toBe("xai");
    expect(keyStore.loadModel("xai")).toBe("grok-4.7");
    expect(keyStore.loadModel("openai")).toBeNull();
  });

  it("saving is on by default and the opt-out is remembered", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    expect(keyStore.loadSaveEnabled()).toBe(true);
    keyStore.setSaveEnabled(false);
    expect(keyStore.loadSaveEnabled()).toBe(false);
  });

  it("remembers the chosen dialect", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    expect(keyStore.loadDialect()).toBeNull();
    keyStore.saveDialect("qingtian");
    expect(keyStore.loadDialect()).toBe("qingtian");
  });

  it("does not throw when storage is blocked", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(() => keyStore.save("anthropic", "sk-ant-x")).not.toThrow();
    expect(keyStore.loadSaved("anthropic")).toBeNull();
  });

  it("works without a window (static build)", () => {
    expect(keyStore.loadSaved("anthropic")).toBeNull();
  });
});
