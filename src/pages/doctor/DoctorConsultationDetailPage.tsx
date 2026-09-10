import { Bot, Phone, Plus, Trash2, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { findProfessionalById } from "../../data";
import { formatDateLong } from "../../lib/format";
import { CLINICIAN_TYPE_LABELS, URGENCY_LABELS } from "../../lib/triage";
import type { Prescription } from "../../types";

const EMPTY_PRESCRIPTION: Prescription = {
  medication: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

export function DoctorConsultationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { doctorSession, appointments, consultations, professionals, user, completeConsultation } = useApp();
  const practitionerId = doctorSession!.practitionerId;
  const practitioner = findProfessionalById(professionals, practitionerId);

  const consultation = consultations.find((c) => c.id === id && c.professionalId === practitionerId);
  const appointment = !consultation
    ? appointments.find((a) => a.id === id && a.professionalId === practitionerId)
    : appointments.find((a) => a.id === consultation.appointmentId);

  const [summary, setSummary] = useState(consultation?.summary ?? "");
  const [diagnosis, setDiagnosis] = useState(consultation?.diagnosis ?? "");
  const [tests, setTests] = useState(consultation?.tests.join(", ") ?? "");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(consultation?.prescriptions ?? []);
  const [followUpNote, setFollowUpNote] = useState("");
  const [saved, setSaved] = useState(false);

  const aiIntakeSummary = consultation?.aiIntakeSummary ?? appointment?.aiIntakeSummary;
  const aiTriage = consultation?.aiTriage ?? appointment?.aiTriage;

  const isAlreadyCompleted = consultation?.status === "completed";

  const date = consultation?.date ?? appointment?.date;
  const time = consultation?.time ?? appointment?.time;
  const consultationType = consultation?.consultationType ?? appointment?.consultationType;
  const TypeIcon = consultationType === "video" ? Video : Phone;

  const patientName = user?.fullName ?? "Student patient";

  const canSave = useMemo(() => !!date && !!time && !!consultationType, [date, time, consultationType]);

  if (!consultation && !appointment) {
    return <Navigate to="/doctor/consultations" replace />;
  }

  function updatePrescription(index: number, field: keyof Prescription, value: string) {
    setPrescriptions((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function handleSave() {
    const summaryWithFollowUp = followUpNote.trim()
      ? `${summary.trim() || "No consultation summary was recorded."}\n\nFollow-up instructions: ${followUpNote.trim()}`
      : summary.trim() || "No consultation summary was recorded.";
    completeConsultation({
      consultationId: consultation?.id,
      appointment: !consultation ? appointment : undefined,
      summary: summaryWithFollowUp,
      diagnosis: diagnosis.trim() || null,
      prescriptions: prescriptions.filter((p) => p.medication.trim()),
      tests: tests
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      followUpAppointmentId: null,
    });
    setSaved(true);
    window.setTimeout(() => navigate("/doctor/consultations"), 900);
  }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Consultation</h1>
          <p className="text-sm text-ink-500">
            {date && formatDateLong(date)} · {time}
          </p>
        </div>
        <Badge tone={isAlreadyCompleted ? "success" : "accent"}>
          {isAlreadyCompleted ? "Completed" : "Scheduled"}
        </Badge>
      </div>

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-2 text-sm font-semibold text-ink-800">Patient Information</h2>
        <dl className="grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-ink-500">Patient</dt>
          <dd className="text-right font-medium text-ink-800">{patientName}</dd>
          <dt className="text-ink-500">Consultation type</dt>
          <dd className="flex items-center justify-end gap-1.5 text-right font-medium text-ink-800">
            <TypeIcon className="h-3.5 w-3.5 text-accent-500" />
            {consultationType === "video" ? "Video" : "Audio"}
          </dd>
          <dt className="text-ink-500">Clinician</dt>
          <dd className="text-right font-medium text-ink-800">{practitioner?.name}</dd>
        </dl>
      </section>

      {aiIntakeSummary && (
        <section className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 shadow-card">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-800">
            <Bot className="h-4 w-4" />
            AI Intake Summary
            <Badge tone="brand">AI-generated — not a diagnosis</Badge>
          </h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{aiIntakeSummary}</p>
          {aiTriage && (
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 border-t border-brand-200/60 pt-3 text-xs">
              <dt className="text-ink-500">AI-suggested category</dt>
              <dd className="text-right font-medium text-ink-800">
                {CLINICIAN_TYPE_LABELS[aiTriage.clinicianType]}
              </dd>
              <dt className="text-ink-500">Urgency</dt>
              <dd className="text-right font-medium text-ink-800">{URGENCY_LABELS[aiTriage.urgency]}</dd>
            </dl>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-3 text-sm font-semibold text-ink-800">Consultation Notes</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-ink-400 uppercase">
              Notes / Summary
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What was discussed during the consultation..."
              className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-ink-400 uppercase">
              Diagnosis (optional)
            </label>
            <input
              type="text"
              value={diagnosis ?? ""}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Tension-type headache"
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs font-medium tracking-wide text-ink-400 uppercase">
                Prescriptions (optional)
              </label>
              <button
                type="button"
                onClick={() => setPrescriptions((prev) => [...prev, { ...EMPTY_PRESCRIPTION }])}
                className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            {prescriptions.length === 0 ? (
              <p className="text-xs text-ink-400 italic">No prescriptions added</p>
            ) : (
              <div className="flex flex-col gap-2">
                {prescriptions.map((rx, i) => (
                  <div key={i} className="rounded-xl bg-ink-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-600">Prescription {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => setPrescriptions((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-ink-400 hover:text-danger-500"
                        aria-label="Remove prescription"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={rx.medication}
                        onChange={(e) => updatePrescription(i, "medication", e.target.value)}
                        placeholder="Medication"
                        className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={rx.dosage}
                        onChange={(e) => updatePrescription(i, "dosage", e.target.value)}
                        placeholder="Dosage"
                        className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={rx.frequency}
                        onChange={(e) => updatePrescription(i, "frequency", e.target.value)}
                        placeholder="Frequency"
                        className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={rx.duration}
                        onChange={(e) => updatePrescription(i, "duration", e.target.value)}
                        placeholder="Duration"
                        className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                      <input
                        type="text"
                        value={rx.instructions}
                        onChange={(e) => updatePrescription(i, "instructions", e.target.value)}
                        placeholder="Instructions"
                        className="col-span-2 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-ink-400 uppercase">
              Tests / lab work (optional, comma-separated)
            </label>
            <input
              type="text"
              value={tests}
              onChange={(e) => setTests(e.target.value)}
              placeholder="e.g. Rapid Strep Test, Complete Blood Count"
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium tracking-wide text-ink-400 uppercase">
              Follow-up instructions (optional)
            </label>
            <input
              type="text"
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              placeholder="e.g. Book a follow-up in 2 weeks if symptoms persist"
              className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
            />
          </div>

          {saved ? (
            <div className="rounded-xl bg-success-50 px-3.5 py-3 text-center text-sm font-medium text-success-600">
              Consultation saved — it now appears in the student's History.
            </div>
          ) : (
            <Button size="lg" fullWidth disabled={!canSave} onClick={handleSave}>
              {isAlreadyCompleted ? "Save Changes" : "Complete Consultation"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
