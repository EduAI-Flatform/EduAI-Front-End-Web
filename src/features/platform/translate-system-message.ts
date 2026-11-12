import { SYSTEM_MESSAGES } from "./system-messages";

export function currentSystemLocale(): 'vi-VN' | 'en-US' {
  try {
    const saved = localStorage.getItem('gds.locale.v1');
    if (saved === 'en' || saved === 'vi') return saved === 'en' ? 'en-US' : 'vi-VN';
  } catch { /* Use the current document language when storage is unavailable. */ }
  return typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('en') ? 'en-US' : 'vi-VN';
}

export function translateSystemMessage(message: string): string {
  return currentSystemLocale() === 'en-US' ? SYSTEM_MESSAGES[message] ?? message : message;
}
