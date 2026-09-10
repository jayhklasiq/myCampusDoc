import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";

function StatCard({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
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

export function HivecareDashboardPage() {
  const navigate = useNavigate();
  const { professionals, appointments } = useApp();

  const counts = useMemo(() => {
    const active = professionals.filter((p) => p.status === "active").length;
    const pending = professionals.filter((p) => p.status === "invitation_sent").length;
    const inactive = professionals.filter((p) => p.status === "inactive").length;
    const upcoming = appointments.filter((a) => a.status === "upcoming").length;
    return { total: professionals.length, active, pending, inactive, upcoming };
  }, [professionals, appointments]);

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500">Practitioner network overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total practitioners" value={counts.total} onClick={() => navigate("/hivecare/practitioners")} />
        <StatCard label="Active" value={counts.active} onClick={() => navigate("/hivecare/practitioners")} />
        <StatCard label="Invitation pending" value={counts.pending} onClick={() => navigate("/hivecare/practitioners")} />
        <StatCard
          label="Upcoming consultations"
          value={counts.upcoming}
          onClick={() => navigate("/hivecare/consultations")}
        />
      </div>

      <button
        type="button"
        onClick={() => navigate("/hivecare/onboard")}
        className="flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        Onboard a new practitioner
      </button>
    </div>
  );
}
