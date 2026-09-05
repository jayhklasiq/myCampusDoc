import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ProfileSectionProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function ProfileSection({ icon: Icon, title, subtitle, children }: ProfileSectionProps) {
  return (
    <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <Icon className="h-4 w-4 text-brand-500" />
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
