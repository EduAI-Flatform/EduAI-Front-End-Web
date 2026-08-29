import { readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const projectRoot = path.resolve(import.meta.dirname, "..");
const publicRoot = path.join(projectRoot, "public");
const jobs = [
  ["pwa-standard-v3.svg", "pwa-standard-192-v3.png", 192],
  ["pwa-standard-v3.svg", "pwa-standard-512-v3.png", 512],
  ["pwa-maskable-v3.svg", "pwa-maskable-192-v3.png", 192],
  ["pwa-maskable-v3.svg", "pwa-maskable-512-v3.png", 512],
  ["apple-touch-icon-v3.svg", "apple-touch-icon-180-v3.png", 180],
];

const browser = await chromium.launch({ headless: true });

try {
  for (const [sourceName, outputName, size] of jobs) {
    const source = await readFile(path.join(publicRoot, sourceName), "utf8");
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: { width: size, height: size },
    });

    await page.setContent(
      `<!doctype html><style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
    );
    await page.locator("svg").screenshot({
      animations: "disabled",
      omitBackground: false,
      path: path.join(publicRoot, outputName),
    });
    await page.close();
  }
} finally {
  await browser.close();
}
