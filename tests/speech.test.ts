import { afterEach, describe, expect, it, vi } from "vitest";
import { getSpeechStatus, pickItalianVoice, speak, speakableLine, speakableSyllable } from "@/lib/speech";

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
    expect(speakableLine("gni va ci cu nau")).toBe("gni va ci cu nau");
  });
});

describe("pickItalianVoice", () => {
  const v = (lang: string, localService = true) => ({ lang, localService, name: lang });

  it("prefers it-IT, then any Italian voice", () => {
    expect(pickItalianVoice([v("en-US"), v("it-CH"), v("it-IT")])?.lang).toBe("it-IT");
    expect(pickItalianVoice([v("en-US"), v("it_CH")])?.lang).toBe("it_CH");
  });

  it("prefers a local voice", () => {
    const remote = { lang: "it-IT", localService: false, name: "remote" };
    const local = { lang: "it-IT", localService: true, name: "local" };
    expect(pickItalianVoice([remote, local])?.name).toBe("local");
  });

  it("returns null without Italian voices", () => {
    expect(pickItalianVoice([v("en-US"), v("zh-CN")])).toBeNull();
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

  it("speaks the pronounceable line in Italian with an Italian voice", async () => {
    const { spoken, synth } = stubSpeech([{ lang: "en-US" }, { lang: "it-IT" }]);
    await speak("ng ciü meng la", { rate: 0.7 });
    expect(synth.cancel).toHaveBeenCalled();
    expect(spoken).toEqual([{ text: "eng ciu meng la", lang: "it-IT", voice: { lang: "it-IT" }, rate: 0.7 }]);
  });

  it("reports the speech status", () => {
    stubSpeech([{ lang: "en-US" }]);
    expect(getSpeechStatus()).toBe("no-italian-voice");
    stubSpeech([{ lang: "it-IT" }]);
    expect(getSpeechStatus()).toBe("ready");
  });

  it("does nothing where speech is unsupported", async () => {
    await expect(speak("gni")).resolves.toBeUndefined();
    expect(getSpeechStatus()).toBe("unsupported");
  });
});
