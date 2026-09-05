import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function AppShell() {
  return (
    <div className="min-h-dvh bg-ink-50">
      <div className="mx-auto min-h-dvh max-w-2xl bg-ink-50 pb-20">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
