import { CalendarClock, Phone, Video } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";
import { findProfessionalById } from "../../data";
import { formatDateLong } from "../../lib/format";

export function HivecareConsultationsPage() {
  const { appointments, professionals } = useApp();

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "upcoming")
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [appointments],
  );

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Consultations</h1>
        <p className="text-sm text-ink-500">Upcoming consultations across the whole practitioner network.</p>
      </div>

      {upcoming.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No upcoming consultations" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {upcoming.map((appt) => {
            const practitioner = findProfessionalById(professionals, appt.professionalId);
            const TypeIcon = appt.consultationType === "video" ? Video : Phone;
            return (
              <div key={appt.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{formatDateLong(appt.date)}</p>
                    <p className="text-sm text-ink-600">{appt.time}</p>
                  </div>
                  <Badge tone="accent">{practitioner?.name ?? "Unknown practitioner"}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-600">
                  <TypeIcon className="h-3.5 w-3.5" />
                  {appt.consultationType === "video" ? "Video Consultation" : "Audio Consultation"}
                  {appt.aiIntakeSummary && (
                    <Badge tone="brand" className="ml-1">
                      AI Intake
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
