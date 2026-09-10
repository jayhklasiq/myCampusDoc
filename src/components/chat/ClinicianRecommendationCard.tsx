import { format, parseISO } from "date-fns";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import type { HealthProfessional } from "../../types";

interface ClinicianRecommendationCardProps {
  professional: HealthProfessional;
  /** Soonest real open slot for this clinician, or null if they have none in
   * the lookahead window (e.g. never logged in to set hours yet) — computed
   * by the app from actual AvailabilityRange + Appointment data, never
   * invented (see lib/availability.ts). */
  nextAvailable: { date: string; time: string } | null;
  onViewTimes: () => void;
}

export function ClinicianRecommendationCard({
  professional,
  nextAvailable,
  onViewTimes,
}: ClinicianRecommendationCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-card">
      <Avatar initials={professional.avatar} seed={professional.id} size="md" online={!!nextAvailable} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{professional.name}</p>
        <p className="truncate text-xs text-ink-500">{professional.specialty}</p>
        <Badge tone={nextAvailable ? "success" : "neutral"} className="mt-1">
          {nextAvailable
            ? `Next available ${format(parseISO(nextAvailable.date), "EEE, MMM d")} · ${nextAvailable.time}`
            : "Unavailable"}
        </Badge>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="shrink-0"
        disabled={!nextAvailable}
        onClick={onViewTimes}
      >
        View Times
      </Button>
    </div>
  );
}
