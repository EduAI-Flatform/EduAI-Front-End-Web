import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, GraduationCap, IdCard, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  type GoogleRoleSelectionRequiredError,
  type RegistrationRole,
} from "../../services/auth.service";

interface GoogleRoleSelectionModalProps {
  error: GoogleRoleSelectionRequiredError | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (role: RegistrationRole) => Promise<void>;
}

const roleOptions: Array<{
  description: string;
  icon: typeof GraduationCap;
  label: string;
  value: RegistrationRole;
}> = [
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

export function GoogleRoleSelectionModal({
  error,
  isSubmitting,
  onCancel,
  onConfirm,
}: GoogleRoleSelectionModalProps) {
  const [selectedRole, setSelectedRole] = useState<RegistrationRole | null>(
    null,
  );

  useEffect(() => {
    if (error) {
      setSelectedRole(null);
    }
  }, [error]);

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onCancel();
        }
      }}
      open={Boolean(error)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-foreground">
                Chọn vai trò của bạn
              </Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                Hãy chọn vai trò để hoàn tất việc tạo tài khoản EduAI.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                aria-label="Đóng"
                disabled={isSubmitting}
                size="icon"
                variant="ghost"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedRole === option.value;

              return (
                <button
                  aria-pressed={isSelected}
                  className={
                    isSelected
                      ? "flex items-center gap-3 rounded-xl border-2 border-primary bg-primary/5 p-4 text-left"
                      : "flex items-center gap-3 rounded-xl border border-border bg-background p-4 text-left hover:border-primary/60"
                  }
                  disabled={isSubmitting}
                  key={option.value}
                  onClick={() => setSelectedRole(option.value)}
                  type="button"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-semibold">
                      {option.label}
                    </strong>
                    <small className="mt-1 block text-xs text-muted-foreground">
                      {option.description}
                    </small>
                  </span>
                  {isSelected ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0 text-primary"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button disabled={isSubmitting} onClick={onCancel} variant="ghost">
              Hủy
            </Button>
            <Button
              disabled={!selectedRole || isSubmitting}
              onClick={() => {
                if (selectedRole) {
                  void onConfirm(selectedRole);
                }
              }}
            >
              {isSubmitting ? "Đang tạo tài khoản..." : "Tiếp tục"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
