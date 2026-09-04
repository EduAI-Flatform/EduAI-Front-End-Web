import { GraduationCap, IdCard, type LucideIcon } from "lucide-react";
import type { RegistrationRole } from "../../services/auth.service";

export interface RegistrationRoleOption {
  description: string;
  icon: LucideIcon;
  label: string;
  value: RegistrationRole;
}

export const REGISTRATION_ROLE_OPTIONS: readonly RegistrationRoleOption[] = [
  {
    description: "Khám phá tri thức",
    icon: GraduationCap,
    label: "Học viên",
    value: "student",
  },
  {
    description: "Chia sẻ kiến thức",
    icon: IdCard,
    label: "Giảng viên",
    value: "instructor",
  },
];
