import { afterEach, describe, expect, it, vi } from "vitest";
import { keyStore } from "@/lib/keyStore";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe("keyStore", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("saves the key locally, and forgets it", () => {
    const s = fakeStorage();
    vi.stubGlobal("window", { localStorage: s });
    expect(keyStore.loadSaved()).toBeNull();
    keyStore.save("sk-ant-x");
    expect(keyStore.loadSaved()).toBe("sk-ant-x");
    keyStore.forget();
    expect(s.data.size).toBe(0);
  });

  it("does not store an empty key", () => {
    const s = fakeStorage();
    vi.stubGlobal("window", { localStorage: s });
    keyStore.save("  ");
    expect(s.data.size).toBe(0);
  });

  it("saving is on by default and the opt-out is remembered", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    expect(keyStore.loadSaveEnabled()).toBe(true);
    keyStore.setSaveEnabled(false);
    expect(keyStore.loadSaveEnabled()).toBe(false);
    keyStore.setSaveEnabled(true);
    expect(keyStore.loadSaveEnabled()).toBe(true);
  });

  it("does not throw when storage is blocked", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(() => keyStore.save("sk-ant-x")).not.toThrow();
    expect(keyStore.loadSaved()).toBeNull();
  });

  it("works without a window (static build)", () => {
    expect(keyStore.loadSaved()).toBeNull();
  });
});
