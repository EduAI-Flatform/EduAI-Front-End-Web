import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";

interface AdminModerationDialogProps {
  actionLabel: string;
  error: string | null;
  isSubmitting: boolean;
  open: boolean;
  reason: string;
  targetTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  onReasonChange: (reason: string) => void;
}

export function AdminModerationDialog({
  actionLabel,
  error,
  isSubmitting,
  open,
  reason,
  targetTitle,
  onCancel,
  onConfirm,
  onReasonChange,
}: AdminModerationDialogProps) {
  const normalizedReason = reason.trim();

  return (
    <Dialog.Root
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) onCancel();
      }}
      open={open}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="admin-moderation-dialog__overlay" />
        <Dialog.Content className="admin-moderation-dialog__content">
          <Dialog.Title>Xác nhận {actionLabel.toLowerCase()}</Dialog.Title>
          <Dialog.Description>
            Hành động sẽ thay đổi khả năng hiển thị của “{targetTitle}” và được
            ghi vào nhật ký kiểm toán.
          </Dialog.Description>

          <label>
            <span>Lý do kiểm duyệt</span>
            <textarea
              aria-label="Lý do kiểm duyệt"
              autoFocus
              disabled={isSubmitting}
              maxLength={500}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder="Nêu lý do rõ ràng để chủ sở hữu có thể xử lý."
              rows={5}
              value={reason}
            />
            <small>{normalizedReason.length}/500 · Tối thiểu 3 ký tự</small>
          </label>

          {error ? (
            <p className="admin-moderation-dialog__error" role="alert">
              <AlertTriangle aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <div className="admin-moderation-dialog__actions">
            <button disabled={isSubmitting} onClick={onCancel} type="button">
              Hủy
            </button>
            <button
              className="admin-moderation-dialog__confirm"
              disabled={normalizedReason.length < 3 || isSubmitting}
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
