import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  PlatformProvider,
  usePlatform,
  formatPlatformMoney,
} from "./PlatformProvider";
const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../services/api-client", () => ({ apiClient: { get: mocks.get } }));
function Probe() {
  const { locale, setLocale, settings, t } = usePlatform();
  return (
    <>
      <span>{settings.branding.name}</span>
      <span>{t("Xin chào", "Hello")}</span>
      <button onClick={() => setLocale(locale === "vi" ? "en" : "vi")}>
        switch
      </button>
    </>
  );
}
describe("platform preferences", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.get.mockResolvedValue({ settings: {} });
  });
  afterEach(() => vi.restoreAllMocks());
  it("loads published branding, switches locale and retains preference", async () => {
    mocks.get.mockResolvedValue({
      settings: { branding: { name: "Published GDS" } },
    });
    render(
      <PlatformProvider>
        <Probe />
      </PlatformProvider>,
    );
    await screen.findByText("Published GDS");
    act(() => screen.getByRole("button").click());
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("gds.locale.v1")).toBe("en");
  });
  it("keeps safe branding defaults when public settings are offline", async () => {
    mocks.get.mockRejectedValue(new TypeError("offline"));
    render(
      <PlatformProvider>
        <Probe />
      </PlatformProvider>,
    );
    await waitFor(() => expect(mocks.get).toHaveBeenCalled());
    expect(screen.getByText("GDS")).toBeInTheDocument();
  });
  it("formats money by locale without converting its value", () => {
    expect(formatPlatformMoney(100, "USD", "en")).toBe("$100.00");
    expect(formatPlatformMoney(100, "USD", "vi")).toContain("100");
  });
});
