import { LogOut, Stethoscope } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { findProfessionalById } from "../../data";

// Deliberately distinct visual language from the student app (dark top bar +
// accent color, horizontal admin-style nav) rather than the student's teal
// bottom nav — so it's immediately obvious which interface you're in
// (PART 6/21), while reusing the same component/Tailwind system underneath.
const DOCTOR_NAV_ITEMS = [
  { to: "/doctor/dashboard", label: "Dashboard" },
  { to: "/doctor/calendar", label: "Calendar" },
  { to: "/doctor/availability", label: "Availability" },
  { to: "/doctor/consultations", label: "Consultations" },
  { to: "/doctor/messages", label: "Messages" },
  { to: "/doctor/profile", label: "Profile" },
];

export function DoctorShell() {
  const navigate = useNavigate();
  const { doctorSession, professionals, conversations, doctorLogOut } = useApp();
  const practitioner = doctorSession
    ? findProfessionalById(professionals, doctorSession.practitionerId)
    : undefined;

  const unreadMessages = conversations
    .filter((c) => c.professionalId === doctorSession?.practitionerId)
    .reduce((sum, c) => sum + c.unreadByProfessionalCount, 0);

  function handleLogOut() {
    doctorLogOut();
    navigate("/doctor/login");
  }

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="bg-ink-900 text-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/20 text-accent-400">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {practitioner ? practitioner.name : "Doctor Portal"}
            </p>
            <p className="truncate text-xs text-ink-300">
              {practitioner ? practitioner.specialty : "MyCampusDoc"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogOut}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Log out of Doctor Portal"
            title="Log out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
        <nav
          className="scrollbar-none mx-auto flex max-w-4xl gap-1 overflow-x-auto px-2 pb-2"
          aria-label="Doctor Portal"
        >
          {DOCTOR_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "relative shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive ? "bg-accent-500 text-white" : "text-ink-300 hover:bg-white/10 hover:text-white",
                )
              }
            >
              {item.label}
              {item.to === "/doctor/messages" && unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-500 px-1 text-[10px] font-semibold text-white">
                  {unreadMessages}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-5">
        <Outlet />
      </div>
    </div>
  );
}
