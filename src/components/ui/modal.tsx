import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface ModalProps {
  children: React.ReactNode;
  description?: string;
  title: string;
  trigger: React.ReactNode;
}

export function Modal({ children, description, title, trigger }: ModalProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl",
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
              <Button aria-label="Đóng" size="icon" variant="ghost">
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
