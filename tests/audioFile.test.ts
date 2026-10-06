import { afterEach, describe, expect, it, vi } from "vitest";

const predict = vi.fn();
const stored = vi.fn();
vi.mock("@mintplex-labs/piper-tts-web", () => ({ predict, stored }));

const { audioFileName, isVoiceStored, synthesizeVietnamese, VOICE_ID } = await import("@/lib/audioFile");

describe("synthesizeVietnamese (Piper mocked)", () => {
  afterEach(() => vi.clearAllMocks());

  it("reads the Vietnamese respelling with the single-speaker Vietnamese voice", async () => {
    const wav = new Blob(["RIFF"], { type: "audio/wav" });
    predict.mockResolvedValue(wav);
    expect(await synthesizeVietnamese("nhĩ và chỉ cụ não")).toBe(wav);
    expect(predict).toHaveBeenCalledWith({ text: "nhĩ và chỉ cụ não", voiceId: "vi_VN-25hours_single-low" }, expect.any(Function));
    expect(VOICE_ID).toBe("vi_VN-25hours_single-low");
  });

  it("reports the one-time voice download, then the synthesis", async () => {
    predict.mockImplementation(async (_config, progress) => {
      progress({ url: "https://huggingface.co/x/vi_VN-25hours_single-low.onnx", loaded: 25, total: 100 });
      progress({ url: "tts://inference-progress", loaded: 0, total: 1 });
      return new Blob();
    });
    const stages: unknown[] = [];
    await synthesizeVietnamese("nhĩ", (s) => stages.push(s));
    expect(stages).toEqual([{ stage: "audio" }, { stage: "voice", fraction: 0.25 }, { stage: "audio" }]);
  });

  it("refuses empty text", async () => {
    await expect(synthesizeVietnamese("  ")).rejects.toThrow();
    expect(predict).not.toHaveBeenCalled();
  });

  it("knows whether the voice is already stored", async () => {
    stored.mockResolvedValue(["vi_VN-25hours_single-low"]);
    expect(await isVoiceStored()).toBe(true);
    stored.mockRejectedValue(new Error("no OPFS"));
    expect(await isVoiceStored()).toBe(false);
  });
});

describe("audioFileName", () => {
  it.each([
    ["Hai mangiato?", "wenchenghua-hai-mangiato.wav"],
    ["Perché è così?", "wenchenghua-perche-e-cosi.wav"],
    ["???", "wenchenghua.wav"],
  ])("%s → %s", (italian, name) => {
    expect(audioFileName(italian)).toBe(name);
  });
});
