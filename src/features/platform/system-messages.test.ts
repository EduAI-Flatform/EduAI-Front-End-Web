import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { SYSTEM_MESSAGES } from "./system-messages";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : file.endsWith(".tsx") && !file.endsWith(".test.tsx") ? [file] : [];
  });
}

describe("system UI catalog coverage", () => {
  it("keeps static Vietnamese UI copy and accessible attributes behind locale-aware rendering", () => {
    const issues: string[] = [];
    const uiAttributes = new Set(["title", "placeholder", "aria-label", "alt", "label", "description", "data-label"]);
    for (const file of sourceFiles(resolve("src"))) {
      const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const report = (node: ts.Node, message: string) => issues.push(`${relative(resolve("src"), file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${message}`);
      const checkVisibleExpression = (expression: ts.Expression): void => {
        if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression)) return checkVisibleExpression(expression.expression);
        if ((ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) && /[À-ỹĐđ]/.test(expression.text)) report(expression, "Unlocalized conditional UI text");
        if (ts.isConditionalExpression(expression)) { checkVisibleExpression(expression.whenTrue); checkVisibleExpression(expression.whenFalse); }
        if (ts.isBinaryExpression(expression) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(expression.operatorToken.kind)) checkVisibleExpression(expression.right);
        if (ts.isTemplateExpression(expression)) for (const fragment of [expression.head, ...expression.templateSpans.map(span => span.literal)]) if (/[À-ỹĐđ]/.test(fragment.text)) report(fragment, "Unlocalized visible template fragment");
      };
      const visit = (node: ts.Node) => {
        if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) checkVisibleExpression(node.expression);
        if (ts.isJsxText(node) && /[À-ỹĐđ]/.test(node.text)) report(node, "Unlocalized static JSX text");
        if (ts.isJsxAttribute(node) && node.initializer && ts.isStringLiteral(node.initializer) && uiAttributes.has(node.name.getText(source)) && /[À-ỹĐđ]/.test(node.initializer.text)) report(node, "Unlocalized static UI attribute");
        if (ts.isJsxAttribute(node) && node.name.getText(source) === "message" && (ts.isJsxOpeningElement(node.parent.parent) || ts.isJsxSelfClosingElement(node.parent.parent)) && node.parent.parent.tagName.getText(source) === "SystemText") {
          const value = node.initializer && ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer;
          if (value && ts.isStringLiteral(value) && !SYSTEM_MESSAGES[value.text]) report(node, `Missing English translation: ${value.text}`);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(issues).toEqual([]);
  });
});
