import type {
  AdminUserRole,
  AdminUserStatus,
} from "../../../services/admin-users.service";

export const ADMIN_USER_ROLES: AdminUserRole[] = [
  "student",
  "instructor",
  "platform_admin",
];

export const ROLE_LABELS: Record<AdminUserRole, string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  platform_admin: "Quản trị viên nền tảng",
};

export const STATUS_LABELS: Record<AdminUserStatus, string> = {
  active: "Hoạt động",
  inactive: "Chưa kích hoạt",
  suspended: "Tạm ngưng",
};
