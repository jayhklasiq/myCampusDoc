import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";
import { findNextAvailableSlot } from "../../lib/availability";
import type { HealthProfessional, PractitionerStatus } from "../../types";

const STATUS_TONE: Record<PractitionerStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  invitation_sent: "warning",
  inactive: "neutral",
};

const STATUS_LABEL: Record<PractitionerStatus, string> = {
  active: "Active",
  invitation_sent: "Invitation Sent",
  inactive: "Inactive",
};

export function PractitionersListPage() {
  const navigate = useNavigate();
  const { professionals, appointments, availabilityRanges } = useApp();

  const rows = useMemo(
    () =>
      [...professionals].sort((a, b) => a.name.localeCompare(b.name)),
    [professionals],
  );

  function upcomingCountFor(practitioner: HealthProfessional) {
    return appointments.filter((a) => a.professionalId === practitioner.id && a.status === "upcoming").length;
  }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Practitioners</h1>
          <p className="text-sm text-ink-500">{rows.length} in the network</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/hivecare/onboard")}
          className="rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Onboard Practitioner
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-100 text-xs font-medium tracking-wide text-ink-400 uppercase">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Specialty</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Availability</th>
              <th className="px-4 py-3">Upcoming</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((p) => {
              const nextAvailable = findNextAvailableSlot(p.id, appointments, availabilityRanges);
              return (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/hivecare/practitioners/${p.id}`)}
                  className="cursor-pointer transition-colors hover:bg-ink-50"
                >
                  <td className="px-4 py-3 font-semibold text-ink-900">{p.name}</td>
                  <td className="px-4 py-3 text-ink-600">{p.email}</td>
                  <td className="px-4 py-3 text-ink-600">{p.phone}</td>
                  <td className="px-4 py-3 text-ink-600">{p.specialty}</td>
                  <td className="px-4 py-3 text-ink-600">{p.professionalLevel}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{nextAvailable ? "Available" : "Unavailable"}</td>
                  <td className="px-4 py-3 text-ink-600">{upcomingCountFor(p)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
