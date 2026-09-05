import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Modal } from "./Modal";

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}

export function ConfirmationModal({
  open,
  onClose,
  icon: Icon = CheckCircle2,
  title,
  description,
  children,
}: ConfirmationModalProps) {
  return (
    <Modal open={open} onClose={onClose} hideClose>
      <div className="flex flex-col items-center px-2 py-4 text-center">
        <div className="animate-scale-in mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-500">
          <Icon className="h-9 w-9" strokeWidth={1.75} />
        </div>
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-500">{description}</p>
        )}
        {children && <div className="mt-5 w-full">{children}</div>}
      </div>
    </Modal>
  );
}
