import type { ReactNode } from "react";
import { usePlatform } from './PlatformProvider';
import { SYSTEM_MESSAGES } from './system-messages';

// Only system UI messages enter this boundary. Content from users stays outside it.
const SOURCE_BY_ENGLISH = new Map<string, string>();
for (const [source, english] of Object.entries(SYSTEM_MESSAGES)) {
  if (!SOURCE_BY_ENGLISH.has(english)) SOURCE_BY_ENGLISH.set(english, source);
}

function sourceMessage(message: string): string {
  return Object.prototype.hasOwnProperty.call(SYSTEM_MESSAGES, message) ? message : SOURCE_BY_ENGLISH.get(message) ?? message;
}

export function SystemText({ message }: { message: string | null | undefined }) {
  const { locale } = usePlatform();
  const source = sourceMessage(message ?? '');
  return <>{locale === 'en' ? SYSTEM_MESSAGES[source] ?? message : source}</>;
}

export function useSystemMessages() {
  const { t } = usePlatform();
  return (message: string) => {
    const source = sourceMessage(message);
    return t(source, SYSTEM_MESSAGES[source]);
  };
}


export function SystemValue({ render }: { render: () => ReactNode }) {
  usePlatform();
  return <>{render()}</>;
}
