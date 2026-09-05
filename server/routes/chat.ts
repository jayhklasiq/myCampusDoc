import Anthropic from "@anthropic-ai/sdk";
import { Router, type Request, type Response } from "express";
import {
  AIServiceUnavailableError,
  generateChatResponse,
  MissingApiKeyError,
  type ChatMode,
  type ChatTurn,
} from "../services/claude.js";

export const chatRouter = Router();

// Cost/abuse control (see requirement: reasonable conversation-length and
// message-size limits). The frontend already trims history before sending,
// this is defense in depth against a client that doesn't.
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

// Safety net against an intake conversation running forever (requirement:
// "the AI should not keep asking questions simply because it can"). Once the
// student has sent this many messages without the AI reaching a conclusion,
// the model is instructed to finalize triage on this turn regardless.
const FORCE_COMPLETE_AFTER_USER_TURNS = 6;

function isValidRole(role: unknown): role is ChatTurn["role"] {
  return role === "user" || role === "assistant";
}

function isValidMode(mode: unknown): mode is ChatMode {
  return mode === "doctor" || mode === "intake";
}

chatRouter.post("/chat", async (req: Request, res: Response) => {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || !("messages" in body)) {
    res.status(400).json({ error: "Request must include a 'messages' array." });
    return;
  }

  // `mode` selects which fixed, server-owned system prompt is used (doctor
  // thread vs. AI intake). It is validated against a closed set — the
  // client can influence *which* prompt applies to its own conversation,
  // never *what* either prompt says.
  const { messages, mode: rawMode } = body as { messages: unknown; mode?: unknown };
  if (rawMode !== undefined && !isValidMode(rawMode)) {
    res.status(400).json({ error: "'mode' must be 'doctor' or 'intake'." });
    return;
  }
  const mode: ChatMode = rawMode === undefined ? "doctor" : rawMode;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Message history must not be empty." });
    return;
  }

  const turns: ChatTurn[] = [];
  for (const raw of messages) {
    if (typeof raw !== "object" || raw === null) {
      res.status(400).json({ error: "Each message must be an object." });
      return;
    }
    // Never trust a client-provided role beyond "user"/"assistant" — this is
    // also what keeps a client from smuggling in a "system" role message to
    // try to override the server-controlled system prompt.
    const { role, content } = raw as { role?: unknown; content?: unknown };
    if (!isValidRole(role)) {
      res.status(400).json({ error: "Each message role must be 'user' or 'assistant'." });
      return;
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      res.status(400).json({ error: "Each message must include non-empty text content." });
      return;
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      res
        .status(400)
        .json({ error: `Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
      return;
    }
    turns.push({ role, content: content.trim() });
  }

  let trimmed = turns.slice(-MAX_MESSAGES);
  // The API requires the first message to be from the user; trimming to the
  // last N messages can leave a leading "assistant" message, so drop it.
  while (trimmed.length > 0 && trimmed[0].role !== "user") {
    trimmed = trimmed.slice(1);
  }

  if (trimmed.length === 0) {
    res.status(400).json({ error: "No valid messages to send." });
    return;
  }

  const userTurnCount = trimmed.filter((t) => t.role === "user").length;
  const forceComplete = mode === "intake" && userTurnCount >= FORCE_COMPLETE_AFTER_USER_TURNS;

  try {
    const { reply, triage } = await generateChatResponse(trimmed, mode, forceComplete);
    res.status(200).json({ reply, triage });
  } catch (error) {
    handleChatError(error, res);
  }
});

function handleChatError(error: unknown, res: Response): void {
  if (error instanceof MissingApiKeyError) {
    console.error(
      "[chat] No AI provider is configured. Add ANTHROPIC_API_KEY and/or RODIUM_API_KEY to your .env file (see .env.example) and restart the server.",
    );
    res
      .status(500)
      .json({ error: "The chat assistant isn't configured yet. Please try again later." });
    return;
  }

  if (error instanceof AIServiceUnavailableError) {
    // Anthropic hit its insufficient-credits condition and the Rodium
    // fallback either isn't configured or failed too — the specific cause is
    // already logged inside generateChatResponse(); keep this generic.
    console.error("[chat] AI service unavailable after exhausting all configured providers.");
    res.status(503).json({
      error: "The chat assistant is temporarily unavailable. Please try again in a moment.",
    });
    return;
  }

  if (error instanceof Anthropic.AuthenticationError) {
    console.error("[chat] Anthropic authentication failed — check ANTHROPIC_API_KEY.");
    res
      .status(500)
      .json({ error: "The chat assistant isn't configured correctly. Please try again later." });
    return;
  }

  if (error instanceof Anthropic.RateLimitError) {
    console.error("[chat] Anthropic rate limit hit:", error.message);
    res.status(429).json({
      error: "The assistant is a little busy right now. Please wait a moment and try again.",
    });
    return;
  }

  if (error instanceof Anthropic.APIConnectionError) {
    console.error("[chat] Could not reach the Anthropic API:", error.message);
    res
      .status(503)
      .json({ error: "I'm having trouble responding right now. Please try again in a moment." });
    return;
  }

  if (error instanceof Anthropic.APIError) {
    console.error(`[chat] Anthropic API error (status ${error.status}):`, error.message);
    res
      .status(502)
      .json({ error: "I'm having trouble responding right now. Please try again in a moment." });
    return;
  }

  console.error("[chat] Unexpected error generating chat reply:", error);
  res
    .status(500)
    .json({ error: "I'm having trouble responding right now. Please try again in a moment." });
}
