import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const DIST_DIR = path.resolve("dist");
const html = readFileSync(path.join(DIST_DIR, "index.html"), "utf8");
const entryScript = html.match(/<script[^>]+src="\/([^\"]+\.js)"/i)?.[1];
const initialStyles = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="\/([^\"]+\.css)"/gi)].map(
  ([, file]) => file,
);

if (!entryScript) {
  throw new Error("Unable to identify the initial JavaScript entry in dist/index.html");
}

const javascript = measure(entryScript);
const styles = initialStyles.map(measure);
const initialCssGzipBytes = styles.reduce((total, asset) => total + asset.gzipBytes, 0);
const limits = {
  initialJavascriptGzipBytes: 200 * 1024,
  initialCssGzipBytes: 50 * 1024,
};

assertBudget("initial JavaScript", javascript.gzipBytes, limits.initialJavascriptGzipBytes);
assertBudget("initial CSS", initialCssGzipBytes, limits.initialCssGzipBytes);

console.log(
  `bundle-budget=pass initial-js=${javascript.rawBytes}B/${javascript.gzipBytes}B-gzip initial-css=${styles.reduce((total, asset) => total + asset.rawBytes, 0)}B/${initialCssGzipBytes}B-gzip`,
);

function measure(relativePath) {
  const contents = readFileSync(path.join(DIST_DIR, relativePath));
  return { rawBytes: contents.byteLength, gzipBytes: gzipSync(contents).byteLength };
}

function assertBudget(label, actual, limit) {
  if (actual > limit) {
    throw new Error(`${label} exceeds its gzip budget: ${actual}B > ${limit}B`);
  }
}
