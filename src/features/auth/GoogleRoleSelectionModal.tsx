import {
  type GoogleRoleSelectionRequiredError,
  type RegistrationRole,
} from "../../services/auth.service";
import { SocialRoleSelectionModal } from "./SocialRoleSelectionModal";

interface GoogleRoleSelectionModalProps {
  error: GoogleRoleSelectionRequiredError | null;
  isSubmitting: boolean;
  onCancel: () => void;
  onConfirm: (role: RegistrationRole) => Promise<void>;
}

export function GoogleRoleSelectionModal({
  error,
  isSubmitting,
  onCancel,
  onConfirm,
}: GoogleRoleSelectionModalProps) {
  return (
    <SocialRoleSelectionModal
      isSubmitting={isSubmitting}
      onCancel={onCancel}
      onConfirm={onConfirm}
      provider={error ? "google" : null}
    />
  );
}
