/**
 * Generates the icon files from src/data/logo.json: src/app/icon.svg,
 * favicon.ico, apple-icon.png and the link-preview image
 * (opengraph-image.png, twitter-image.png). Renders with Playwright's Chromium.
 * Run by hand after changing the logo: npm run build:icons
 * (PW_CHROMIUM_PATH can point to a pre-installed Chromium.)
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import logo from "../src/data/logo.json" with { type: "json" };

const APP = (name: string) => fileURLToPath(new URL(`../src/app/${name}`, import.meta.url));
const SITE = "wenzhouhua.clicktoconnect.dev";

/** The logo as an SVG document; with a background it gets a full-bleed square (for app icons). */
export function logoSvg({ size = 512, background }: { size?: number; background?: string } = {}): string {
  const back = background ? `<rect width="512" height="512" fill="${background}"/>` : "";
  const inset = background ? ` transform="translate(40 34) scale(0.84375)"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${logo.viewBox}" width="${size}" height="${size}">
  <title>Traduttore Wenzhouhua</title>
  ${back}<g${inset}>
    <path d="${logo.bubble}" fill="${logo.colors.bubble}"/>
    <path d="${logo.glyph}" transform="${logo.glyphTransform}" fill="${logo.colors.glyph}"/>
  </g>
</svg>
`;
}

/** A .ico file holding PNG images (supported by every current browser). */
export function icoFromPngs(pngs: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const OG_TEXT_HAN = "温州话你饭吃过冇";

/**
 * Fetches a Google Fonts subset (only the characters used) and returns it as an
 * embedded @font-face, so the render does not depend on the browser's network.
 */
async function embeddedFont(family: string, weight: number, text: string): Promise<string> {
  const query = `family=${family.replace(/ /g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(`https://fonts.googleapis.com/css2?${query}`, {
    headers: { "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" },
  })).text();
  const url = /url\((https:[^)]+)\)/.exec(css)?.[1];
  if (!url) throw new Error(`No font for ${family} ${weight}`);
  const data = Buffer.from(await (await fetch(url)).arrayBuffer()).toString("base64");
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`;
}

const ogHtml = (fonts: string) => `<!doctype html><html><head><meta charset="utf-8">
<style>${fonts}</style>
<style>
  body{margin:0;width:1200px;height:630px;background:#13308f;color:#fff;font-family:'Google Sans',sans-serif;display:flex;align-items:center;gap:56px;padding:0 80px;box-sizing:border-box;position:relative;overflow:hidden}
  .bar{position:absolute;left:0;right:0;bottom:0;height:14px;background:#ffc72c}
  h1{margin:0;font-size:60px;line-height:1.05;font-weight:700;white-space:nowrap}
  .han{font-family:'Noto Sans SC',sans-serif;color:#ffc72c;font-weight:800;font-size:76px;margin-top:6px}
  .sub{margin-top:18px;font-size:28px;color:#c9d6ff;line-height:1.35}
  .ex{margin-top:28px;display:inline-flex;align-items:center;gap:16px;background:#ffc72c;color:#13308f;border-radius:999px;padding:12px 28px;font-size:30px;font-weight:700}
  .ex span{font-family:'Noto Sans SC',sans-serif;font-weight:500}
  .site{position:absolute;right:80px;bottom:40px;font-size:24px;color:#9fb3ef}
</style></head><body>
  ${logoSvg({ size: 300 })}
  <div>
    <h1>Traduttore Wenzhouhua</h1>
    <div class="han">温州话</div>
    <div class="sub">Italiano → dialetti di Wenzhou (Wencheng, Qingtian),<br>con la pronuncia scritta all'italiana</div>
    <div class="ex"><span>你饭吃过冇</span>→ gni va ci cu nau</div>
  </div>
  <div class="site">${SITE}</div>
  <div class="bar"></div>
</body></html>`;

async function main() {
  writeFileSync(APP("icon.svg"), logoSvg());
  const browser = await chromium.launch(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {});
  try {
    const page = await browser.newPage();
    const png = async (size: number, background?: string) => {
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<body style="margin:0;background:transparent">${logoSvg({ size, background })}</body>`);
      return page.screenshot({ omitBackground: !background });
    };
    writeFileSync(APP("favicon.ico"), icoFromPngs(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })))));
    writeFileSync(APP("apple-icon.png"), await png(180, logo.colors.background));

    await page.setViewportSize({ width: 1200, height: 630 });
    const latin = "Traduttore WenzhouhuaItaliano→dialettidiWenzhou(Wencheng,Qingtian),conlapronunciascrittaall'italianagnivacicunauwenzhouhua.clicktoconnect.dev ";
    const fonts = (
      await Promise.all([
        embeddedFont("Google Sans", 400, latin),
        embeddedFont("Google Sans", 700, latin),
        embeddedFont("Noto Sans SC", 500, OG_TEXT_HAN),
        embeddedFont("Noto Sans SC", 800, OG_TEXT_HAN),
      ])
    ).join("");
    await page.setContent(ogHtml(fonts));
    await page.evaluate(() => document.fonts.ready);
    const og = await page.screenshot();
    writeFileSync(APP("opengraph-image.png"), og);
    writeFileSync(APP("twitter-image.png"), og);
    const alt = "Traduttore Wenzhouhua 温州话: italiano → dialetti di Wenzhou, con la pronuncia all'italiana";
    writeFileSync(APP("opengraph-image.alt.txt"), alt);
    writeFileSync(APP("twitter-image.alt.txt"), alt);
  } finally {
    await browser.close();
  }
  console.log("Wrote icon.svg, favicon.ico, apple-icon.png, opengraph-image.png, twitter-image.png");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
