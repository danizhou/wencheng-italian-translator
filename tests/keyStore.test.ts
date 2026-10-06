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

  it("stores nothing until remember() is called", () => {
    const s = fakeStorage();
    vi.stubGlobal("window", { localStorage: s });
    expect(keyStore.loadRemembered()).toBeNull();
    keyStore.remember("sk-ant-x");
    expect(keyStore.loadRemembered()).toBe("sk-ant-x");
    keyStore.forget();
    expect(s.data.size).toBe(0);
  });

  it("does not throw when storage is blocked", () => {
    vi.stubGlobal("window", {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    });
    expect(() => keyStore.remember("sk-ant-x")).not.toThrow();
    expect(keyStore.loadRemembered()).toBeNull();
  });

  it("works without a window (static build)", () => {
    expect(keyStore.loadRemembered()).toBeNull();
  });
});
