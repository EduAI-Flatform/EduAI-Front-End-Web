import { Fragment, type ReactNode, useId, useRef } from "react";
import { Bold, Italic, List, Underline } from "lucide-react";
import "./RichDescription.css";
import { usePlatform } from "../../features/platform/PlatformProvider";

// Restricted text markup. User input is never interpreted as HTML or CSS.
function inline(value: string, depth = 0): ReactNode {
  if (depth > 8) return value;
  const expression = /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|\[small\]([\s\S]*?)\[\/small\]|\[large\]([\s\S]*?)\[\/large\]/g;
  const nodes: ReactNode[] = [];
  let start = 0;
  for (const match of value.matchAll(expression)) {
    const index = match.index ?? 0;
    nodes.push(value.slice(start, index));
    const content = inline(match.slice(1).find((part) => part !== undefined) ?? "", depth + 1);
    nodes.push(<Fragment key={index}>{match[1] !== undefined ? <strong>{content}</strong>
      : match[2] !== undefined ? <u>{content}</u>
      : match[3] !== undefined ? <em>{content}</em>
      : <span className={match[4] !== undefined ? "rich-description__small" : "rich-description__large"}>{content}</span>}</Fragment>);
    start = index + match[0].length;
  }
  nodes.push(value.slice(start));
  return nodes;
}

export function descriptionPlainText(value: string | null | undefined): string {
  return (value ?? "").replace(/\*\*|__|\[\/?(?:small|large)\]/g, "").replace(/\*([^*]+)\*/g, "$1");
}

export function RichDescription({ value }: { value: string | null | undefined }) {
  const lines = (value ?? "").split(/\r?\n/);
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/^-\s+/.test(lines[index])) {
      const items: ReactNode[] = [];
      const first = index;
      while (index < lines.length && /^-\s+/.test(lines[index])) {
        items.push(<li key={index}>{inline(lines[index].replace(/^-\s+/, ""))}</li>);
        index += 1;
      }
      index -= 1;
      blocks.push(<ul key={first}>{items}</ul>);
    } else if (lines[index].trim()) {
      blocks.push(<p key={index}>{inline(lines[index])}</p>);
    }
  }
  return <div className="rich-description">{blocks}</div>;
}

export function RichDescriptionEditor({ value, onChange, disabled = false, invalid = false, maxLength = 4000 }: {
  value: string; onChange: (value: string) => void; disabled?: boolean; invalid?: boolean; maxLength?: number;
}) {
  const { t } = usePlatform();
  const editor = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  function wrap(before: string, after = before) {
    const field = editor.current;
    if (!field) return;
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const selected = value.slice(start, end);
    const replacement = before === "- " ? selected.split("\n").map((line) => `- ${line}`).join("\n") : `${before}${selected}${after}`;
    const next = value.slice(0, start) + replacement + value.slice(end);
    if (next.length > maxLength) return;
    onChange(next);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(start + before.length, start + replacement.length - after.length); });
  }
  return <div className="rich-description-editor">
    <label htmlFor={id}>{t("Mô tả", "Description")}</label>
    <div aria-label={t("Định dạng mô tả", "Description formatting")} className="rich-description-editor__toolbar" role="toolbar">
      <button aria-label={t("In đậm", "Bold")} disabled={disabled} onClick={() => wrap("**")} type="button"><Bold size={18} /></button>
      <button aria-label={t("In nghiêng", "Italic")} disabled={disabled} onClick={() => wrap("*")} type="button"><Italic size={18} /></button>
      <button aria-label={t("Gạch chân", "Underline")} disabled={disabled} onClick={() => wrap("__")} type="button"><Underline size={18} /></button>
      <button aria-label={t("Danh sách", "Bullet list")} disabled={disabled} onClick={() => wrap("- ", "")} type="button"><List size={18} /></button>
      <button disabled={disabled} onClick={() => wrap("[small]", "[/small]")} type="button">{t("Chữ nhỏ", "Small")}</button>
      <button disabled={disabled} onClick={() => {
        const field = editor.current;
        if (field) onChange(value.slice(0, field.selectionStart) + descriptionPlainText(value.slice(field.selectionStart, field.selectionEnd)) + value.slice(field.selectionEnd));
      }} type="button">{t("Chữ thường", "Normal")}</button>
      <button disabled={disabled} onClick={() => wrap("[large]", "[/large]")} type="button">{t("Chữ lớn", "Large")}</button>
    </div>
    <textarea aria-invalid={invalid} disabled={disabled} id={id} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} ref={editor} rows={5} value={value} />
    <small>{value.length}/{maxLength}</small>
    <details><summary>{t("Xem trước định dạng", "Preview formatting")}</summary><RichDescription value={value} /></details>
  </div>;
}
