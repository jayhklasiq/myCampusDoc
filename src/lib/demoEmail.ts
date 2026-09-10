import type { DemoEmail, HealthProfessional } from "../types";

/**
 * Builders for the demo's simulated email system (PART 19). Both HiveCare's
 * onboarding invitation and the doctor login's verification code produce the
 * same `DemoEmail` shape rather than two hard-coded fake behaviors — the
 * caller (AppContext) is responsible for generating the id/timestamp and
 * appending it to state; these are pure functions so they're easy to test
 * and easy to later swap for a real email provider.
 */

export function generateVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function buildOnboardingEmailContent(
  practitioner: Pick<HealthProfessional, "firstName" | "lastName" | "email">,
): { subject: string; body: string } {
  return {
    subject: "You've been invited to join HiveCare",
    body: [
      `Hi Dr. ${practitioner.lastName},`,
      "",
      "HiveCare has onboarded you as a practitioner on the MyCampusDoc platform.",
      "",
      `To activate your account, open the Doctor Portal and sign in with this email address (${practitioner.email}). You'll be sent a one-time verification code — no password is needed.`,
      "",
      "Once signed in, you can set your weekly availability and start receiving student consultations.",
      "",
      "— HiveCare",
    ].join("\n"),
  };
}

export function buildVerificationEmailContent(code: string): { subject: string; body: string } {
  return {
    subject: "Your MyCampusDoc Doctor Portal verification code",
    body: [
      "Someone requested a sign-in code for the Doctor Portal.",
      "",
      `Your verification code is: ${code}`,
      "",
      "This code is only valid for this sign-in attempt. If you didn't request this, you can ignore this email.",
    ].join("\n"),
  };
}

export function newDemoEmail(
  recipient: string,
  content: { subject: string; body: string },
  type: DemoEmail["type"],
  id: string,
  createdAt: string,
): DemoEmail {
  return { id, recipient, subject: content.subject, body: content.body, type, createdAt };
}
