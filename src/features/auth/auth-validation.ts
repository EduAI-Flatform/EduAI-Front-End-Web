export interface AuthFormErrors {
  confirmPassword?: string;
  email?: string;
  fullName?: string;
  password?: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | undefined {
  if (!email.trim()) {
    return "Email is required.";
  }

  if (!EMAIL_PATTERN.test(email.trim())) {
    return "Enter a valid email address.";
  }

  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Password is required.";
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  return undefined;
}

export function validateFullName(fullName: string): string | undefined {
  if (!fullName.trim()) {
    return "Full name is required.";
  }

  if (fullName.trim().length < 2) {
    return "Full name is too short.";
  }

  return undefined;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) {
    return "Please confirm your password.";
  }

  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }

  return undefined;
}
