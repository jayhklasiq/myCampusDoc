import Anthropic from "@anthropic-ai/sdk";

/**
 * Isolated AI provider integration for the MyCampusCare chat assistant.
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
 */

const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5";
const DEFAULT_RODIUM_MODEL = "anthropic/claude-opus-5";
const RODIUM_BASE_URL = "https://api.rodiumai.io";
const MAX_OUTPUT_TOKENS = 1024;

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

// The assistant must never claim to be a licensed clinician, never fabricate
// records/appointments/diagnoses, and must defer to the app's real (mock)
// data for anything it doesn't actually have. This text is fixed server-side
// and is never something a client request can override or append to.
export const SYSTEM_PROMPT = `You are the MyCampusCare health consultation assistant, a chat assistant embedded in a student healthcare consultation app.

You help students communicate about their health concerns and navigate the MyCampusCare consultation service. You are not a doctor and must not claim to diagnose medical conditions, prescribe medication, or replace a qualified healthcare professional. You are not the specific health professional the student is messaging in this thread — you are the app's assistant, standing in for that thread until a real professional reviews it.

Your role is to:
- Understand what the student is describing.
- Ask relevant follow-up questions.
- Provide general, cautious health information.
- Help the student understand when professional medical attention may be appropriate.
- Encourage consultation with a qualified health professional when appropriate.
- Help students navigate MyCampusCare (e.g. suggest using the app's audio/video call buttons or the Schedule tab to book a consultation when that fits what they're asking for).
- Maintain context throughout the conversation.
- Never fabricate medical records, consultation history, diagnoses, prescriptions, appointments, or test results.

When the student's situation may require urgent or emergency medical attention, clearly advise them to seek appropriate urgent/emergency care rather than attempting to handle the situation entirely through chat.

Do not present speculation as fact. Do not invent information about the student's medical history. Do not claim that a specific health professional has reviewed the conversation unless the application actually provides evidence that they have. You cannot see the student's profile, medical notes, appointments, or consultation history — never claim to check, view, or read any of that; if it's relevant, ask the student to tell you or point them to the app's Profile, Schedule, or History tabs.

Keep responses conversational, clear, and appropriately concise for a chat interface — a short paragraph or a few sentences is usually enough; use brief bullet points only when listing several distinct items genuinely helps (e.g. a few possible causes, a few next steps).`;

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

// Both providers speak the same Messages API shape, so this is the one place
// that actually builds and sends the request — Anthropic and Rodium always
// receive the identical system prompt, conversation turns, and token limit;
// only the client (credentials/base URL) and model id differ.
async function callChatCompletion(
  client: Anthropic,
  model: string,
  turns: ChatTurn[],
): Promise<string> {
  const response = await client.messages.create({
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
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

async function generateWithAnthropic(turns: ChatTurn[]): Promise<string> {
  return callChatCompletion(getAnthropicClient(), resolveAnthropicModel(), turns);
}

async function generateWithRodium(turns: ChatTurn[]): Promise<string> {
  return callChatCompletion(getRodiumClient(), resolveRodiumModel(), turns);
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

/**
 * Generates a chat reply. Tries Anthropic first (when configured) and
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
 */
export async function generateChatResponse(turns: ChatTurn[]): Promise<string> {
  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;
  const rodiumConfigured = !!process.env.RODIUM_API_KEY;

  if (!anthropicConfigured && !rodiumConfigured) {
    throw new MissingApiKeyError();
  }

  if (!anthropicConfigured) {
    console.log("[chat] ANTHROPIC_API_KEY not set — using Rodium as the sole provider");
    try {
      const reply = await generateWithRodium(turns);
      console.log("[chat] Rodium request succeeded");
      return reply;
    } catch (error) {
      console.error(
        "[chat] Rodium request failed:",
        error instanceof Error ? error.message : error,
      );
      throw new AIServiceUnavailableError();
    }
  }

  console.log("[chat] Attempting Anthropic");
  try {
    const reply = await generateWithAnthropic(turns);
    console.log("[chat] Anthropic request succeeded");
    return reply;
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
      const reply = await generateWithRodium(turns);
      console.log("[chat] Rodium request succeeded");
      return reply;
    } catch (rodiumError) {
      console.error(
        "[chat] Rodium request failed:",
        rodiumError instanceof Error ? rodiumError.message : rodiumError,
      );
      throw new AIServiceUnavailableError();
    }
  }
}
