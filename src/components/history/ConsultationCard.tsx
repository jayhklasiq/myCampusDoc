import { Phone, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { findProfessionalById } from "../../data";
import { formatDateLong } from "../../lib/format";
import type { Consultation, HealthProfessional } from "../../types";

interface ConsultationCardProps {
  consultation: Consultation;
  professionals: HealthProfessional[];
}

export function ConsultationCard({ consultation, professionals }: ConsultationCardProps) {
  const navigate = useNavigate();
  const professional = findProfessionalById(professionals, consultation.professionalId);
  if (!professional) return null;
  const TypeIcon = consultation.consultationType === "video" ? Video : Phone;

  const isScheduled = consultation.status === "scheduled";

  return (
    <button
      type="button"
      onClick={() => navigate(`/history/${consultation.id}`)}
      className="animate-slide-up w-full rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar initials={professional.avatar} seed={professional.id} size="md" />
          <div>
            <p className="text-sm font-semibold text-ink-900">{formatDateLong(consultation.date)}</p>
            <p className="text-sm text-ink-600">{professional.name}</p>
          </div>
        </div>
        <Badge tone={isScheduled ? "accent" : "success"}>
          {isScheduled ? "Scheduled" : "Completed"}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-600">
        <TypeIcon className="h-3.5 w-3.5" />
        {consultation.consultationType === "video" ? "Video Consultation" : "Audio Consultation"}
        {consultation.aiIntakeSummary && (
          <Badge tone="brand" className="ml-1">
            AI Intake
          </Badge>
        )}
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
        {consultation.summary}
      </p>
    </button>
  );
}
