export type ConsultationType = "audio" | "video";

export interface User {
  fullName: string;
  email: string;
  phone: string;
}

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
  professionalId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  date: string; // yyyy-MM-dd
  time: string; // e.g. "10:00 AM"
  professionalId: string;
  consultationType: ConsultationType;
  status: AppointmentStatus;
  needToKnow?: string;
  note?: string;
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
  durationMinutes: number;
  status: "completed";
  summary: string;
  diagnosis: string | null;
  prescriptions: Prescription[];
  tests: string[];
  followUpAppointmentId: string | null;
}

export interface MedicalNote {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}
