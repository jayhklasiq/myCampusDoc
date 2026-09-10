import { useMemo } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useApp } from "../../context/AppContext";
import { formatDateLong } from "../../lib/format";
import { CalendarClock } from "lucide-react";
import type { PractitionerStatus } from "../../types";

const STATUS_TONE: Record<PractitionerStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  invitation_sent: "warning",
  inactive: "neutral",
};

export function PractitionerDetailPage() {
  const { practitionerId } = useParams<{ practitionerId: string }>();
  const navigate = useNavigate();
  const { professionals, appointments, setPractitionerStatus } = useApp();

  const practitioner = professionals.find((p) => p.id === practitionerId);

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => a.professionalId === practitionerId && a.status === "upcoming")
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [appointments, practitionerId],
  );

  if (!practitioner) return <Navigate to="/hivecare/practitioners" replace />;

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">{practitioner.name}</h1>
          <p className="text-sm text-ink-500">{practitioner.specialty}</p>
        </div>
        <Badge tone={STATUS_TONE[practitioner.status]}>
          {practitioner.status.replace("_", " ")}
        </Badge>
      </div>

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink-800">Contact &amp; Credentials</h2>
        <dl className="grid grid-cols-2 gap-y-2.5 text-sm">
          <dt className="text-ink-500">Email</dt>
          <dd className="text-right font-medium text-ink-800">{practitioner.email}</dd>
          <dt className="text-ink-500">Phone</dt>
          <dd className="text-right font-medium text-ink-800">{practitioner.phone}</dd>
          <dt className="text-ink-500">Address</dt>
          <dd className="text-right font-medium text-ink-800">{practitioner.address}</dd>
          <dt className="text-ink-500">Professional level</dt>
          <dd className="text-right font-medium text-ink-800">{practitioner.professionalLevel}</dd>
          <dt className="text-ink-500">Specialty</dt>
          <dd className="text-right font-medium text-ink-800">{practitioner.specialty}</dd>
        </dl>

        <div className="mt-4 border-t border-ink-100 pt-4">
          {practitioner.status !== "invitation_sent" && (
            <Button
              variant={practitioner.status === "active" ? "danger" : "secondary"}
              size="sm"
              onClick={() =>
                setPractitionerStatus(
                  practitioner.id,
                  practitioner.status === "active" ? "inactive" : "active",
                )
              }
            >
              {practitioner.status === "active" ? "Deactivate practitioner" : "Reactivate practitioner"}
            </Button>
          )}
          {practitioner.status === "invitation_sent" && (
            <p className="text-xs text-ink-400 italic">
              Awaiting first Doctor Portal login to activate this account.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
          <CalendarClock className="h-4 w-4 text-brand-500" />
          Upcoming Consultations
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No upcoming consultations" />
        ) : (
          <div className="flex flex-col gap-2">
            {upcoming.map((a) => (
              <div key={a.id} className="rounded-xl bg-ink-50 p-3 text-sm">
                <p className="font-medium text-ink-800">
                  {formatDateLong(a.date)} · {a.time}
                </p>
                <p className="text-xs text-ink-500">
                  {a.consultationType === "video" ? "Video" : "Audio"} consultation
                  {a.aiIntakeSummary ? " · AI intake attached" : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => navigate("/hivecare/practitioners")}
        className="text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        Back to practitioners
      </button>
    </div>
  );
}
