import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOpenAiCompatibleTranslator,
  createTranslator,
  defaultModelFor,
  findModel,
  LlmError,
  MODELS,
  modelsFor,
  PROVIDER_IDS,
  PROVIDERS,
  translateItalian,
} from "@/lib/llm";
import type { Translation } from "@/lib/llm/schema";

const translation: Translation = { zh: "謝謝", words: [{ zh: "謝謝", it: "grazie" }], confidence: "alta", note: "" };
const completion = (content: string | null, extra: object = {}) => ({
  choices: [{ message: { content, ...extra }, finish_reason: "stop" }],
});

function stubFetch(status: number, body: unknown) {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

describe("model registry", () => {
  it("has at least one model per provider, with unique IDs", () => {
    for (const p of PROVIDER_IDS) expect(modelsFor(p).length).toBeGreaterThan(0);
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
  });

  it("defaults to the first (cheapest) model of each provider", () => {
    expect(defaultModelFor("anthropic")).toBe("claude-haiku-4-5");
    expect(defaultModelFor("openai")).toBe("gpt-5.4-nano");
    expect(defaultModelFor("xai")).toBe("grok-4.7");
  });

  it("accepts a custom model ID for a provider", () => {
    expect(findModel("grok-5-preview", "xai")).toMatchObject({ id: "grok-5-preview", provider: "xai", fallbacks: false });
    expect(findModel("gpt-5.4-mini", "openai").label).toContain("mini");
  });
});

describe.each([
  ["openai", "https://api.openai.com/v1/chat/completions", "gpt-5.4-nano"],
  ["xai", "https://api.x.ai/v1/chat/completions", "grok-4.7"],
] as const)("%s (fetch stubbed)", (provider, endpoint, model) => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the key only to its own API, as a Bearer token, with a strict JSON schema", async () => {
    const fetch = stubFetch(200, completion(JSON.stringify(translation)));
    const out = await createOpenAiCompatibleTranslator(provider, "secret-key", model)("Frase italiana:\nGrazie");
    expect(out).toEqual(translation);

    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(endpoint);
    expect(new URL(url).host).toBe(PROVIDERS[provider].host);
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer secret-key");
    // Only simple headers, to keep the CORS preflight minimal
    expect([...headers.keys()].sort()).toEqual(["authorization", "content-type"]);
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe(model);
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["system", "user"]);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(JSON.stringify(body)).not.toContain("secret-key");
  });

  it.each([
    [401, "auth"],
    [403, "auth"],
    [429, "rate_limit"],
    [503, "overloaded"],
    [404, "other"],
  ])("maps HTTP %i to %s", async (status, kind) => {
    stubFetch(status, { error: { message: "x" } });
    const err = await createOpenAiCompatibleTranslator(provider, "k", model)("x").catch((e) => e);
    expect(err).toBeInstanceOf(LlmError);
    expect(err.kind).toBe(kind);
  });

  it("maps network and CORS failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const err = await createOpenAiCompatibleTranslator(provider, "k", model)("x").catch((e) => e);
    expect(err.kind).toBe("network");
  });

  it("maps refusals and malformed output", async () => {
    stubFetch(200, completion(null, { refusal: "no" }));
    expect((await createOpenAiCompatibleTranslator(provider, "k", model)("x").catch((e) => e)).kind).toBe("refusal");
    stubFetch(200, completion('{"zh": 1}'));
    expect((await createOpenAiCompatibleTranslator(provider, "k", model)("x").catch((e) => e)).kind).toBe("bad_output");
  });

  it("runs the whole pipeline through createTranslator", async () => {
    stubFetch(200, completion(JSON.stringify({ ...translation, zh: "我冇钱" })));
    const r = await translateItalian("Non ho soldi", createTranslator(provider, "k", model));
    expect(r.transcription.ita).toBe("ng nau gie");
  });
});

describe("createTranslator", () => {
  it("refuses to start without a key, for every provider", () => {
    for (const p of PROVIDER_IDS) expect(() => createTranslator(p, " ", defaultModelFor(p))).toThrow(LlmError);
  });
});
