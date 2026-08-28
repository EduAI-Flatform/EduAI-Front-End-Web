import { afterEach, describe, expect, it, vi } from "vitest";
import { registerPwaServiceWorker } from "./pwa-runtime";

interface FakeRegistration {
  waiting: ServiceWorker | null;
  installing: ServiceWorker | null;
  addEventListener: (type: string, listener: EventListener) => void;
  update: () => Promise<void>;
}

function installServiceWorkerStub(registration: FakeRegistration) {
  const listeners = new Map<string, EventListener>();
  const serviceWorker = {
    controller: {},
    register: vi.fn().mockResolvedValue(registration),
    addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
    removeEventListener: vi.fn((type: string) => listeners.delete(type)),
  } as unknown as ServiceWorkerContainer;
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });
  return { serviceWorker, listeners };
}

describe("PWA Service Worker runtime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });

  it("registers once with root scope and reports an already waiting update", async () => {
    const waiting = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const updateFoundListeners = new Map<string, EventListener>();
    const registration: FakeRegistration = {
      waiting,
      installing: null,
      addEventListener: (type, listener) => updateFoundListeners.set(type, listener),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const onUpdateAvailable = vi.fn();
    const { serviceWorker } = installServiceWorkerStub(registration);

    const runtime = registerPwaServiceWorker({ onUpdateAvailable });
    await runtime?.registration;

    expect(serviceWorker.register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(onUpdateAvailable).toHaveBeenCalledWith(registration);
    expect(updateFoundListeners.has("updatefound")).toBe(true);
  });

  it("activates a waiting worker only after an explicit update action", async () => {
    const waiting = { postMessage: vi.fn() } as unknown as ServiceWorker;
    const registration: FakeRegistration = {
      waiting,
      installing: null,
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };
    const { serviceWorker } = installServiceWorkerStub(registration);

    const runtime = registerPwaServiceWorker();
    await expect(runtime?.applyUpdate()).resolves.toBe(true);

    expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });
    expect(serviceWorker.removeEventListener).not.toHaveBeenCalled();
    runtime?.dispose();
    expect(serviceWorker.removeEventListener).toHaveBeenCalledWith(
      "controllerchange",
      expect.any(Function),
    );
  });
});
