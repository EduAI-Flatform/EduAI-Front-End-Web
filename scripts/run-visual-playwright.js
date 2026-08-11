import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const playwrightArguments = visualPlaywrightArguments(process.argv.slice(2));
const childEnvironment = {
  ...process.env,
  VITE_API_BASE_URL: "/api/v1",
  VITE_DEMO_AUTH: "true",
};
delete childEnvironment.DEMO_ACCOUNT_PASSWORD;

const vite = spawn(
  process.execPath,
  [
    path.join(projectRoot, "node_modules", "vite", "bin", "vite.js"),
    "--host",
    "127.0.0.1",
    "--port",
    "5173",
  ],
  {
    cwd: projectRoot,
    env: childEnvironment,
    stdio: "ignore",
  },
);

let stopping = false;
function stopVite() {
  if (stopping || vite.exitCode !== null) return;
  stopping = true;
  vite.kill("SIGTERM");
}

process.once("SIGINT", stopVite);
process.once("SIGTERM", stopVite);

try {
  await waitForServer("http://127.0.0.1:5173", 60_000);
  const playwrightExitCode = await runPlaywright(playwrightArguments);
  process.exitCode = playwrightExitCode;
} finally {
  stopVite();
  await waitForExit(vite, 2_000);
  if (vite.exitCode === null) vite.kill("SIGKILL");
}

function visualPlaywrightArguments(argumentsFromCli) {
  const allowed = /^--update-snapshots(?:=(?:all|changed|missing|none))?$/;
  const unsupported = argumentsFromCli.find((argument) => !allowed.test(argument));
  if (unsupported) {
    throw new Error(
      "The visual runner only accepts Playwright snapshot-update flags.",
    );
  }
  return argumentsFromCli;
}

async function runPlaywright(argumentsFromCli) {
  const playwright = spawn(
    process.execPath,
    [
      path.join(projectRoot, "node_modules", "@playwright", "test", "cli.js"),
      "test",
      "--config=playwright.visual.config.ts",
      ...argumentsFromCli,
    ],
    {
      cwd: projectRoot,
      env: childEnvironment,
      stdio: "inherit",
    },
  );

  return new Promise((resolve, reject) => {
    playwright.once("error", reject);
    playwright.once("exit", (code) => resolve(code ?? 1));
  });
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (vite.exitCode !== null) {
      throw new Error(`Vite exited before readiness with code ${vite.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Timed out waiting for the visual-test Vite server");
}

function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
}
