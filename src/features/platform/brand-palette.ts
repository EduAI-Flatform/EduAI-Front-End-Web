import type { PlatformSettings } from "./PlatformProvider";
function toHsl(hex: string) {
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(hex.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  const light = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  let hue = 0;
  if (delta)
    hue =
      max === r
        ? ((g - b) / delta) % 6
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
  return `${(hue * 60 + 360) % 360} ${saturation * 100}% ${light * 100}%`;
}
function foreground(hex: string) {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) =>
      c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
    );
  const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return luminance > 0.179 ? "0 0% 0%" : "0 0% 100%";
}
export function applyBrandPalette(
  colors: PlatformSettings["branding"]["colors"],
) {
  const style = document.documentElement.style;
  for (const [key, value] of Object.entries(colors)) {
    if (/^#[0-9a-f]{6}$/i.test(value)) style.setProperty("--gds-" + key, value);
  }
  for (const [token, key] of [
    ["primary", "violet"],
    ["secondary", "magenta"],
    ["ring", "violet"],
  ] as const) {
    const value = colors[key];
    if (/^#[0-9a-f]{6}$/i.test(value)) {
      style.setProperty("--" + token, toHsl(value));
      if (token !== "ring")
        style.setProperty("--" + token + "-foreground", foreground(value));
    }
  }
}
