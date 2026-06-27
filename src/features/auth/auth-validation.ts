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
    return "Vui lòng nhập email.";
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Email không hợp lệ.";
  }

  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Vui lòng nhập mật khẩu.";
  }

  if (password.length < 8) {
    return "Mật khẩu cần có ít nhất 8 ký tự.";
  }

  return undefined;
}

export function validateFullName(fullName: string): string | undefined {
  if (!fullName.trim()) {
    return "Vui lòng nhập họ và tên.";
  }

  if (fullName.trim().length < 2) {
    return "Họ và tên quá ngắn.";
  }

  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) {
    return "Vui lòng xác nhận mật khẩu.";
  }

  if (password !== confirmPassword) {
    return "Mật khẩu xác nhận không khớp.";
  }

  return undefined;
}

export function validateRegistrationRole(role: string): string | undefined {
  if (role !== "student" && role !== "instructor") {
    return "Vui lòng chọn vai trò tài khoản.";
  }

  return undefined;
}
