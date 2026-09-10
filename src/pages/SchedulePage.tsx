import { CalendarDays, Phone, Video, X } from "lucide-react";
import { useMemo, useState } from "react";
import { AppointmentCard } from "../components/schedule/AppointmentCard";
import { Calendar } from "../components/schedule/Calendar";
import { ScheduleModal } from "../components/schedule/ScheduleModal";
import { Header } from "../components/layout/Header";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../context/AppContext";

export function SchedulePage() {
  const {
    appointments,
    professionals,
    availabilityRanges,
    createAppointment,
    pendingConsultationType,
    pendingConsultationSourceLabel,
    pendingProfessionalId,
    setPendingConsultation,
  } = useApp();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.status === "upcoming")
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [appointments],
  );
  const past = useMemo(
    () =>
      appointments
        .filter((a) => a.status !== "upcoming")
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [appointments],
  );

  const appointmentsForSelectedDate = useMemo(
    () => appointments.filter((a) => a.date === selectedDate),
    [appointments, selectedDate],
  );

  const PendingIcon = pendingConsultationType === "video" ? Video : Phone;
  // The AI intake flow can hand off a specific clinician without having
  // pre-chosen audio/video (that's still picked in the modal below), so the
  // banner needs to show for that case too, not just the audio/video-button path.
  const hasPendingScheduling = !!pendingConsultationType || !!pendingProfessionalId;

  return (
    <div className="animate-fade-in">
      <Header title="Schedule" subtitle="Book and manage your consultations" />

      <div className="flex flex-col gap-5 px-4 py-4">
        {hasPendingScheduling && (
          <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <PendingIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-800">
                {pendingConsultationSourceLabel ?? "Schedule Consultation"}
              </p>
              <p className="text-xs text-brand-600">Select a date below to continue.</p>
            </div>
            <button
              type="button"
              onClick={() => setPendingConsultation(null)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-500 hover:bg-brand-100"
              aria-label="Cancel scheduling from chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <Calendar
          appointments={appointments}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setModalOpen(true);
          }}
        />

        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-ink-800">Upcoming Appointments</h2>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming appointments"
              description="Select a date on the calendar to book your next consultation."
            />
          ) : (
            <div className="flex flex-col gap-2.5">
              {upcoming.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  professionals={professionals}
                  showDate
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-2.5 text-sm font-semibold text-ink-800">Past Appointments</h2>
          {past.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No past appointments yet" />
          ) : (
            <div className="flex flex-col gap-2.5">
              {past.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  professionals={professionals}
                  showDate
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ScheduleModal
        open={modalOpen}
        date={selectedDate}
        existingAppointments={appointmentsForSelectedDate}
        allAppointments={appointments}
        availabilityRanges={availabilityRanges}
        professionals={professionals}
        initialConsultationType={pendingConsultationType}
        initialProfessionalId={pendingProfessionalId}
        sourceLabel={pendingConsultationSourceLabel}
        onClose={() => setModalOpen(false)}
        onConfirm={(input) =>
          createAppointment({
            date: selectedDate ?? todayStr,
            time: input.time,
            professionalId: input.professionalId,
            consultationType: input.consultationType,
            needToKnow: input.needToKnow,
          })
        }
      />
    </div>
  );
}
