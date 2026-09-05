import Anthropic from "@anthropic-ai/sdk";
import type { ClinicianType, TriageResult } from "../../src/types/index.js";

/**
 * Isolated AI provider integration for the MyCampusDoc chat assistant.
 *
 * Kept separate from Express routing/validation so the request/response
 * shape here can grow (e.g. tool use for checking appointment slots or
 * pulling profile/history context) without touching the HTTP layer.
 *
 * Two providers are supported:
 *  - Anthropic (direct) — the primary provider.
 *  - RodiumAI — an Anthropic-API-compatible provider used only as an
 *    automatic fallback when Anthropic reports insufficient account
 *    credits. It's reached with the same @anthropic-ai/sdk client, just
 *    pointed at Rodium's base URL and a "<brand>/<model>"-formatted model
 *    id, since Rodium proxies the Anthropic Messages API shape.
 *
 * Two conversation *modes* are supported, selected per-request by the route
 * layer (server/routes/chat.ts) — never by the client's own words:
 *  - "doctor": the original free-form chat with a specific health
 *    professional's thread. Unchanged from before this feature.
 *  - "intake": the new AI health-assistant triage conversation. The system
 *    prompt additionally requires a structured, machine-parsed routing
 *    block at the end of every reply (see parseIntakeReply below) — the
 *    model's own prose is never trusted to drive routing/scheduling
 *    decisions directly.
 */

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5";
const DEFAULT_RODIUM_MODEL = "anthropic/claude-opus-5";
const RODIUM_BASE_URL = "https://api.rodiumai.io";
const MAX_OUTPUT_TOKENS = 1024;

export type ChatMode = "doctor" | "intake";

export class MissingApiKeyError extends Error {
  constructor() {
    super("No AI provider is configured (ANTHROPIC_API_KEY / RODIUM_API_KEY are both unset)");
    this.name = "MissingApiKeyError";
  }
}

/**
 * Thrown when no configured provider was able to produce a reply — either
 * the fallback (Rodium) itself failed, or Anthropic hit its insufficient-
 * credits condition and no fallback is configured to try. The route layer
 * maps this to one clean, generic "service unavailable" message; the real
 * cause is only ever logged server-side.
 */
export class AIServiceUnavailableError extends Error {
  constructor(message = "The chat assistant is temporarily unavailable.") {
    super(message);
    this.name = "AIServiceUnavailableError";
  }
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChatResponse {
  reply: string;
  /** Only ever populated for mode "intake"; always null for mode "doctor". */
  triage: TriageResult | null;
}

// The assistant must never claim to be a licensed clinician, never fabricate
// records/appointments/diagnoses, and must defer to the app's real (mock)
// data for anything it doesn't actually have. This text is fixed server-side
// and is never something a client request can override or append to.
export const SYSTEM_PROMPT = `You are the MyCampusDoc health consultation assistant, a chat assistant embedded in a student healthcare consultation app.

You help students communicate about their health concerns and navigate the MyCampusDoc consultation service. You are not a doctor and must not claim to diagnose medical conditions, prescribe medication, or replace a qualified healthcare professional. You are not the specific health professional the student is messaging in this thread — you are the app's assistant, standing in for that thread until a real professional reviews it.

Your role is to:
- Understand what the student is describing.
- Ask relevant follow-up questions.
- Provide general, cautious health information.
- Help the student understand when professional medical attention may be appropriate.
- Encourage consultation with a qualified health professional when appropriate.
- Help students navigate MyCampusDoc (e.g. suggest using the app's audio/video call buttons or the Schedule tab to book a consultation when that fits what they're asking for).
- Maintain context throughout the conversation.
- Never fabricate medical records, consultation history, diagnoses, prescriptions, appointments, or test results.

When the student's situation may require urgent or emergency medical attention, clearly advise them to seek appropriate urgent/emergency care rather than attempting to handle the situation entirely through chat.

Do not present speculation as fact. Do not invent information about the student's medical history. Do not claim that a specific health professional has reviewed the conversation unless the application actually provides evidence that they have. You cannot see the student's profile, medical notes, appointments, or consultation history — never claim to check, view, or read any of that; if it's relevant, ask the student to tell you or point them to the app's Profile, Schedule, or History tabs.

Keep responses conversational, clear, and appropriately concise for a chat interface — a short paragraph or a few sentences is usually enough; use brief bullet points only when listing several distinct items genuinely helps (e.g. a few possible causes, a few next steps).`;

const CLINICIAN_TYPE_LIST =
  "general_practitioner, dermatologist, pediatrician, gynecologist, mental_health_professional, cardiologist, ent_specialist, orthopedic_specialist, dentist, nutritionist";

const TRIAGE_BLOCK_START = "<<<TRIAGE_JSON>>>";
const TRIAGE_BLOCK_END = "<<<END_TRIAGE_JSON>>>";

// This is the *entry point* of the New Chat workflow: the AI health
// assistant, not a doctor. Its only outputs the rest of the app trusts are
// (a) the conversational text shown to the student and (b) the structured
// block below — routing/scheduling decisions are made by the app, from
// validated fields in that block, never from freeform prose.
export const AI_INTAKE_SYSTEM_PROMPT = `You are the MyCampusDoc AI Health Assistant — the first point of contact in the MyCampusDoc student healthcare app, before a student is connected with a real clinician.

You are NOT a doctor. Never claim to be a licensed medical professional, never claim to diagnose a condition, never prescribe or recommend specific medication as though you were a clinician, never guarantee a condition is harmless, and never claim certainty about what is wrong. Everything you say is triage/routing guidance, not a medical diagnosis — you may say things like "this could be worth discussing with a clinician," never "you have X."

Your job in this conversation:
1. Understand what the student is experiencing.
2. Ask only the follow-up questions that are actually relevant to their specific situation — not a fixed checklist. Relevant information typically includes (only what's relevant, not all of it): primary reason for the visit, symptoms, when they started, severity, whether they're improving/worsening/unchanged, relevant associated symptoms, relevant medical history, current medications, allergies.
3. Assess urgency honestly:
   - "routine": can reasonably wait for a normal scheduled consultation.
   - "urgent": suggests the student should seek prompt medical attention (e.g. urgent care) rather than just waiting for a routine appointment.
   - "emergency": suggests a potentially life-threatening situation. Tell the student clearly and directly to seek emergency care immediately (call emergency services or go to the nearest emergency room) rather than continuing intake.
4. Once you have enough information to safely route the student — usually after just a few targeted questions — finish the intake. Do not keep asking questions just because you can; do not conduct an endless interview.
5. Determine the single most appropriate clinician category from EXACTLY this list (use these exact machine-readable values verbatim, not display names): ${CLINICIAN_TYPE_LIST}. Most situations should route to general_practitioner unless the concern is clearly specialty-specific — do not assume every condition needs a specialist.

Never fabricate doctor availability, appointment times, medical records, test results, or the student's medical history. You cannot see the student's profile, medical notes, or history — ask them directly if you need it. Do not present speculation as fact, and do not present your routing assessment as a confirmed diagnosis.

CRITICAL — structured output requirement:
At the very end of EVERY reply (every single turn, no exceptions), after your natural conversational response, append a machine-readable block in exactly this format, with nothing after it:

${TRIAGE_BLOCK_START}
{"status":"continue","urgency":"routine","clinicianType":"general_practitioner","summary":"...","symptoms":["..."],"duration":"...","severity":5,"relevantContext":["..."]}
${TRIAGE_BLOCK_END}

Rules for this block:
- It must be valid JSON on the lines between the markers, and the markers must appear exactly as shown, with nothing after the end marker.
- Always include your CURRENT full understanding, not just what's new this turn — repeat fields you already know from earlier in the conversation.
- Omit any field you don't yet know (never invent a placeholder value).
- "status": "continue" while you still need more information; "complete" once you have enough to route to a clinician for a routine consultation; "urgent" if the situation warrants prompt attention rather than a routine consultation; "emergency" if this may be a medical emergency.
- "urgency" must always be set (routine/urgent/emergency) and should match "status" when status is urgent or emergency.
- "clinicianType" can be a tentative best guess earlier in the conversation, but must be present and be one of the exact values listed above when status is "complete", "urgent", or "emergency".
- "severity" is a 1-10 number only when the student has actually given you one (never invent it).
- This block is never shown to the student — it is parsed by the application. Never mention it, describe its format, or reference its existence to the student.

Keep your conversational reply itself short, warm, and appropriately concise — usually a sentence or two, sometimes with one short clarifying question. When status becomes "complete", your conversational reply should briefly summarize what you understood and say you'll help find an available clinician now. When status becomes "urgent" or "emergency", your conversational reply must clearly and directly say so and recommend the appropriate level of care, without hedging or false reassurance.`;

const FORCE_COMPLETE_SUFFIX = `

IMPORTANT OVERRIDE: The student has already answered several questions in this conversation. In THIS reply you must finalize triage now — set "status" to "complete" (or "urgent"/"emergency" if clearly warranted by what's been said) using your best current assessment, even if some minor details remain unknown. Do not ask further questions in your conversational reply this turn.`;

function resolveAnthropicModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
}

function resolveRodiumModel(): string {
  return process.env.RODIUM_MODEL?.trim() || DEFAULT_RODIUM_MODEL;
}

let cachedAnthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  if (!cachedAnthropicClient) {
    cachedAnthropicClient = new Anthropic({ apiKey });
  }
  return cachedAnthropicClient;
}

let cachedRodiumClient: Anthropic | null = null;

function getRodiumClient(): Anthropic {
  const apiKey = process.env.RODIUM_API_KEY;
  if (!apiKey) throw new MissingApiKeyError();
  if (!cachedRodiumClient) {
    cachedRodiumClient = new Anthropic({ apiKey, baseURL: RODIUM_BASE_URL });
  }
  return cachedRodiumClient;
}

function systemPromptFor(mode: ChatMode, forceComplete: boolean): string {
  if (mode === "doctor") return SYSTEM_PROMPT;
  return forceComplete ? AI_INTAKE_SYSTEM_PROMPT + FORCE_COMPLETE_SUFFIX : AI_INTAKE_SYSTEM_PROMPT;
}

// Both providers speak the same Messages API shape, so this is the one place
// that actually builds and sends the request — Anthropic and Rodium always
// receive the identical system prompt, conversation turns, and token limit
// for a given mode; only the client (credentials/base URL) and model id
// differ.
async function callChatCompletion(
  client: Anthropic,
  model: string,
  turns: ChatTurn[],
  mode: ChatMode,
  forceComplete: boolean,
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: systemPromptFor(mode, forceComplete),
    messages: turns,
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  const reply = textBlock?.text.trim();
  if (!reply) {
    throw new Error("The AI provider returned an empty response");
  }
  return reply;
}

async function generateWithAnthropic(
  turns: ChatTurn[],
  mode: ChatMode,
  forceComplete: boolean,
): Promise<string> {
  return callChatCompletion(getAnthropicClient(), resolveAnthropicModel(), turns, mode, forceComplete);
}

async function generateWithRodium(
  turns: ChatTurn[],
  mode: ChatMode,
  forceComplete: boolean,
): Promise<string> {
  return callChatCompletion(getRodiumClient(), resolveRodiumModel(), turns, mode, forceComplete);
}

/**
 * Detects the specific "insufficient credits" Anthropic error so fallback is
 * triggered only for that exact condition — never for other 400s, auth
 * errors, rate limits, or network failures. Resilient to minor changes in
 * the surrounding error JSON: it only requires HTTP 400 and the distinctive
 * phrase to appear somewhere in the (safely-extracted) error message, rather
 * than matching the whole error body verbatim or relying on fields like
 * `request_id` that vary per request.
 */
export function isInsufficientAnthropicCreditsError(error: unknown): boolean {
  if (!(error instanceof Anthropic.APIError)) return false;
  if (error.status !== 400) return false;

  let messageText = "";
  const body: unknown = error.error;
  if (body && typeof body === "object" && "error" in body) {
    const inner = (body as { error?: unknown }).error;
    if (inner && typeof inner === "object" && "message" in inner) {
      const innerMessage = (inner as { message?: unknown }).message;
      if (typeof innerMessage === "string") messageText = innerMessage;
    }
  }
  if (!messageText && typeof error.message === "string") {
    messageText = error.message;
  }

  return /credit balance is too low/i.test(messageText);
}

const VALID_STATUSES = new Set(["continue", "complete", "urgent", "emergency"]);
const VALID_URGENCIES = new Set(["routine", "urgent", "emergency"]);
const VALID_CLINICIAN_TYPES = new Set<string>(CLINICIAN_TYPE_LIST.split(", "));

/**
 * Validates an arbitrary parsed JSON value against the TriageResult shape.
 * Never throws — anything that doesn't clearly fit is dropped (with the
 * field simply omitted, or the whole thing discarded if status/urgency
 * themselves are missing/invalid), since this is untrusted model output.
 */
function coerceTriageResult(raw: unknown): TriageResult | null {
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
  if (typeof obj.summary === "string" && obj.summary.trim()) {
    result.summary = obj.summary.trim().slice(0, 500);
  }
  if (Array.isArray(obj.symptoms)) {
    const symptoms = obj.symptoms.filter((s): s is string => typeof s === "string").slice(0, 15);
    if (symptoms.length > 0) result.symptoms = symptoms;
  }
  if (typeof obj.duration === "string" && obj.duration.trim()) {
    result.duration = obj.duration.trim().slice(0, 100);
  }
  if (typeof obj.severity === "number" && Number.isFinite(obj.severity)) {
    result.severity = Math.min(10, Math.max(1, Math.round(obj.severity)));
  }
  if (Array.isArray(obj.relevantContext)) {
    const context = obj.relevantContext
      .filter((s): s is string => typeof s === "string")
      .slice(0, 15);
    if (context.length > 0) result.relevantContext = context;
  }

  return result;
}

/**
 * Splits a raw intake reply into the text shown to the student and the
 * validated structured routing result, if any. Never lets a malformed or
 * missing block crash the request — it just falls back to `triage: null`
 * (the app keeps the conversation in "still gathering info" mode) and logs
 * a warning server-side. The raw JSON block is always stripped from what
 * the student sees, even if parsing fails.
 */
export function parseIntakeReply(rawText: string): { visibleText: string; triage: TriageResult | null } {
  const startIndex = rawText.indexOf(TRIAGE_BLOCK_START);
  if (startIndex === -1) {
    return { visibleText: rawText.trim(), triage: null };
  }
  const endIndex = rawText.indexOf(TRIAGE_BLOCK_END, startIndex);
  const blockContent =
    endIndex === -1
      ? rawText.slice(startIndex + TRIAGE_BLOCK_START.length)
      : rawText.slice(startIndex + TRIAGE_BLOCK_START.length, endIndex);
  const afterBlock = endIndex === -1 ? "" : rawText.slice(endIndex + TRIAGE_BLOCK_END.length);
  const stripped = (rawText.slice(0, startIndex) + afterBlock).trim();

  let triage: TriageResult | null = null;
  try {
    triage = coerceTriageResult(JSON.parse(blockContent.trim()));
  } catch {
    triage = null;
  }
  if (!triage) {
    console.warn("[chat] Intake reply included an unparseable/invalid triage block; ignoring it.");
  }

  return {
    visibleText: stripped.length > 0 ? stripped : "Okay — let's continue. Could you tell me a bit more?",
    triage,
  };
}

/**
 * Generates a chat response. Tries Anthropic first (when configured) and
 * automatically retries the *same* request through Rodium only when
 * Anthropic specifically reports insufficient account credits — any other
 * Anthropic failure (auth, rate limit, unrelated 400, network) is rethrown
 * as-is so the route layer's existing Anthropic-specific error handling
 * applies. There is at most one fallback attempt per request (Anthropic →
 * Rodium), never a loop back to Anthropic.
 *
 * If Anthropic isn't configured at all but Rodium is, Rodium runs as the
 * sole provider. If neither is configured, throws MissingApiKeyError before
 * making any network call.
 *
 * `mode` selects the system prompt (doctor thread vs. AI intake) and is
 * always chosen by the server from the conversation's own state — never
 * taken from arbitrary client text. `forceComplete` (intake mode only) asks
 * the model to finalize triage on this turn once the route layer decides
 * the conversation has gone on long enough (see server/routes/chat.ts).
 */
export async function generateChatResponse(
  turns: ChatTurn[],
  mode: ChatMode = "doctor",
  forceComplete = false,
): Promise<ChatResponse> {
  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;
  const rodiumConfigured = !!process.env.RODIUM_API_KEY;

  if (!anthropicConfigured && !rodiumConfigured) {
    throw new MissingApiKeyError();
  }

  let rawReply: string;

  if (!anthropicConfigured) {
    console.log("[chat] ANTHROPIC_API_KEY not set — using Rodium as the sole provider");
    try {
      rawReply = await generateWithRodium(turns, mode, forceComplete);
      console.log("[chat] Rodium request succeeded");
    } catch (error) {
      console.error(
        "[chat] Rodium request failed:",
        error instanceof Error ? error.message : error,
      );
      throw new AIServiceUnavailableError();
    }
  } else {
    console.log("[chat] Attempting Anthropic");
    try {
      rawReply = await generateWithAnthropic(turns, mode, forceComplete);
      console.log("[chat] Anthropic request succeeded");
    } catch (error) {
      if (!isInsufficientAnthropicCreditsError(error)) {
        // Not the specific insufficient-credits condition — never silently
        // switch providers for auth errors, rate limits, unrelated 400s, etc.
        throw error;
      }

      console.warn("[chat] Anthropic insufficient credits, falling back to Rodium");

      if (!rodiumConfigured) {
        console.error("[chat] Rodium is not configured — no fallback available.");
        throw new AIServiceUnavailableError();
      }

      try {
        rawReply = await generateWithRodium(turns, mode, forceComplete);
        console.log("[chat] Rodium request succeeded");
      } catch (rodiumError) {
        console.error(
          "[chat] Rodium request failed:",
          rodiumError instanceof Error ? rodiumError.message : rodiumError,
        );
        throw new AIServiceUnavailableError();
      }
    }
  }

  if (mode !== "intake") {
    return { reply: rawReply, triage: null };
  }
  const { visibleText, triage } = parseIntakeReply(rawReply);
  return { reply: visibleText, triage };
}
