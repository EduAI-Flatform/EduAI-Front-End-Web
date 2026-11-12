import { translateSystemMessage } from "../platform/translate-system-message";
export interface AuthFormErrors {
  confirmPassword?: string;
  email?: string;
  fullName?: string;
  password?: string;
  role?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return translateSystemMessage("Vui lòng nhập email.");
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return translateSystemMessage("Email không hợp lệ.");
  }

  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return translateSystemMessage("Vui lòng nhập mật khẩu.");
  }

  if (password.length < 8) {
    return translateSystemMessage("Mật khẩu cần có ít nhất 8 ký tự.");
  }

  return undefined;
}

export function validateFullName(fullName: string): string | undefined {
  if (!fullName.trim()) {
    return translateSystemMessage("Vui lòng nhập họ và tên.");
  }

  if (fullName.trim().length < 2) {
    return translateSystemMessage("Họ và tên quá ngắn.");
  }

  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) {
    return translateSystemMessage("Vui lòng xác nhận mật khẩu.");
  }

  if (password !== confirmPassword) {
    return translateSystemMessage("Mật khẩu xác nhận không khớp.");
  }

  return undefined;
}

export function validateRegistrationRole(role: string): string | undefined {
  if (role !== "student" && role !== "instructor") {
    return translateSystemMessage("Vui lòng chọn vai trò tài khoản.");
  }

  return undefined;
}
