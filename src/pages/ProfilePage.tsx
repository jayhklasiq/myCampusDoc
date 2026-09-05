import {
  CalendarClock,
  ClipboardList,
  LogOut,
  MessageCircle,
  Phone,
  ShieldCheck,
  User,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { MedicalNotes } from "../components/profile/MedicalNotes";
import { ProfileSection } from "../components/profile/ProfileSection";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { useApp } from "../context/AppContext";
import { getProfessional, paymentPlans } from "../data";
import { formatDateLong } from "../lib/format";

export function ProfilePage() {
  const { user, subscription, appointments, consultations, logOut } = useApp();
  const navigate = useNavigate();
  const [logOutModalOpen, setLogOutModalOpen] = useState(false);

  function handleLogOut() {
    logOut();
    navigate("/login");
  }

  const plan = paymentPlans.find((p) => p.id === subscription?.planId);

  const nextAppointment = useMemo(
    () =>
      [...appointments]
        .filter((a) => a.status === "upcoming")
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0],
    [appointments],
  );

  const recentConsultation = useMemo(
    () => [...consultations].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[0],
    [consultations],
  );

  if (!user) return null;
  const firstName = user.fullName.split(" ")[0];
  const initials = user.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="animate-fade-in">
      <Header title="Profile" />

      <div className="flex flex-col gap-5 px-4 py-4">
        <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white shadow-card">
          <div className="flex items-center gap-3">
            <Avatar initials={initials} seed={user.email} size="lg" className="ring-2 ring-white/40" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">Welcome, {firstName}</p>
              {plan && (
                <p className="flex items-center gap-1.5 text-sm text-brand-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {plan.name} plan · Active subscription
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => navigate("/chat")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/25"
            >
              <MessageCircle className="h-4 w-4" />
              Start a chat
            </button>
            <button
              type="button"
              onClick={() => navigate("/schedule")}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-white/15 px-3 py-2.5 text-sm font-semibold backdrop-blur transition-colors hover:bg-white/25"
            >
              <CalendarClock className="h-4 w-4" />
              Schedule visit
            </button>
          </div>
        </section>

        <ProfileSection icon={CalendarClock} title="Upcoming Appointment">
          {nextAppointment ? (
            <button
              type="button"
              onClick={() => navigate("/schedule")}
              className="flex w-full items-center gap-3 rounded-xl bg-accent-50/60 p-3 text-left transition-colors hover:bg-accent-50"
            >
              <Avatar
                initials={getProfessional(nextAppointment.professionalId)?.avatar ?? "??"}
                seed={nextAppointment.professionalId}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {getProfessional(nextAppointment.professionalId)?.name}
                </p>
                <p className="text-xs text-ink-500">
                  {formatDateLong(nextAppointment.date)} · {nextAppointment.time}
                </p>
              </div>
              <Badge tone="accent">
                {nextAppointment.consultationType === "video" ? (
                  <Video className="h-3 w-3" />
                ) : (
                  <Phone className="h-3 w-3" />
                )}
              </Badge>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 p-3">
              <p className="text-sm text-ink-500">No upcoming appointment</p>
              <button
                type="button"
                onClick={() => navigate("/schedule")}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Schedule now
              </button>
            </div>
          )}
        </ProfileSection>

        <ProfileSection icon={ClipboardList} title="Recent Consultation">
          {recentConsultation ? (
            <button
              type="button"
              onClick={() => navigate(`/history/${recentConsultation.id}`)}
              className="flex w-full flex-col gap-1 rounded-xl bg-ink-50 p-3 text-left transition-colors hover:bg-ink-100"
            >
              <p className="text-sm font-semibold text-ink-900">
                {getProfessional(recentConsultation.professionalId)?.name}
              </p>
              <p className="text-xs text-ink-500">{formatDateLong(recentConsultation.date)}</p>
              <p className="line-clamp-2 text-xs leading-relaxed text-ink-500">
                {recentConsultation.summary}
              </p>
            </button>
          ) : (
            <p className="rounded-xl bg-ink-50 p-3 text-sm text-ink-500">
              No consultation history yet
            </p>
          )}
        </ProfileSection>

        <ProfileSection icon={User} title="Personal Information">
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Full name</dt>
              <dd className="font-medium text-ink-800">{user.fullName}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-500">Phone number</dt>
              <dd className="font-medium text-ink-800">{user.phone}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="shrink-0 text-ink-500">Email address</dt>
              <dd className="truncate font-medium text-ink-800">{user.email}</dd>
            </div>
          </dl>
        </ProfileSection>

        <MedicalNotes />

        <button
          type="button"
          onClick={() => setLogOutModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white py-3 text-sm font-semibold text-ink-600 transition-colors hover:bg-ink-50"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>

      <Modal open={logOutModalOpen} onClose={() => setLogOutModalOpen(false)} title="Log out?">
        <p className="text-sm text-ink-600">
          You can log back in anytime with your email and password. Your data stays saved on
          this device.
        </p>
        <div className="mt-5 flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setLogOutModalOpen(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" fullWidth onClick={handleLogOut}>
            Log out
          </Button>
        </div>
      </Modal>
    </div>
  );
}
