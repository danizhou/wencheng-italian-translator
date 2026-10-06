import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpeechStatus, pickVoice, speak, speakableLine, speakableSyllable } from "@/lib/speech";

describe("speakableSyllable", () => {
  it.each([
    ["gni", "gni"],
    ["ng", "eng"],
    ["z", "ze"],
    ["s", "se"],
    ["ciü", "ciu"],
    ["ü", "iu"],
    ["güeu", "giueu"],
    ["chè", "chè"],
  ])("%s → %s", (ita, spoken) => {
    expect(speakableSyllable(ita)).toBe(spoken);
  });
});

describe("speakableLine", () => {
  it("keeps spaces and punctuation", () => {
    expect(speakableLine("ng ciü meng la?")).toBe("eng ciu meng la?");
  });
});

describe("pickVoice", () => {
  const v = (lang: string, localService = true) => ({ lang, localService, name: `${lang}${localService ? "" : "-remote"}` });

  it("Italian: prefers it-IT, then any Italian voice", () => {
    expect(pickVoice([v("en-US"), v("it-CH"), v("it-IT")], "it")?.lang).toBe("it-IT");
    expect(pickVoice([v("en-US"), v("it_CH")], "it")?.lang).toBe("it_CH");
  });

  it("Vietnamese: prefers vi-VN, then any Vietnamese voice", () => {
    expect(pickVoice([v("zh-CN"), v("vi"), v("vi-VN")], "vi")?.lang).toBe("vi-VN");
    expect(pickVoice([v("en-US"), v("vi_VN")], "vi")?.lang).toBe("vi_VN");
  });

  it("prefers a local voice", () => {
    expect(pickVoice([v("vi-VN", false), v("vi-VN")], "vi")?.name).toBe("vi-VN");
  });

  it("returns null without a voice for the language", () => {
    expect(pickVoice([v("en-US"), v("vi-VN")], "it")).toBeNull();
    expect(pickVoice([v("en-US"), v("zh-CN"), v("it-IT")], "vi")).toBeNull();
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
    await speak("ững chuỵ mễnh là", { lang: "vi", rate: 0.7 });
    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken).toEqual([{ text: "ững chuỵ mễnh là", lang: "vi-VN", voice: { lang: "vi-VN" }, rate: 0.7 }]);
  });

  it("reads the Italian spelling with an Italian voice, made pronounceable", async () => {
    const { spoken } = stubSpeech([{ lang: "vi-VN" }, { lang: "it-IT" }]);
    await speak("ng ciü meng la", { lang: "it" });
    expect(spoken).toEqual([{ text: "eng ciu meng la", lang: "it-IT", voice: { lang: "it-IT" }, rate: 0.9 }]);
  });

  it("reports the speech status per language", () => {
    stubSpeech([{ lang: "it-IT" }]);
    expect(getSpeechStatus("it")).toBe("ready");
    expect(getSpeechStatus("vi")).toBe("no-voice");
  });

  it("does nothing where speech is unsupported", async () => {
    await expect(speak("nhĩ", { lang: "vi" })).resolves.toBeUndefined();
    expect(getSpeechStatus("vi")).toBe("unsupported");
  });
});
