import { professionals } from "../data";
import type { ClinicianType, HealthProfessional } from "../types";

/**
 * Real clinician matching, kept deliberately separate from the AI: Claude
 * only ever decides *what category* of clinician a student needs (see
 * TriageResult.clinicianType). This function is the application's own logic
 * that looks up who's actually in the (currently mock) practitioner roster —
 * the AI never sees or invents this list.
 *
 * Today this reads the frontend's static mock dataset directly, since that's
 * where the practitioner data already lives in this demo (there is no
 * practitioner database yet). The signature is intentionally a pure
 * function of (clinicianType) so it can move behind a real
 * `GET /api/clinicians?type=...` endpoint later without changing any caller.
 */
export function findAvailableClinicians(clinicianType: ClinicianType): HealthProfessional[] {
  const exactMatches = professionals.filter((p) => p.clinicianType === clinicianType);
  if (exactMatches.length > 0) return exactMatches;

  // Not every category maps to a specialist in a small mock roster (or in
  // real life, every condition to a specialist) — General Practice is the
  // sensible default routing rather than leaving the student with no one.
  const gpFallback = professionals.filter((p) => p.clinicianType === "general_practitioner");
  if (gpFallback.length > 0) return gpFallback;

  return professionals.slice(0, 1);
}
