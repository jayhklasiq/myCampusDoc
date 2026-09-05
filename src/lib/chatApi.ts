/**
 * Client-side wrapper around the app's own `/api/chat` endpoint (see
 * server/routes/chat.ts). This is the only place the frontend talks to the
 * backend for chat — the Anthropic API key and system prompt never leave
 * the server.
 */

export interface ChatApiTurn {
  role: "user" | "assistant";
  content: string;
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

export async function requestChatReply(turns: ChatApiTurn[]): Promise<string> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: turns }),
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
  return reply;
}
