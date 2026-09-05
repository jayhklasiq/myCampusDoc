export type ConsultationType = "audio" | "video";

export interface User {
  fullName: string;
  email: string;
  phone: string;
}

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

export interface HealthProfessional {
  id: string;
  name: string;
  title: string;
  specialty: string;
  clinicianType: ClinicianType;
  avatar: string;
  online: boolean;
  availabilityNote: string;
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
  unreadCount: number;
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
