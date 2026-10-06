import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpeechStatus, pickVoice, speak } from "@/lib/speech";

describe("pickVoice", () => {
  const v = (lang: string, localService = true) => ({ lang, localService, name: `${lang}${localService ? "" : "-remote"}` });

  it("prefers vi-VN, then any Vietnamese voice", () => {
    expect(pickVoice([v("zh-CN"), v("vi"), v("vi-VN")])?.lang).toBe("vi-VN");
    expect(pickVoice([v("en-US"), v("vi_VN")])?.lang).toBe("vi_VN");
  });

  it("prefers a local voice", () => {
    expect(pickVoice([v("vi-VN", false), v("vi-VN")])?.name).toBe("vi-VN");
  });

  it("returns null without a Vietnamese voice", () => {
    expect(pickVoice([v("en-US"), v("zh-CN"), v("it-IT")])).toBeNull();
  });
});

describe("speak (speechSynthesis stubbed)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubSpeech(voices: { lang: string }[]) {
    const spoken: { text: string; lang: string; voice: unknown; rate: number }[] = [];
    class Utterance {
      lang = "";
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    const synth = {
      cancel: vi.fn(),
      getVoices: () => voices,
      speak: (u: Utterance) => {
        spoken.push({ text: u.text, lang: u.lang, voice: u.voice, rate: u.rate });
        u.onend?.();
      },
    };
    vi.stubGlobal("window", { speechSynthesis: synth, SpeechSynthesisUtterance: Utterance });
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    return { spoken, synth };
  }

  it("reads the Vietnamese respelling with a Vietnamese voice, unchanged", async () => {
    const { spoken, synth } = stubSpeech([{ lang: "it-IT" }, { lang: "vi-VN" }]);
    await speak("ững chuỵ mễnh là", { rate: 0.7 });
    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken).toEqual([{ text: "ững chuỵ mễnh là", lang: "vi-VN", voice: { lang: "vi-VN" }, rate: 0.7 }]);
  });

  it("still asks for vi-VN when the device has no Vietnamese voice", async () => {
    const { spoken } = stubSpeech([{ lang: "en-US" }]);
    await speak("nhĩ");
    expect(spoken).toEqual([{ text: "nhĩ", lang: "vi-VN", voice: null, rate: 0.9 }]);
  });

  it("reports the speech status", () => {
    stubSpeech([{ lang: "it-IT" }]);
    expect(getSpeechStatus()).toBe("no-voice");
    stubSpeech([{ lang: "vi-VN" }]);
    expect(getSpeechStatus()).toBe("ready");
  });

  it("does nothing where speech is unsupported", async () => {
    await expect(speak("nhĩ")).resolves.toBeUndefined();
    expect(getSpeechStatus()).toBe("unsupported");
  });
});
