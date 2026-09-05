import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import type { HealthProfessional } from "../../types";

interface ClinicianRecommendationCardProps {
  professional: HealthProfessional;
  onViewTimes: () => void;
}

export function ClinicianRecommendationCard({
  professional,
  onViewTimes,
}: ClinicianRecommendationCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-card">
      <Avatar
        initials={professional.avatar}
        seed={professional.id}
        size="md"
        online={professional.online}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{professional.name}</p>
        <p className="truncate text-xs text-ink-500">{professional.specialty}</p>
        <Badge tone={professional.online ? "success" : "neutral"} className="mt-1">
          {professional.online ? "Available today" : professional.availabilityNote}
        </Badge>
      </div>
      <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={onViewTimes}>
        View Times
      </Button>
    </div>
  );
}
