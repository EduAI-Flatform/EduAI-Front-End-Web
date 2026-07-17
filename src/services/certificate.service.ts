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
}

const authenticatedApiClient = new ApiClient({
  getAccessToken: () => getAuthSession()?.accessToken,
});

export const certificateService = {
  listMyCertificates(): Promise<Certificate[]> {
    return authenticatedApiClient.get<Certificate[]>("/me/certificates");
  },
};

export function getCertificateErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return "Vui lòng đăng nhập để xem chứng chỉ của bạn.";
    }

    if (error.status === 403) {
      return "Tài khoản của bạn không có quyền xem chứng chỉ.";
    }
  }

  return "Không thể tải chứng chỉ lúc này. Vui lòng thử lại.";
}
