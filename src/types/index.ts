export type ConsultationType = "audio" | "video";

export interface User {
  fullName: string;
  email: string;
  phone: string;
}

/** The three application roles sharing this one demo project (see routes/guards.tsx). */
export type UserRole = "student" | "doctor" | "hivecare_admin";

/**
 * A practitioner's professional credential level, as entered by HiveCare during
 * onboarding. Kept separate from `specialty`/`clinicianType` (what they treat) —
 * this is what kind of clinician they are.
 */
export type ProfessionalLevel =
  | "General Practitioner"
  | "Specialist"
  | "Nurse Practitioner"
  | "Physician Assistant"
  | "Psychologist"
  | "Dentist";

/** Where a practitioner sits in HiveCare's onboarding lifecycle. */
export type PractitionerStatus = "invitation_sent" | "active" | "inactive";

// Normalized clinician categories the AI intake can route a student to. Kept
// as a closed set (rather than freeform AI text) so routing can be validated
// server-side and matched against the app's real practitioner data — the AI
// picks a category, the app decides who's actually available.
export type ClinicianType =
  | "general_practitioner"
  | "dermatologist"
  | "pediatrician"
  | "gynecologist"
  | "mental_health_professional"
  | "cardiologist"
  | "ent_specialist"
  | "orthopedic_specialist"
  | "dentist"
  | "nutritionist";

export type Urgency = "routine" | "urgent" | "emergency";

/**
 * The structured, machine-checked result of one AI intake turn. This is what
 * the backend actually trusts to drive routing/scheduling — never raw
 * natural-language text. All fields beyond `status`/`urgency` are optional
 * because the AI only reports what it has actually gathered so far; every
 * field is validated server-side before use (see server/services/claude.ts)
 * and again defensively on the client (see src/lib/chatApi.ts).
 */
export interface TriageResult {
  status: "continue" | "complete" | "urgent" | "emergency";
  urgency: Urgency;
  clinicianType?: ClinicianType;
  summary?: string;
  symptoms?: string[];
  duration?: string;
  severity?: number;
  relevantContext?: string[];
}

/**
 * Where a chat conversation currently sits in the AI-intake -> clinician ->
 * scheduling workflow. A conversation created the old way (picking a
 * professional directly) starts and stays at "doctor_consultation".
 */
export type ChatStage =
  | "ai_intake"
  | "triage_complete"
  | "finding_clinician"
  | "clinician_selection"
  | "urgent_advisory"
  | "emergency_advisory"
  | "scheduling"
  | "scheduled"
  | "doctor_consultation";

export type PlanId = "quarterly" | "biannual" | "annual";

export interface PaymentPlan {
  id: PlanId;
  name: string;
  billingFrequency: string;
  price: number;
  priceSuffix: string;
  recommended?: boolean;
  features: string[];
}

export interface Subscription {
  planId: PlanId;
  startedAt: string;
  status: "active";
}

/**
 * A practitioner record. This doubles as both the student-facing "clinician
 * card" shape (name/title/specialty/avatar — unchanged from before the
 * multi-role platform) AND the HiveCare/Doctor-portal administrative record
 * (firstName/lastName/email/phone/address/professionalLevel/status) — kept as
 * one extended type rather than a second parallel `Practitioner` model so
 * students, doctors, and HiveCare all read the exact same data and can never
 * drift apart (see AppContext: `professionals` lives in shared reducer state).
 */
export interface HealthProfessional {
  id: string;
  name: string;
  title: string;
  specialty: string;
  clinicianType: ClinicianType;
  avatar: string;
  online: boolean;
  availabilityNote: string;

  // HiveCare-managed administrative fields (see PART 17/22 of the multi-role spec).
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  professionalLevel: ProfessionalLevel;
  status: PractitionerStatus;
  /** Set when HiveCare onboards the practitioner (invitation generated). */
  invitedAt: string;
  /** Set the first time the practitioner completes doctor-portal login. */
  activatedAt?: string;
}

/**
 * One weekly-recurring block of time a practitioner has marked themselves
 * available. A day with no ranges for a given practitioner is implicitly
 * "Unavailable" that day — there's no separate "unavailable" record to keep
 * in sync. This is the single source of truth student scheduling reads from
 * (see lib/availability.ts) — the AI/app must never invent availability.
 */
export interface AvailabilityRange {
  id: string;
  practitionerId: string;
  /** 0 = Sunday ... 6 = Saturday, matching Date#getDay(). */
  dayOfWeek: number;
  /** e.g. "9:00 AM" — drawn from the same time labels used across scheduling. */
  startTime: string;
  /** Exclusive upper bound, e.g. "12:00 PM". */
  endTime: string;
}

/**
 * A simulated outbound email — the demo's stand-in for a real email provider.
 * Both HiveCare's onboarding invitation and the doctor login's verification
 * code are represented as one of these rather than two hard-coded fake
 * behaviors, so the mechanism (and its dev-only inbox at /dev/emails) is reusable.
 */
export interface DemoEmail {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  type: "onboarding" | "verification";
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: "student" | "professional";
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  // null until a clinician is actually attached to this thread — every
  // conversation starts with the AI health assistant (see ChatStage) unless
  // it was created the old way, by messaging a professional directly.
  professionalId: string | null;
  stage: ChatStage;
  /** Latest known AI triage assessment for this conversation, if any. */
  triage?: TriageResult;
  /** Clinicians the app found matching the AI's routing once triage completed. */
  recommendedProfessionalIds?: string[];
  lastMessage: string;
  lastMessageAt: string;
  /** Unread-by-student count (existing field — unchanged meaning). */
  unreadCount: number;
  /** Unread-by-doctor count, shown in the Doctor Portal's Messages page/badges. */
  unreadByProfessionalCount: number;
}

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

/** A snapshot of the AI's routing decision, carried onto whatever it scheduled. */
export interface AiTriageRecord {
  clinicianType: ClinicianType;
  urgency: Urgency;
  reason: string;
}

export interface Appointment {
  id: string;
  date: string; // yyyy-MM-dd
  time: string; // e.g. "10:00 AM"
  professionalId: string;
  consultationType: ConsultationType;
  status: AppointmentStatus;
  needToKnow?: string;
  note?: string;
  /** Present only when this appointment was booked via the AI intake flow. */
  aiIntakeSummary?: string;
  aiTriage?: AiTriageRecord;
}

export interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Consultation {
  id: string;
  date: string;
  time: string;
  professionalId: string;
  consultationType: ConsultationType;
  // Only meaningful once the visit has actually happened; a consultation
  // scheduled straight out of AI intake has no duration yet.
  durationMinutes?: number;
  // "scheduled" = booked (via AI intake) but the visit hasn't happened yet,
  // so diagnosis/prescriptions/tests are still empty. Existing seeded
  // history is always "completed" and unaffected by this addition.
  status: "completed" | "scheduled";
  summary: string;
  diagnosis: string | null;
  prescriptions: Prescription[];
  tests: string[];
  followUpAppointmentId: string | null;
  /** Links back to the Appointment this consultation originated from, if any. */
  appointmentId?: string;
  /** Present only when this consultation originated from the AI intake flow. */
  aiIntakeSummary?: string;
  aiTriage?: AiTriageRecord;
}

export interface MedicalNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}
