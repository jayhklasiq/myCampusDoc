import { useMemo, useState } from "react";
import { Calendar } from "../../components/schedule/Calendar";
import { useApp } from "../../context/AppContext";
import { getBookableSlotsForDate } from "../../lib/availability";
import { formatDayLabel } from "../../lib/format";
import type { SlotStatus } from "../../lib/availability";

const STATUS_STYLES: Record<SlotStatus, string> = {
  available: "border-success-500/40 bg-success-50 text-success-600",
  booked: "border-accent-500/40 bg-accent-50 text-accent-700",
  unavailable: "border-ink-100 bg-ink-50 text-ink-300",
};

const STATUS_LABEL: Record<SlotStatus, string> = {
  available: "Available",
  booked: "Booked",
  unavailable: "Unavailable",
};

export function DoctorCalendarPage() {
  const { doctorSession, appointments, availabilityRanges } = useApp();
  const practitionerId = doctorSession!.practitionerId;
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const myAppointments = useMemo(
    () => appointments.filter((a) => a.professionalId === practitionerId),
    [appointments, practitionerId],
  );

  const slots = useMemo(
    () => getBookableSlotsForDate(practitionerId, selectedDate, appointments, availabilityRanges),
    [practitionerId, selectedDate, appointments, availabilityRanges],
  );

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Calendar</h1>
        <p className="text-sm text-ink-500">Your consultations and weekly availability, day by day.</p>
      </div>

      <Calendar appointments={myAppointments} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink-800">{formatDayLabel(selectedDate)}</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <div
              key={slot.time}
              className={`rounded-xl border px-2 py-2.5 text-center text-xs font-semibold ${STATUS_STYLES[slot.status]}`}
            >
              <p>{slot.time}</p>
              <p className="mt-0.5 text-[10px] font-medium opacity-80">{STATUS_LABEL[slot.status]}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink-100 pt-3 text-[11px] text-ink-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success-500" /> Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-500" /> Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink-300" /> Unavailable
          </span>
        </div>
      </section>
    </div>
  );
}
