import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

interface LoadingProps {
  className?: string;
  label?: string;
}

export function Loading({ className, label = "Đang tải" }: LoadingProps) {
  return (
    <span
      aria-label={label}
      className={cn("inline-flex items-center gap-2 text-sm text-muted-foreground", className)}
      role="status"
    >
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </span>
  );
}
