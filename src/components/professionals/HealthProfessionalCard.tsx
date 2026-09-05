import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import type { HealthProfessional } from "../../types";

interface HealthProfessionalCardProps {
  professional: HealthProfessional;
}

export function HealthProfessionalCard({ professional }: HealthProfessionalCardProps) {
  return (
    <div className="border-b border-ink-100 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <Avatar
          initials={professional.avatar}
          seed={professional.id}
          size="md"
          online={professional.online}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">
            {professional.name}, {professional.title}
          </p>
          <p className="truncate text-xs text-ink-500">{professional.specialty}</p>
        </div>
        <Badge tone={professional.online ? "success" : "neutral"}>
          {professional.online ? "Online" : "Offline"}
        </Badge>
      </div>
    </div>
  );
}
