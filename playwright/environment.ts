import { loadEnv } from "vite";

export function loadPlaywrightEnvironment(
  projectRoot: string,
  environment: NodeJS.ProcessEnv = process.env,
): { configured: boolean } {
  if (!environment.DEMO_ACCOUNT_PASSWORD?.trim()) {
    const fileEnvironment = loadEnv("test", projectRoot, "");
    const filePassword = fileEnvironment.DEMO_ACCOUNT_PASSWORD;

    if (filePassword?.trim()) {
      environment.DEMO_ACCOUNT_PASSWORD = filePassword;
    }
  }

  return {
    configured: Boolean(environment.DEMO_ACCOUNT_PASSWORD?.trim()),
  };
}
