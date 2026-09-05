import { Phone, Video } from "lucide-react";
import clsx from "clsx";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { getProfessional } from "../../data";
import { formatDateShort } from "../../lib/format";
import type { Appointment } from "../../types";

interface AppointmentCardProps {
  appointment: Appointment;
  showDate?: boolean;
}

export function AppointmentCard({ appointment, showDate }: AppointmentCardProps) {
  const professional = getProfessional(appointment.professionalId);
  if (!professional) return null;
  const TypeIcon = appointment.consultationType === "video" ? Video : Phone;
  const isUpcoming = appointment.status === "upcoming";

  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-2xl border p-3.5",
        isUpcoming ? "border-accent-200 bg-accent-50/40" : "border-ink-100 bg-white",
      )}
    >
      <Avatar initials={professional.avatar} seed={professional.id} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink-900">{professional.name}</p>
            <p className="text-xs text-ink-500">
              {showDate ? `${formatDateShort(appointment.date)} · ` : ""}
              {appointment.time}
            </p>
          </div>
          <Badge tone={isUpcoming ? "accent" : "neutral"}>
            {isUpcoming ? "Upcoming" : "Completed"}
          </Badge>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-brand-600">
          <TypeIcon className="h-3.5 w-3.5" />
          {appointment.consultationType === "video" ? "Video Consultation" : "Audio Consultation"}
        </div>
        {appointment.note && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
            {appointment.note}
          </p>
        )}
      </div>
    </div>
  );
}
