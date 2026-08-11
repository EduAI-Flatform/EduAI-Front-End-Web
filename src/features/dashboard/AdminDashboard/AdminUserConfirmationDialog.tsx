import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";

interface AdminUserConfirmationDialogProps {
  description: string;
  error: string | null;
  isSubmitting: boolean;
  open: boolean;
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function AdminUserConfirmationDialog({
  description,
  error,
  isSubmitting,
  open,
  title,
  onCancel,
  onConfirm,
}: AdminUserConfirmationDialogProps) {
  return (
    <Dialog.Root
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) onCancel();
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="admin-user-dialog__overlay" />
        <Dialog.Content className="admin-user-dialog__content">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          {error ? (
            <p className="admin-user-dialog__error" role="alert">
              <AlertTriangle aria-hidden="true" />
              {error}
            </p>
          ) : null}
          <div className="admin-user-dialog__actions">
            <button
              disabled={isSubmitting}
              onClick={onCancel}
              type="button"
            >
              Hủy
            </button>
            <button
              className="admin-user-dialog__confirm"
              disabled={isSubmitting}
              onClick={onConfirm}
              type="button"
            >
              {isSubmitting ? "Đang lưu…" : "Xác nhận thay đổi"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
