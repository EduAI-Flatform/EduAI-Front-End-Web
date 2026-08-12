// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { certificateService } from "../../services/certificate.service";
import { CertificatesPage } from "./CertificatesPage";

vi.mock("../../services/certificate.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/certificate.service")>();
  return {
    ...actual,
    certificateService: {
      ...actual.certificateService,
      listMyCertificates: vi.fn(),
    },
  };
});

describe("CertificatesPage", () => {
  beforeEach(() => {
    vi.mocked(certificateService.listMyCertificates).mockResolvedValue([
      {
        id: "certificate-1",
        certificateCode: "CERT-REVOKED",
        title: "Course completion",
        issuedAt: "2026-08-01T00:00:00.000Z",
        verificationUrl: "/verify/CERT-REVOKED",
        qrCodeUrl: "/certificate.png",
        courseTitle: "Dedicated UAT course",
        status: "revoked",
        revokedAt: "2026-08-12T00:00:00.000Z",
        revocationReason: "Issued during bounded production UAT",
      },
    ]);
  });

  it("shows the revoked state and prevents downloading its QR code", async () => {
    render(
      <MemoryRouter>
        <CertificatesPage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText("Đã thu hồi")).not.toHaveLength(0);
    expect(screen.getByText("Issued during bounded production UAT")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tải mã QR" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở trang xác thực" })).toBeInTheDocument();
  });
});
