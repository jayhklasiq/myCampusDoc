import { Building2, LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";

// A third distinct visual language again (PART 6/21): light header with
// underlined tabs and a "HiveCare" wordmark, rather than the student's teal
// bottom nav or the doctor's dark top bar with pill nav.
const HIVECARE_NAV_ITEMS = [
  { to: "/hivecare/dashboard", label: "Dashboard" },
  { to: "/hivecare/practitioners", label: "Practitioners" },
  { to: "/hivecare/onboard", label: "Onboard Practitioner" },
  { to: "/hivecare/consultations", label: "Consultations" },
];

export function HivecareShell() {
  const navigate = useNavigate();
  const { hivecareSession, hivecareLogOut } = useApp();

  function handleLogOut() {
    hivecareLogOut();
    navigate("/hivecare/login");
  }

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink-900">HiveCare</p>
            <p className="truncate text-xs text-ink-500">{hivecareSession?.adminName}</p>
          </div>
          <button
            type="button"
            onClick={handleLogOut}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            aria-label="Log out of HiveCare Admin"
            title="Log out"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
        <nav
          className="scrollbar-none mx-auto flex max-w-5xl gap-5 overflow-x-auto px-4"
          aria-label="HiveCare Admin"
        >
          {HIVECARE_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "shrink-0 border-b-2 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-ink-500 hover:text-ink-800",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </div>
    </div>
  );
}
