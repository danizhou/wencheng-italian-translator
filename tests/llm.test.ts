import { afterEach, describe, expect, it, vi } from "vitest";
import { createAnthropicTranslator, LlmError, notInDialect, translateItalian } from "@/lib/llm";
import { loadLookup } from "@/lib/lookup";
import type { Translation } from "@/lib/llm/schema";

const reply = (zh: string): Translation => ({ zh, words: [], confidence: "alta", note: "" });

describe("translateItalian (LLM mocked)", () => {
  it("runs one call when every character is covered", async () => {
    const complete = vi.fn().mockResolvedValue(reply("你飯吃過冇"));
    const r = await translateItalian("Hai mangiato?", complete, "wencheng");
    expect(complete).toHaveBeenCalledTimes(1);
    expect(r.retried).toBe(false);
    expect(r.transcription.ita).toBe("gni va ci cu nau");
  });

  it("converts simplified LLM output to traditional", async () => {
    const r = await translateItalian("Non ho soldi", vi.fn().mockResolvedValue(reply("我冇钱")), "wencheng");
    expect(r.translation.zh).toBe("我冇錢");
    expect(r.transcription.ita).toBe("ng nau gie");
  });

  it("retries once, naming the characters outside the Wencheng tables", async () => {
    const complete = vi.fn().mockResolvedValueOnce(reply("你幾歲")).mockResolvedValueOnce(reply("你多少歲"));
    const r = await translateItalian("Quanti anni hai?", complete, "wencheng");
    expect(complete).toHaveBeenCalledTimes(2);
    expect(complete.mock.calls[1][1]).toContain("幾");
    expect(complete.mock.calls[1][1]).toContain("Wencheng pronunciation tables");
    expect(r.retried).toBe(true);
    expect(r.translation.zh).toBe("你多少歲");
  });

  it("accepts the result after the single retry, using the estimated reading", async () => {
    const complete = vi.fn().mockResolvedValue(reply("你幾歲"));
    const r = await translateItalian("Quanti anni hai?", complete, "wencheng");
    expect(complete).toHaveBeenCalledTimes(2);
    expect(r.transcription.tokens.find((t) => t.text === "幾")?.source).toBe("estimated");
  });

  it("notInDialect lists estimated, Wenzhou-only and unknown characters", async () => {
    expect(notInDialect("你幾𠀀錢", await loadLookup("wencheng"))).toEqual(["幾", "𠀀"]);
  });

  it("asks for Qingtian and retries against the Qingtian tables", async () => {
    const complete = vi.fn().mockResolvedValueOnce(reply("我冇錢")).mockResolvedValueOnce(reply("我無錢"));
    const r = await translateItalian("Non ho soldi", complete, "qingtian");
    expect(complete.mock.calls[0][0]).toContain("Qingtian dialect (青田話)");
    expect(complete.mock.calls[1][1]).toContain("Qingtian pronunciation tables: 冇");
    expect(r.translation.zh).toBe("我無錢");
    expect(r.transcription.tokens.map((t) => t.source)).toEqual(["wenxi", "wenxi", "wenxi"]);
  });
});

describe("createAnthropicTranslator (fetch stubbed)", () => {
  afterEach(() => vi.unstubAllGlobals());

  const okBody = {
    id: "msg_1", type: "message", role: "assistant", model: "claude-haiku-4-5",
    content: [{ type: "text", text: JSON.stringify(reply("謝謝")) }],
    stop_reason: "end_turn", stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };

  const stubFetch = (status: number, body: unknown) => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetch);
    return fetch;
  };

  it("sends the key only to api.anthropic.com and parses the structured output", async () => {
    const fetch = stubFetch(200, okBody);
    const out = await createAnthropicTranslator("sk-ant-test", "claude-haiku-4-5")("system", "Frase italiana:\nGrazie");
    expect(out.zh).toBe("謝謝");

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(new URL(url).origin).toBe("https://api.anthropic.com");
    const headers = new Headers(init.headers);
    expect(headers.get("x-api-key")).toBe("sk-ant-test");
    expect(headers.get("anthropic-dangerous-direct-browser-access")).toBe("true");
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-haiku-4-5");
    expect(body.system).toBe("system");
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.effort).toBeUndefined();
    expect(body.fallbacks).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("sk-ant-test");
  });

  it("sets effort and fallbacks on the larger models", async () => {
    const fetch = stubFetch(200, { ...okBody, model: "claude-sonnet-5-5" });
    await createAnthropicTranslator("sk-ant-test", "claude-sonnet-5-5")("system", "x");
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.output_config.effort).toBe("low");
    expect(body.fallbacks).toBe("default");
    expect(new Headers(init.headers).get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
  });

  it.each([
    [401, "auth"],
    [429, "rate_limit"],
    [529, "overloaded"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    stubFetch(status, { type: "error", error: { type: "x", message: "x" } });
    const err = await createAnthropicTranslator("sk-ant-test", "claude-haiku-4-5")("system", "x").catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect(err.kind).toBe(kind);
  });

  it("maps network failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const err = await createAnthropicTranslator("sk-ant-test", "claude-haiku-4-5")("system", "x").catch((e) => e);
    expect(err.kind).toBe("network");
  });

  it("maps refusals", async () => {
    stubFetch(200, { ...okBody, content: [], stop_reason: "refusal" });
    const err = await createAnthropicTranslator("sk-ant-test", "claude-haiku-4-5")("system", "x").catch((e) => e);
    expect(err.kind).toBe("refusal");
  });

  it("refuses to start without a key", () => {
    expect(() => createAnthropicTranslator("  ", "claude-haiku-4-5")).toThrow(LlmError);
  });
});
