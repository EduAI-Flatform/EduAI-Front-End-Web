import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "../../components/ui/button";
import { OAuthProfileCompletionForm } from "./OAuthProfileCompletionForm";
import type {
  OAuthProfileCompletionInput,
  OAuthProfileResponse,
} from "./OAuthProfileCompletionForm";
import type { RegistrationRole } from "../../services/auth.service";

interface OAuthProfileCompletionDialogProps {
  onCancel: () => void;
  onComplete: (
    profile: OAuthProfileResponse,
    input: OAuthProfileCompletionInput,
  ) => Promise<void>;
  profile: OAuthProfileResponse | null;
  role: RegistrationRole | null;
}

export function OAuthProfileCompletionDialog({
  onCancel,
  onComplete,
  profile,
  role,
}: OAuthProfileCompletionDialogProps) {
  const selectedRole = role ?? profile?.role ?? null;

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      open={Boolean(profile)}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" />
        <Dialog.Content className="social-oauth-profile-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl">
          <div className="mb-3 flex justify-end">
            <Dialog.Close asChild>
              <Button aria-label="Đóng" size="icon" variant="ghost">
                ×
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Title className="sr-only">Hoàn tất hồ sơ EduAI</Dialog.Title>
          <Dialog.Description className="sr-only">
            Bổ sung email để hoàn tất tài khoản EduAI.
          </Dialog.Description>
          {profile && selectedRole ? (
            <OAuthProfileCompletionForm
              onComplete={(input) => onComplete(profile, input)}
              profile={profile}
              role={selectedRole}
            />
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
