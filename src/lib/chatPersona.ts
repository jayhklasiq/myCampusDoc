import { findProfessionalById } from "../data";
import type { Conversation, HealthProfessional } from "../types";

/** Whatever a chat conversation currently presents as — a real clinician, or
 * the AI health assistant before one has been attached (see ChatStage). */
export type ChatPersona = HealthProfessional & { isAI: boolean };

export const AI_ASSISTANT_PERSONA: ChatPersona = {
  id: "ai_health_assistant",
  name: "MyCampusDoc AI",
  title: "Health Assistant",
  specialty: "AI-guided health intake & routing — not a doctor",
  clinicianType: "general_practitioner",
  avatar: "AI",
  online: true,
  availabilityNote: "Always available",
  isAI: true,
  firstName: "MyCampusDoc",
  lastName: "AI",
  email: "",
  phone: "",
  address: "",
  professionalLevel: "General Practitioner",
  status: "active",
  invitedAt: "",
};

/** `professionals` is passed in rather than imported statically because the
 * roster lives in shared AppContext state (see lib/clinicianMatching.ts). */
export function getConversationPersona(
  conversation: Conversation,
  professionals: HealthProfessional[],
): ChatPersona {
  if (conversation.professionalId) {
    const professional = findProfessionalById(professionals, conversation.professionalId);
    if (professional) return { ...professional, isAI: false };
  }
  return AI_ASSISTANT_PERSONA;
}
