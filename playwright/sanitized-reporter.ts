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
    {
      diagnostic?: string;
      expectedStatus: TestCase["expectedStatus"];
      status: TestResult["status"];
      title: string;
    }
  >();

  onBegin(_config: FullConfig, suite: Suite): void {
    console.log(
      `Running ${suite.allTests().length} sanitized production checks`,
    );
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const title = test.titlePath().slice(1).join(" > ");
    this.finalResults.set(test.id, {
      diagnostic: extractLayoutDiagnostic(result.error?.message),
      expectedStatus: test.expectedStatus,
      status: result.status,
      title,
    });
    console.log(`${result.status.toUpperCase()}: ${title}`);
  }

  onEnd(result: FullResult): void {
    for (const test of this.finalResults.values()) {
      if (test.status === test.expectedStatus || test.status === "skipped")
        continue;
      console.log(
        `::error title=Sanitized Playwright failure::${escapeWorkflowCommand(test.title)} (${test.status})`,
      );
      if (test.diagnostic) {
        console.log(
          `::error title=Sanitized layout overflow::${escapeWorkflowCommand(test.diagnostic)}`,
        );
      }
    }
    console.log(`Sanitized production result: ${result.status.toUpperCase()}`);
  }

  printsToStdio(): boolean {
    return true;
  }
}

function extractLayoutDiagnostic(
  message: string | undefined,
): string | undefined {
  const prefix = "Horizontal overflow: ";
  const diagnostic = message
    ?.split(/\r?\n/)
    .find((line) => line.includes(prefix))
    ?.split(prefix, 2)[1]
    ?.trim()
    .slice(0, 1_500);

  return diagnostic && /^[a-zA-Z0-9_=;,.#\-[\]]+$/.test(diagnostic)
    ? diagnostic
    : undefined;
}

function escapeWorkflowCommand(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
