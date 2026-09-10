import { ClipboardList, Phone, Video } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { useApp } from "../../context/AppContext";
import { formatDateLong } from "../../lib/format";
import type { Appointment, Consultation } from "../../types";

type ListItem =
  | { kind: "consultation"; id: string; date: string; time: string; consultation: Consultation }
  | { kind: "appointment"; id: string; date: string; time: string; appointment: Appointment };

export function DoctorConsultationsPage() {
  const navigate = useNavigate();
  const { doctorSession, appointments, consultations } = useApp();
  const practitionerId = doctorSession!.practitionerId;

  const items = useMemo<ListItem[]>(() => {
    const myConsultations = consultations.filter((c) => c.professionalId === practitionerId);
    const consultedAppointmentIds = new Set(
      myConsultations.map((c) => c.appointmentId).filter((id): id is string => !!id),
    );
    const unlinkedUpcoming = appointments.filter(
      (a) =>
        a.professionalId === practitionerId &&
        a.status === "upcoming" &&
        !consultedAppointmentIds.has(a.id),
    );

    const consultationItems: ListItem[] = myConsultations.map((c) => ({
      kind: "consultation",
      id: c.id,
      date: c.date,
      time: c.time,
      consultation: c,
    }));
    const appointmentItems: ListItem[] = unlinkedUpcoming.map((a) => ({
      kind: "appointment",
      id: a.id,
      date: a.date,
      time: a.time,
      appointment: a,
    }));

    return [...consultationItems, ...appointmentItems].sort((a, b) =>
      (b.date + b.time).localeCompare(a.date + a.time),
    );
  }, [appointments, consultations, practitionerId]);

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Consultations</h1>
        <p className="text-sm text-ink-500">Upcoming and completed visits, including AI-triaged bookings.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No consultations yet" />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const type = item.kind === "consultation" ? item.consultation.consultationType : item.appointment.consultationType;
            const TypeIcon = type === "video" ? Video : Phone;
            const aiIntakeSummary =
              item.kind === "consultation" ? item.consultation.aiIntakeSummary : item.appointment.aiIntakeSummary;
            const aiTriage = item.kind === "consultation" ? item.consultation.aiTriage : item.appointment.aiTriage;
            const status =
              item.kind === "consultation" ? item.consultation.status : "needs consultation record";

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/doctor/consultations/${item.id}`)}
                className="animate-slide-up w-full rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card transition-transform hover:-translate-y-0.5 hover:shadow-float"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{formatDateLong(item.date)}</p>
                    <p className="text-sm text-ink-600">{item.time}</p>
                  </div>
                  <Badge tone={status === "completed" ? "success" : status === "scheduled" ? "accent" : "neutral"}>
                    {status === "needs consultation record" ? "Not started" : status === "scheduled" ? "Scheduled" : "Completed"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium text-accent-700">
                  <TypeIcon className="h-3.5 w-3.5" />
                  {type === "video" ? "Video Consultation" : "Audio Consultation"}
                  {aiIntakeSummary && <Badge tone="brand">AI Intake</Badge>}
                </div>
                {aiTriage && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-500">
                    Reason: {aiTriage.reason}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
