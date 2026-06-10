import type { ReactNode } from "react";

type InstructorLayoutProps = {
  children: ReactNode;
};

export function InstructorLayout({ children }: InstructorLayoutProps) {
  return <>{children}</>;
}
