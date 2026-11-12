import { translateSystemMessage } from "../features/platform/translate-system-message";
import { ApiClient, ApiClientError } from "./api-client";
import { getAuthSession } from "./auth.service";

export interface Certificate {
  id: string;
  certificateCode: string;
  title: string;
  issuedAt: string;
  verificationUrl: string | null;
  qrCodeUrl: string | null;
  courseTitle?: string;
  status: "active" | "revoked";
  revokedAt: string | null;
  revocationReason: string | null;
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

const publicApiClient = new ApiClient();

export interface CertificateVerification {
  certificateCode: string;
  title: string;
  issuedAt: string;
  verificationUrl: string | null;
  courseTitle: string;
  recipientName: string;
  status: "active" | "revoked";
  revokedAt: string | null;
}

export const certificateService = {
  listMyCertificates(): Promise<Certificate[]> {
    return authenticatedApiClient.get<Certificate[]>("/me/certificates");
  },

  verifyCertificate(code: string): Promise<CertificateVerification> {
    return publicApiClient.get<CertificateVerification>(
      `/certificates/verify/${encodeURIComponent(code)}`,
    );
  },
};

export function getCertificateErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return translateSystemMessage("Vui lòng đăng nhập để xem chứng chỉ của bạn.");
    }

    if (error.status === 403) {
      return translateSystemMessage("Tài khoản của bạn không có quyền xem chứng chỉ.");
    }
  }

  return translateSystemMessage("Không thể tải chứng chỉ lúc này. Vui lòng thử lại.");
}
