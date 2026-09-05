import Anthropic from "@anthropic-ai/sdk";

/**
 * Isolated Claude integration for the MyCampusCare chat assistant.
 *
 * Kept separate from Express routing/validation so the request/response
 * shape here can grow (e.g. tool use for checking appointment slots or
 * pulling profile/history context) without touching the HTTP layer.
 */

const DEFAULT_MODEL = "claude-opus-5";
const MAX_OUTPUT_TOKENS = 1024;

export class MissingApiKeyError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
    this.name = "MissingApiKeyError";
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

function resolveModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingApiKeyError();
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

/**
 * Sends the given conversation turns to Claude with the fixed MyCampusCare
 * system prompt and returns the assistant's reply text.
 *
 * `turns` must already be validated and trimmed by the caller (see
 * server/routes/chat.ts) — this function does not re-validate shape, but it
 * does not trust it to be safe either: it never lets `turns` influence the
 * system prompt, only the `messages` array.
 */
export async function generateChatReply(turns: ChatTurn[]): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: resolveModel(),
    max_tokens: MAX_OUTPUT_TOKENS,
    system: SYSTEM_PROMPT,
    messages: turns,
  });

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );

  const reply = textBlock?.text.trim();
  if (!reply) {
    throw new Error("Claude returned an empty response");
  }
  return reply;
}
