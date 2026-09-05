import clsx from "clsx";

const PALETTE = [
  "bg-brand-100 text-brand-700",
  "bg-accent-100 text-accent-700",
  "bg-ink-200 text-ink-700",
  "bg-success-50 text-success-600",
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

interface AvatarProps {
  initials: string;
  seed?: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const DOT_SIZE_MAP: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-4 w-4",
};

export function Avatar({ initials, seed, size = "md", online, className }: AvatarProps) {
  const colorClasses = paletteFor(seed ?? initials);
  return (
    <span className={clsx("relative inline-flex shrink-0", className)}>
      <span
        className={clsx(
          "flex items-center justify-center rounded-full font-semibold select-none",
          SIZE_MAP[size],
          colorClasses,
        )}
      >
        {initials}
      </span>
      {online !== undefined && (
        <span
          className={clsx(
            "absolute right-0 bottom-0 rounded-full ring-2 ring-white",
            DOT_SIZE_MAP[size],
            online ? "bg-success-500" : "bg-ink-300",
          )}
          aria-label={online ? "Online" : "Offline"}
        />
      )}
    </span>
  );
}
