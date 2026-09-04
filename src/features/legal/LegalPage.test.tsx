import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { DataDeletionPage, PrivacyPage, TermsPage } from "./LegalPage";

describe("Legal pages", () => {
  it("publishes the privacy policy and data-deletion route", () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Chính sách bảo mật", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Yêu cầu xóa dữ liệu" })).toHaveAttribute(
      "href",
      "/data-deletion",
    );
    expect(screen.getByRole("link", { name: /0834\.038\.128/ })).toHaveAttribute(
      "href",
      "tel:+84834038128",
    );
    expect(document.title).toBe("Chính sách bảo mật | EduAI");
  });

  it("renders a complete Terms of Service document", () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Điều khoản sử dụng", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/EduAI không nhận hoặc lưu mật khẩu Google, Facebook hay Zalo/i)).toBeInTheDocument();
    expect(screen.getByText(/người dùng cần tự kiểm chứng/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Thông tin liên hệ", level: 2 })).toBeInTheDocument();
    expect(document.title).toBe("Điều khoản sử dụng | EduAI");

    for (const heading of [
      "Giới thiệu và phạm vi áp dụng",
      "Chấp nhận điều khoản",
      "Điều kiện sử dụng tài khoản",
      "Đăng ký và đăng nhập",
      "Đăng nhập bằng Google, Facebook và Zalo",
      "Trách nhiệm bảo mật tài khoản",
      "Nội dung và tài nguyên học tập",
      "Quyền và nghĩa vụ của người dùng",
      "Nội dung do người dùng cung cấp",
      "Hành vi bị cấm",
      "Quyền sở hữu trí tuệ",
      "Tính năng AI",
      "Nội dung do AI tạo ra và giới hạn của AI",
      "Khuyến cáo người dùng kiểm chứng kết quả AI",
      "Khóa học, chứng chỉ và tiến độ học tập",
      "Tính năng thương mại và thanh toán",
      "Chính sách tạm ngừng/chấm dứt tài khoản",
      "Xóa tài khoản và dữ liệu",
      "Dịch vụ của bên thứ ba",
      "Google/Facebook/Zalo OAuth",
      "Giới hạn trách nhiệm hợp lý",
      "Thay đổi dịch vụ",
      "Thay đổi điều khoản",
      "Luật áp dụng",
      "Thông tin liên hệ",
    ]) {
      expect(screen.getByRole("heading", { name: heading, level: 2 })).toBeInTheDocument();
    }
  });

  it("explains the manual Facebook data-deletion path", () => {
    render(
      <MemoryRouter>
        <DataDeletionPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Yêu cầu xóa dữ liệu", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Apps and Websites/i)).toBeInTheDocument();
    expect(screen.getByText(/không gửi mật khẩu/i)).toBeInTheDocument();
    expect(screen.getByText(/không tự động xóa tài khoản EduAI/i)).toBeInTheDocument();
    expect(screen.getByText(/Facebook, Google hoặc Zalo/i)).toBeInTheDocument();
  });
});
