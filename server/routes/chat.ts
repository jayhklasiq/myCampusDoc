import Anthropic from "@anthropic-ai/sdk";
import { Router, type Request, type Response } from "express";
import {
  AIServiceUnavailableError,
  generateChatResponse,
  MissingApiKeyError,
  type ChatTurn,
} from "../services/claude.js";

export const chatRouter = Router();

// Cost/abuse control (see requirement: reasonable conversation-length and
// message-size limits). The frontend already trims history before sending,
// this is defense in depth against a client that doesn't.
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

function isValidRole(role: unknown): role is ChatTurn["role"] {
  return role === "user" || role === "assistant";
}

chatRouter.post("/chat", async (req: Request, res: Response) => {
  const body: unknown = req.body;

  if (typeof body !== "object" || body === null || !("messages" in body)) {
    res.status(400).json({ error: "Request must include a 'messages' array." });
    return;
  }

  const { messages } = body as { messages: unknown };
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

  try {
    const reply = await generateChatResponse(trimmed);
    res.status(200).json({ reply });
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
