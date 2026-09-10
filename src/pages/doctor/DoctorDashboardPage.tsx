import { CalendarClock, MessageCircle, Phone, Video } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { findProfessionalById } from "../../data";
import { formatDateLong } from "../../lib/format";

function StatCard({
  label,
  value,
  onClick,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-start gap-1 rounded-2xl border border-ink-100 bg-white p-4 text-left shadow-card transition-transform enabled:hover:-translate-y-0.5 enabled:hover:shadow-float disabled:cursor-default"
    >
      <p className="text-2xl font-bold text-ink-900">{value}</p>
      <p className="text-xs font-medium text-ink-500">{label}</p>
    </button>
  );
}

export function DoctorDashboardPage() {
  const navigate = useNavigate();
  const { doctorSession, professionals, appointments, conversations } = useApp();
  const practitionerId = doctorSession!.practitionerId;
  const practitioner = findProfessionalById(professionals, practitionerId);
  const todayStr = new Date().toISOString().slice(0, 10);

  const myAppointments = useMemo(
    () => appointments.filter((a) => a.professionalId === practitionerId && a.status === "upcoming"),
    [appointments, practitionerId],
  );
  const todayCount = myAppointments.filter((a) => a.date === todayStr).length;
  const upcomingCount = myAppointments.length;
  const unreadMessages = conversations
    .filter((c) => c.professionalId === practitionerId)
    .reduce((sum, c) => sum + c.unreadByProfessionalCount, 0);

  const nextAppointment = useMemo(
    () => [...myAppointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0],
    [myAppointments],
  );

  const firstName = practitioner?.firstName ?? "Doctor";

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Good day, Dr. {firstName}</h1>
        <p className="text-sm text-ink-500">Here's what's happening with your consultations today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Today's consultations" value={todayCount} onClick={() => navigate("/doctor/calendar")} />
        <StatCard label="Upcoming" value={upcomingCount} onClick={() => navigate("/doctor/consultations")} />
        <StatCard label="Unread messages" value={unreadMessages} onClick={() => navigate("/doctor/messages")} />
        <StatCard
          label="Availability status"
          value={practitioner?.status === "active" ? "Active" : "Pending"}
          onClick={() => navigate("/doctor/availability")}
        />
      </div>

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
          <CalendarClock className="h-4 w-4 text-accent-500" />
          Next consultation
        </h2>
        {nextAppointment ? (
          <button
            type="button"
            onClick={() => navigate("/doctor/consultations")}
            className="flex w-full items-center gap-3 rounded-xl bg-accent-50/60 p-3 text-left transition-colors hover:bg-accent-50"
          >
            {nextAppointment.consultationType === "video" ? (
              <Video className="h-5 w-5 shrink-0 text-accent-600" />
            ) : (
              <Phone className="h-5 w-5 shrink-0 text-accent-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">
                {formatDateLong(nextAppointment.date)} · {nextAppointment.time}
              </p>
              <p className="text-xs text-ink-500">
                {nextAppointment.consultationType === "video" ? "Video consultation" : "Audio consultation"}
                {nextAppointment.aiIntakeSummary ? " · AI intake attached" : ""}
              </p>
            </div>
          </button>
        ) : (
          <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-500">No upcoming consultations.</p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => navigate("/doctor/availability")}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-ink-900 px-3 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-800"
        >
          <CalendarClock className="h-4 w-4" />
          Set availability
        </button>
        <button
          type="button"
          onClick={() => navigate("/doctor/messages")}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-3 py-3 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
        >
          <MessageCircle className="h-4 w-4" />
          Messages
        </button>
      </div>
    </div>
  );
}
