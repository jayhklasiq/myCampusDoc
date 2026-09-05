import { MessageCircle, CalendarDays, ClipboardList, UserRound } from "lucide-react";
import clsx from "clsx";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/history", label: "History", icon: ClipboardList },
  { to: "/schedule", label: "Schedule", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: UserRound },
];

export function BottomNav() {
  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-white/95 backdrop-blur"
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                isActive ? "text-brand-600" : "text-ink-400 hover:text-ink-600",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={clsx("h-6 w-6 transition-transform", isActive && "scale-105")}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
