import type { ClinicianType, TriageResult } from "../types";

/**
 * Client-side wrapper around the app's own `/api/chat` endpoint (see
 * server/routes/chat.ts). This is the only place the frontend talks to the
 * backend for chat — the Anthropic/Rodium API keys and both system prompts
 * never leave the server, and the frontend has no idea which provider
 * actually handled a given request.
 */

export interface ChatApiTurn {
  role: "user" | "assistant";
  content: string;
}

export type ChatMode = "doctor" | "intake";

export interface ChatApiResult {
  reply: string;
  /** Only ever present for mode "intake"; the server already validates this,
   * but it's re-checked here too before the app trusts it for routing. */
  triage: TriageResult | null;
}

export const GENERIC_CHAT_ERROR_MESSAGE =
  "I'm having trouble responding right now. Please try again in a moment.";

export class ChatApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

function readErrorMessage(data: unknown): string | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return undefined;
}

function readReply(data: unknown): string | undefined {
  if (
    typeof data === "object" &&
    data !== null &&
    "reply" in data &&
    typeof (data as { reply: unknown }).reply === "string"
  ) {
    return (data as { reply: string }).reply;
  }
  return undefined;
}

const VALID_STATUSES = new Set(["continue", "complete", "urgent", "emergency"]);
const VALID_URGENCIES = new Set(["routine", "urgent", "emergency"]);
const VALID_CLINICIAN_TYPES = new Set<string>([
  "general_practitioner",
  "dermatologist",
  "pediatrician",
  "gynecologist",
  "mental_health_professional",
  "cardiologist",
  "ent_specialist",
  "orthopedic_specialist",
  "dentist",
  "nutritionist",
]);

/**
 * Defense in depth: the server already validates the triage block before
 * sending it, but the client never blindly trusts arbitrary JSON from the
 * network to drive routing/scheduling either. Anything that doesn't clearly
 * fit is dropped rather than crashing the UI.
 */
function readTriage(data: unknown): TriageResult | null {
  if (typeof data !== "object" || data === null || !("triage" in data)) return null;
  const raw = (data as { triage: unknown }).triage;
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;

  if (typeof obj.status !== "string" || !VALID_STATUSES.has(obj.status)) return null;
  if (typeof obj.urgency !== "string" || !VALID_URGENCIES.has(obj.urgency)) return null;

  const result: TriageResult = {
    status: obj.status as TriageResult["status"],
    urgency: obj.urgency as TriageResult["urgency"],
  };
  if (typeof obj.clinicianType === "string" && VALID_CLINICIAN_TYPES.has(obj.clinicianType)) {
    result.clinicianType = obj.clinicianType as ClinicianType;
  }
  if (typeof obj.summary === "string" && obj.summary.trim()) result.summary = obj.summary.trim();
  if (Array.isArray(obj.symptoms)) {
    const symptoms = obj.symptoms.filter((s): s is string => typeof s === "string");
    if (symptoms.length > 0) result.symptoms = symptoms;
  }
  if (typeof obj.duration === "string" && obj.duration.trim()) result.duration = obj.duration.trim();
  if (typeof obj.severity === "number" && Number.isFinite(obj.severity)) {
    result.severity = Math.min(10, Math.max(1, Math.round(obj.severity)));
  }
  if (Array.isArray(obj.relevantContext)) {
    const context = obj.relevantContext.filter((s): s is string => typeof s === "string");
    if (context.length > 0) result.relevantContext = context;
  }
  return result;
}

export async function requestChatResponse(
  turns: ChatApiTurn[],
  mode: ChatMode = "doctor",
): Promise<ChatApiResult> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: turns, mode }),
    });
  } catch {
    // Network failure — the request never reached the server.
    throw new ChatApiError(GENERIC_CHAT_ERROR_MESSAGE);
  }

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ChatApiError(readErrorMessage(data) ?? GENERIC_CHAT_ERROR_MESSAGE, response.status);
  }

  const reply = readReply(data);
  if (!reply || !reply.trim()) {
    throw new ChatApiError(GENERIC_CHAT_ERROR_MESSAGE, response.status);
  }
  return { reply, triage: mode === "intake" ? readTriage(data) : null };
}
