// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { certificateService } from "../../services/certificate.service";
import { CertificateVerificationPage } from "./CertificateVerificationPage";

vi.mock("../../services/certificate.service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../services/certificate.service")>();
  return {
    ...actual,
    certificateService: {
      ...actual.certificateService,
      verifyCertificate: vi.fn(),
    },
  };
});

describe("CertificateVerificationPage", () => {
  beforeEach(() => {
    vi.mocked(certificateService.verifyCertificate).mockResolvedValue({
      certificateCode: "CERT-LEGACY",
      title: "Course completion",
      issuedAt: "2026-08-01T00:00:00.000Z",
      verificationUrl: null,
      courseTitle: "Dedicated UAT course",
      recipientName: "UAT Student",
      status: "revoked",
      revokedAt: "2026-08-12T00:00:00.000Z",
    });
  });

  it("renders a traceable revoked certificate without presenting it as valid", async () => {
    render(
      <MemoryRouter initialEntries={["/verify/CERT-LEGACY"]}>
        <Routes>
          <Route path="/verify/:code" element={<CertificateVerificationPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Chứng chỉ đã bị thu hồi")).toBeInTheDocument();
    expect(screen.getByText("CERT-LEGACY")).toBeInTheDocument();
    expect(screen.queryByText("Chứng chỉ hợp lệ")).not.toBeInTheDocument();
    expect(screen.queryByText(/lý do/i)).not.toBeInTheDocument();
  });
});
