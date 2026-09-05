import type { ClinicianType, TriageResult, Urgency } from "../types";

export const CLINICIAN_TYPE_LABELS: Record<ClinicianType, string> = {
  general_practitioner: "General Practitioner",
  dermatologist: "Dermatologist",
  pediatrician: "Pediatrician",
  gynecologist: "Gynecologist",
  mental_health_professional: "Mental Health Professional",
  cardiologist: "Cardiologist",
  ent_specialist: "ENT Specialist",
  orthopedic_specialist: "Orthopedic Specialist",
  dentist: "Dentist",
  nutritionist: "Nutritionist",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  routine: "Routine",
  urgent: "Urgent",
  emergency: "Emergency",
};

/**
 * Builds the human-readable "AI Intake Summary" attached to a scheduled
 * consultation — shown to the student and, in a real deployment, to the
 * clinician joining the thread. Always clearly an intake summary, never
 * phrased as a diagnosis.
 */
export function buildIntakeSummaryText(triage: TriageResult | undefined): string {
  if (!triage) return "No AI intake summary was recorded for this consultation.";

  const lines: string[] = ["AI Intake Summary (not a medical diagnosis)", ""];

  lines.push("Reason for consultation:");
  lines.push(triage.summary?.trim() || "Not specified by the student.");
  lines.push("");

  lines.push("Started:");
  lines.push(triage.duration?.trim() || "Not specified.");
  lines.push("");

  if (typeof triage.severity === "number") {
    lines.push("Severity:");
    lines.push(`${triage.severity}/10 (as reported by the student)`);
    lines.push("");
  }

  lines.push("Associated symptoms:");
  lines.push(triage.symptoms && triage.symptoms.length > 0 ? triage.symptoms.join(", ") : "None reported.");
  lines.push("");

  if (triage.relevantContext && triage.relevantContext.length > 0) {
    lines.push("Patient notes:");
    lines.push(triage.relevantContext.join(" "));
    lines.push("");
  }

  lines.push("AI routing:");
  lines.push(triage.clinicianType ? CLINICIAN_TYPE_LABELS[triage.clinicianType] : "General Practitioner");
  lines.push("");

  lines.push("Urgency:");
  lines.push(URGENCY_LABELS[triage.urgency]);

  return lines.join("\n");
}
