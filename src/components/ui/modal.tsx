import { useSystemMessages } from "../../features/platform/SystemText";
import { useRef } from 'react';
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface ModalProps {
  children: React.ReactNode;
  description?: string;
  title: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Modal({ children, description, title, trigger, open, onOpenChange, className }: ModalProps) {
  const translateUI = useSystemMessages();
  const externalOpener = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content
          onOpenAutoFocus={() => {
            if (!trigger) {
              const active = document.activeElement;
              externalOpener.current = active instanceof HTMLElement && active !== document.body ? active : null;
            }
          }}
          onCloseAutoFocus={event => {
            if (trigger) return; // Radix restores its own Dialog.Trigger.
            const target = externalOpener.current;
            externalOpener.current = null;
            if (!target?.isConnected || target.matches(':disabled, [aria-disabled="true"]') ||
                target.closest('[hidden], [inert], [aria-hidden="true"]')) return;
            // A newer dialog owns focus; a nested dialog may return to its parent.
            const focusedDialog = document.activeElement?.closest('[role="dialog"]');
            if (focusedDialog && !focusedDialog.contains(target)) return;
            target.focus({ preventScroll: true });
            if (document.activeElement === target) event.preventDefault();
          }}

          onEscapeKeyDown={event => {
            // An expanded combobox consumes the first Escape before the dialog.
            if (event.target instanceof Element && event.target.closest('[role="combobox"][aria-expanded="true"]')) event.preventDefault();
          }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-[var(--radius-card)] border border-border bg-card p-5 text-card-foreground shadow-xl sm:p-6",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold text-foreground">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button aria-label={translateUI("Đóng")} size="icon" variant="ghost">
                <X aria-hidden="true" className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="mt-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
