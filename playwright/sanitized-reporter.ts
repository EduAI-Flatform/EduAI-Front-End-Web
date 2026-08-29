import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

export default class SanitizedReporter implements Reporter {
  private readonly finalResults = new Map<
    string,
    { expectedStatus: TestCase["expectedStatus"]; status: TestResult["status"]; title: string }
  >();

  onBegin(_config: FullConfig, suite: Suite): void {
    console.log(`Running ${suite.allTests().length} sanitized production checks`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const title = test.titlePath().slice(1).join(" > ");
    this.finalResults.set(test.id, {
      expectedStatus: test.expectedStatus,
      status: result.status,
      title,
    });
    console.log(`${result.status.toUpperCase()}: ${title}`);
  }

  onEnd(result: FullResult): void {
    for (const test of this.finalResults.values()) {
      if (test.status === test.expectedStatus || test.status === "skipped") continue;
      console.log(
        `::error title=Sanitized Playwright failure::${escapeWorkflowCommand(test.title)} (${test.status})`,
      );
    }
    console.log(`Sanitized production result: ${result.status.toUpperCase()}`);
  }

  printsToStdio(): boolean {
    return true;
  }
}

function escapeWorkflowCommand(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}
