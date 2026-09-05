import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  label?: string;
  fullScreen?: boolean;
}

export function LoadingState({ label = "Loading...", fullScreen }: LoadingStateProps) {
  return (
    <div
      className={
        fullScreen
          ? "flex min-h-dvh flex-col items-center justify-center gap-3 bg-white"
          : "flex flex-col items-center justify-center gap-3 py-16"
      }
    >
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      <p className="text-sm font-medium text-ink-500">{label}</p>
    </div>
  );
}
