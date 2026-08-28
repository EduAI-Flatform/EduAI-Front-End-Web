import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GoogleEmbeddedBrowserRecovery } from "./GoogleAuthRecoveryActions";

const embeddedUserAgents = [
  ["Zalo iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Zalo/1.0"],
  ["Zalo Android", "Mozilla/5.0 (Linux; Android 14; Mobile) Zalo/1.0"],
  ["Facebook iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) FBAN/FBIOS"],
  ["Facebook Android", "Mozilla/5.0 (Linux; Android 14) FB_IAB/FB4A"],
  ["Messenger", "Mozilla/5.0 (Linux; Android 14) Messenger"],
  ["Android WebView", "Mozilla/5.0 (Linux; Android 14; wv) Version/4.0"],
] as const;

describe("Google embedded-browser recovery", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      embeddedUserAgents[0][1],
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it.each(embeddedUserAgents)("renders recovery guidance for %s", (_label, userAgent) => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);

    render(<GoogleEmbeddedBrowserRecovery />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Safari|Chrome/);
    expect(screen.getByText(/\u2022\u2022\u2022/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "M\u1edf b\u1eb1ng Safari/Chrome" })).toBeInTheDocument();
  });

  it.each([320, 375, 390, 412])("renders one recovery action at %dpx", (width) => {
    window.innerWidth = width;

    render(<GoogleEmbeddedBrowserRecovery />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "M\u1edf b\u1eb1ng Safari/Chrome" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });

  it("keeps the handoff keyboard reachable and callback-free", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/login?state=stale#access_token=redacted");

    render(<GoogleEmbeddedBrowserRecovery />);

    const recovery = screen.getByRole("status");
    const handoff = screen.getByRole("link", {
      name: "M\u1edf b\u1eb1ng Safari/Chrome",
    });

    expect(recovery).toHaveAttribute(
      "aria-labelledby",
      "google-embedded-recovery-title",
    );
    expect(recovery).toHaveAttribute(
      "aria-describedby",
      "google-embedded-recovery-description",
    );
    expect(recovery.querySelector(".auth-embedded-recovery__icon")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    await user.tab();
    expect(handoff).toHaveFocus();
    expect(handoff).toHaveAttribute("rel", "noopener noreferrer");
    expect(handoff.getAttribute("href")).toBe("http://localhost:3000/login");
  });
});
