import { SystemText, useSystemMessages } from "../../platform/SystemText";
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
  const messageForUi = useSystemMessages();
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
          <Dialog.Title><SystemText message="Xác nhận" />{" "}{actionLabel.toLowerCase()}</Dialog.Title>
          <Dialog.Description>
            <SystemText message={"Hành động sẽ thay đổi khả năng hiển thị của “"} />{targetTitle}<SystemText message={"” và được ghi vào nhật ký kiểm toán."} />
          </Dialog.Description>

          <label>
            <span><SystemText message={"Lý do kiểm duyệt"} /></span>
            <textarea
              aria-label={messageForUi("Lý do kiểm duyệt")}
              autoFocus
              disabled={isSubmitting}
              maxLength={500}
              onChange={(event) => onReasonChange(event.target.value)}
              placeholder={messageForUi("Nêu lý do rõ ràng để chủ sở hữu có thể xử lý.")}
              rows={5}
              value={reason}
            />
            <small>{normalizedReason.length}<SystemText message={"/500 · Tối thiểu 3 ký tự"} /></small>
          </label>

          {error ? (
            <p className="admin-moderation-dialog__error" role="alert">
              <AlertTriangle aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <div className="admin-moderation-dialog__actions">
            <button disabled={isSubmitting} onClick={onCancel} type="button"><SystemText message="Hủy" /></button>
            <button
              className="admin-moderation-dialog__confirm"
              disabled={normalizedReason.length < 3 || isSubmitting}
              onClick={onConfirm}
              type="button"
            >
              {isSubmitting ? <SystemText message={"Đang lưu…"} /> : <SystemText message={"Xác nhận thay đổi"} />}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
