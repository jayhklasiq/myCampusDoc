import type { ClinicianType, HealthProfessional } from "../types";

/**
 * Real clinician matching, kept deliberately separate from the AI: Claude
 * only ever decides *what category* of clinician a student needs (see
 * TriageResult.clinicianType). This function is the application's own logic
 * that looks up who's actually in the (currently mock) practitioner roster —
 * the AI never sees or invents this list.
 *
 * `professionals` is passed in (rather than imported statically) because the
 * roster now lives in shared AppContext state — HiveCare can onboard new
 * practitioners at runtime, and this function must see those immediately.
 * A practitioner HiveCare has deactivated is excluded; one who's been
 * onboarded but hasn't logged in yet is still shown (matching by category)
 * so the student can see them listed as currently unavailable rather than
 * having them silently disappear — real availability is resolved separately
 * (see lib/availability.ts) and rendered per-card.
 */
export function findAvailableClinicians(
  clinicianType: ClinicianType,
  professionals: HealthProfessional[],
): HealthProfessional[] {
  const eligible = professionals.filter((p) => p.status !== "inactive");

  const exactMatches = eligible.filter((p) => p.clinicianType === clinicianType);
  if (exactMatches.length > 0) return exactMatches;

  // Not every category maps to a specialist in a small mock roster (or in
  // real life, every condition to a specialist) — General Practice is the
  // sensible default routing rather than leaving the student with no one.
  const gpFallback = eligible.filter((p) => p.clinicianType === "general_practitioner");
  if (gpFallback.length > 0) return gpFallback;

  return eligible.slice(0, 1);
}
