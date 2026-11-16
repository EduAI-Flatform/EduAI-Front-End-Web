import { SYSTEM_MESSAGES } from "./system-messages";

export function currentSystemLocale(): 'vi-VN' | 'en-US' {
  try {
    const saved = localStorage.getItem('gds.locale.v1');
    if (saved === 'en' || saved === 'vi') return saved === 'en' ? 'en-US' : 'vi-VN';
  } catch { /* Use the current document language when storage is unavailable. */ }
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';
}

// Explicit backend aliases keep user-authored and unknown messages untouched.
const SERVER_MESSAGE_KEYS: Record<string, string> = {
  'TMI adjustment key already used with a different payload': "Mã điều chỉnh này đã được dùng với nội dung khác. Hãy dùng mã mới cho điều chỉnh khác.",
};
export function translateSystemMessage(message: string): string {
  const parts = /^(.*?)( \(Mã lỗi: [^)]+\))?$/.exec(message);
  const key = parts?.[1] ?? message;
  const source = Object.prototype.hasOwnProperty.call(SERVER_MESSAGE_KEYS, key) ? SERVER_MESSAGE_KEYS[key] : undefined;
  if (source) return (currentSystemLocale() === 'en-US' ? SYSTEM_MESSAGES[source] : source) + (parts?.[2] ?? '');
  return currentSystemLocale() === 'en-US' ? SYSTEM_MESSAGES[message] ?? message : message;
}
