import { expect, test, type Page, type Request } from "@playwright/test";

const PROVIDERS = /api\.anthropic\.com|api\.openai\.com/;

/** Records every request; the page under test must never send the key to its own origin. */
function recordRequests(page: Page) {
  const requests: Request[] = [];
  page.on("request", (r) => requests.push(r));
  return requests;
}

test("loads with title and API key box", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Traduttore Wencheng/ })).toBeVisible();
  await expect(page.getByText("Chiave API")).toBeVisible();
});

test("a precomputed example works without a key and shows alternatives", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Hai mangiato?" }).click();
  await expect(page.getByTestId("ita-line")).toHaveText("gni va ci cu nau");

  await page.getByTestId("syllables").getByRole("button").nth(2).click();
  await expect(page.getByTestId("alts")).toBeVisible();
});

test("shows Chinese in simplified characters only", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Hai mangiato?" }).click();
  await expect(page.getByTestId("ita-line")).toHaveText("gni va ci cu nau");
  const text = await page.locator("body").innerText();
  expect(text).toContain("你饭吃过冇");
  // Traditional forms that must never appear on the page
  for (const trad of ["飯", "過", "錢", "謝", "蘭", "話", "嶨", "溫"]) expect(text).not.toContain(trad);
});

test("saves the key locally and keeps it after a reload", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByText("La chiave è salvata solo in locale")).toBeVisible();
  await page.getByPlaceholder("sk-ant-…").fill("sk-ant-saved");
  await page.reload();
  await expect(page.getByPlaceholder("sk-ant-…")).toHaveValue("sk-ant-saved");

  await page.getByRole("button", { name: "Cancella chiave" }).click();
  await page.reload();
  await expect(page.getByPlaceholder("sk-ant-…")).toHaveValue("");
});

test("Traduci without a key asks for it and calls no provider", async ({ page }) => {
  const requests = recordRequests(page);
  await page.goto("./");
  await page.getByPlaceholder("Scrivi una frase in italiano…").fill("Ciao");
  await page.getByRole("button", { name: "Traduci" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "API key" })).toContainText("Inserisci la tua API key");
  expect(requests.filter((r) => PROVIDERS.test(r.url()))).toHaveLength(0);
});

test("translates with a key (provider mocked) and never sends the key to our origin", async ({ page, baseURL }) => {
  const requests = recordRequests(page);
  await page.route("https://api.anthropic.com/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "msg_e2e", type: "message", role: "assistant", model: "claude-haiku-4-5",
        content: [{ type: "text", text: JSON.stringify({ zh: "我冇钱", words: [{ zh: "我", it: "io" }], confidence: "alta", note: "" }) }],
        stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
      }),
    }),
  );

  await page.goto("./");
  await page.getByPlaceholder("sk-ant-…").fill("sk-ant-e2e-secret");
  await page.getByPlaceholder("Scrivi una frase in italiano…").fill("Non ho soldi");
  await page.getByRole("button", { name: "Traduci" }).click();
  await expect(page.getByTestId("ita-line")).toHaveText("ng nau gie");

  const provider = requests.filter((r) => PROVIDERS.test(r.url()));
  expect(provider).toHaveLength(1);
  expect(await provider[0].headerValue("x-api-key")).toBe("sk-ant-e2e-secret");

  const origin = new URL(baseURL!).origin;
  for (const r of requests.filter((r) => r.url().startsWith(origin))) {
    const headers = JSON.stringify(await r.allHeaders());
    expect(headers + (r.postData() ?? "")).not.toMatch(/sk-/);
  }
});

test("reads the Italian spelling aloud with an Italian voice", async ({ page }) => {
  // Stub speechSynthesis: headless browsers have no voices
  await page.addInitScript(() => {
    const spoken: { text: string; lang: string; rate: number; voice: string | null }[] = [];
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
    const voices = [{ lang: "it-IT", name: "Italiano", localService: true }];
    class Utterance {
      lang = "";
      rate = 1;
      voice: { name: string } | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(public text: string) {}
    }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => voices,
        cancel: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        speak: (u: Utterance) => {
          spoken.push({ text: u.text, lang: u.lang, rate: u.rate, voice: u.voice?.name ?? null });
          setTimeout(() => u.onend?.(), 10);
        },
      },
    });
  });

  await page.goto("./");
  await page.getByRole("button", { name: "Vado a Milano" }).click();
  await expect(page.getByTestId("ita-line")).toHaveText("ng ciü meng la");
  await page.getByRole("button", { name: "Ascolta", exact: true }).click();

  await page.getByTestId("syllables").getByRole("button").nth(1).click();
  await page.getByRole("button", { name: "Ascolta la sillaba: ciü" }).click();

  const spoken = await page.evaluate(() => (window as unknown as { __spoken: unknown[] }).__spoken);
  expect(spoken).toEqual([
    { text: "eng ciu meng la", lang: "it-IT", rate: 0.9, voice: "Italiano" },
    { text: "ciu", lang: "it-IT", rate: 0.6, voice: "Italiano" },
  ]);
});
