import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

export default class SanitizedReporter implements Reporter {
  onBegin(_config: FullConfig, suite: Suite): void {
    console.log(`Running ${suite.allTests().length} sanitized production checks`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const title = test.titlePath().slice(1).join(" > ");
    console.log(`${result.status.toUpperCase()}: ${title}`);
  }

  onEnd(result: FullResult): void {
    console.log(`Sanitized production result: ${result.status.toUpperCase()}`);
  }

  printsToStdio(): boolean {
    return true;
  }
}
