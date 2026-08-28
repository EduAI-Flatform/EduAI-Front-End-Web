import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PwaInstallButton } from "./PwaInstallButton";
import { PwaInstallGuide } from "./PwaInstallGuide";
import { PwaInstallPrompt } from "./PwaInstallPrompt";
import { PwaOfflineNotice } from "./PwaOfflineNotice";
import { PwaProvider } from "./PwaProvider";
import { PwaContext, defaultPwaContext, type PwaContextValue } from "./pwa-context";
import { PwaUpdatePrompt } from "./PwaUpdatePrompt";
import { PWA_INSTALL_DISMISSED_KEY } from "./pwa-utils";
import type { PwaPlatform } from "./pwa-utils";

function makePwaContext(overrides: Partial<PwaContextValue> = {}): PwaContextValue {
  return {
    ...defaultPwaContext,
    platform: "chromium-desktop",
    showInstallEntry: true,
    ...overrides,
  };
}

function renderWithPwa(overrides: Partial<PwaContextValue>, child: React.ReactNode) {
  return render(
    <PwaContext.Provider value={makePwaContext(overrides)}>
      {child}
    </PwaContext.Provider>,
  );
}

describe("PWA install and lifecycle UI", () => {
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it("captures the desktop install prompt and hides the CTA after acceptance", async () => {
    const user = userEvent.setup();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event("beforeinstallprompt"), {
      platforms: ["web"],
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });

    render(
      <PwaProvider enableServiceWorker={false}>
        <PwaInstallButton />
      </PwaProvider>,
    );

    window.dispatchEvent(event);
    const installButton = await screen.findByRole("button", { name: "Cài đặt EduAI" });
    await user.click(installButton);

    expect(prompt).toHaveBeenCalledOnce();
    expect(await screen.findByText("Bạn đang ngoại tuyến").catch(() => null)).toBeNull();
    expect(screen.queryByRole("button", { name: "Cài đặt EduAI" })).not.toBeInTheDocument();
  });

  it("persists a native browser dismissal", async () => {
    const user = userEvent.setup();
    const event = Object.assign(new Event("beforeinstallprompt"), {
      platforms: ["web"],
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: "dismissed", platform: "web" }),
    });

    render(
      <PwaProvider enableServiceWorker={false}>
        <PwaInstallButton />
      </PwaProvider>,
    );

    window.dispatchEvent(event);
    await user.click(await screen.findByRole("button", { name: /EduAI/ }));

    expect(localStorage.getItem(PWA_INSTALL_DISMISSED_KEY)).toBe("1");
  });
  it.each([
    ["ios", "Cài EduAI trên iPhone/iPad", "Thêm vào Màn hình chính"],
    ["android", "Cài đặt EduAI", "menu ⋮"],
    ["chromium-desktop", "Cài đặt EduAI", "Chrome và Edge"],
  ] as Array<[PwaPlatform, string, string]>)
  ("shows the correct manual installation guide for %s", async (platform, title, guidance) => {
    const user = userEvent.setup();
    renderWithPwa({ platform, canInstall: false }, <PwaInstallButton />);

    await user.click(screen.getByRole("button", { name: "Cài đặt EduAI" }));

    expect(await screen.findByRole("dialog", { name: title })).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(guidance)).length).toBeGreaterThan(0);
  });

  it("renders the iOS guide as explicit Safari steps", () => {
    render(<PwaInstallGuide platform="ios" />);

    expect(screen.getByText(/Nhấn nút Chia sẻ trong Safari/)).toBeInTheDocument();
    expect(screen.getByText(/Chọn “Thêm vào Màn hình chính”/)).toBeInTheDocument();
  });

  it("does not show install UI when installed or unsupported", () => {
    const { rerender } = renderWithPwa({ isInstalled: true, isStandalone: true, showInstallEntry: false }, <PwaInstallButton />);
    expect(screen.queryByRole("button", { name: "Cài đặt EduAI" })).not.toBeInTheDocument();

    rerender(
      <PwaContext.Provider value={makePwaContext({ platform: "unsupported", showInstallEntry: false })}>
        <PwaInstallButton />
      </PwaContext.Provider>,
    );
    expect(screen.queryByRole("button", { name: "Cài đặt EduAI" })).not.toBeInTheDocument();
  });

  it("does not immediately nag and persists a prompt dismissal", async () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    renderWithPwa({ dismissInstallPrompt: dismiss }, <PwaInstallPrompt />);

    expect(screen.queryByRole("region", { name: "Cài đặt EduAI" })).not.toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(screen.getByRole("region", { name: "Cài đặt EduAI" })).toBeInTheDocument();

    await screen.getByRole("button", { name: "Để sau" }).click();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it("keeps the install entry keyboard accessible", async () => {
    const user = userEvent.setup();
    renderWithPwa({ platform: "android", canInstall: false }, <PwaInstallButton />);

    const installButton = screen.getByRole("button", { name: /EduAI/ });
    installButton.focus();
    expect(document.activeElement).toBe(installButton);
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeVisible();
  });
  it("shows a retryable branded offline state", () => {
    renderWithPwa({ isOnline: false }, <PwaOfflineNotice />);

    expect(screen.getByRole("status", { name: "Trạng thái kết nối" })).toBeInTheDocument();
    expect(screen.getByText("Bạn đang ngoại tuyến")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
  });

  it("lets users explicitly accept an available update", async () => {
    const user = userEvent.setup();
    const applyUpdate = vi.fn().mockResolvedValue(undefined);
    renderWithPwa({ updateAvailable: true, applyUpdate }, <PwaUpdatePrompt />);

    await user.click(screen.getByRole("button", { name: "Cập nhật" }));
    expect(applyUpdate).toHaveBeenCalledOnce();
  });
});
