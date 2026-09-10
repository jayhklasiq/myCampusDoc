import type { ProfessionalLevel } from "../types";

/** Options HiveCare picks from when onboarding a practitioner (PART 3). */
export const PROFESSIONAL_LEVELS: ProfessionalLevel[] = [
  "General Practitioner",
  "Specialist",
  "Nurse Practitioner",
  "Physician Assistant",
  "Psychologist",
  "Dentist",
];

/** Short credential abbreviation shown next to a practitioner's name in the
 * existing student-facing UI (e.g. "Dr. Sarah Johnson, MD") — derived from the
 * professional level HiveCare selects, so that UI needs no changes. */
export const PROFESSIONAL_LEVEL_TITLE: Record<ProfessionalLevel, string> = {
  "General Practitioner": "MD",
  Specialist: "MD",
  "Nurse Practitioner": "NP",
  "Physician Assistant": "PA",
  Psychologist: "PhD",
  Dentist: "DDS",
};
