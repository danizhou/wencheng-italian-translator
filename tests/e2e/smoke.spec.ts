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
