# MyCampusCare — Product Demo

An interactive product demo of MyCampusCare, a student healthcare consultation
platform. It walks through the full student journey — sign up, choose a
payment plan, subscribe, chat with a health professional, schedule an audio
or video consultation, and review consultation history. Payments, video/audio
calling, and all seeded professionals/history/appointments are simulated with
mock data — this is a click-through prototype. The one exception is **Chat**:
messages from the health professional are generated live by Claude (Anthropic)
through a small backend of this project's own, described below.

## Stack

- React 19 + TypeScript, built with Vite
- React Router for client-side routing and route guards
- Tailwind CSS v4 for styling
- React Context + `useReducer` for app state, persisted to `localStorage`
- `lucide-react` for icons, `date-fns` for date handling
- A small Express server (`server/`) exposing `POST /api/chat`, which calls
  the Anthropic API server-side via `@anthropic-ai/sdk`

## Getting started

```bash
npm install
cp .env.example .env
# then edit .env and add your ANTHROPIC_API_KEY (see below)
npm run dev
```

`npm run dev` starts both the Vite frontend and the API server together.
Open the printed local URL (`http://localhost:5173`) — the app starts at
`/signup`. Without an API key, everything else in the demo works normally;
only the Chat feature will show a "not configured" error (see
[Configuring the Claude API](#configuring-the-claude-api)).

## Demo flow

Sign up → choose a payment plan → simulated checkout → land on your profile →
chat with a health professional (now genuinely powered by Claude) → tap the
audio/video icon to schedule a consultation → confirm the appointment → see
it on the Schedule calendar → review past consultations in History.

Useful demo shortcuts:

- Payment card number `4000 0000 0000 0002` simulates a declined payment.
- Any other 15–16 digit card number simulates a successful payment.
- App state (account, subscription, chat messages, medical notes,
  appointments) persists in `localStorage` across page refreshes. Clear your
  browser's site data for this origin to reset the demo.

## Configuring the Claude API

The Chat feature sends conversations to Claude through this project's own
backend (`server/`) — the frontend never talks to Anthropic directly, and the
API key never reaches the browser.

1. **Get an API key.** Sign in at
   [console.anthropic.com](https://console.anthropic.com/settings/keys) and
   create a new API key.
2. **Add it to your environment.** Copy `.env.example` to `.env` (this file
   is git-ignored — never commit real keys) and set:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
   Optionally also set `ANTHROPIC_MODEL` (defaults to `claude-opus-5`) and
   `PORT` (defaults to `3001`, the backend's own port).
3. **Run the app.** `npm run dev` starts the Vite dev server and the API
   server together; Vite proxies `/api/*` requests to the backend (see
   `vite.config.ts`), so the browser only ever talks to one origin.
4. **Test the chat.** Sign up, subscribe, open Chat, open any conversation,
   and send a message — a real Claude-generated reply should appear after a
   brief "typing" indicator. Try a follow-up message referencing the first
   one (e.g. "I've had a headache since yesterday." then "It's mostly on the
   right side.") — Claude should understand the second message is about the
   same headache.

If `ANTHROPIC_API_KEY` is missing, the server logs setup instructions to its
own console and the endpoint returns a safe "not configured" error to the
frontend — the app never silently falls back to a canned/random reply.

### How it works

```
Chat UI (src/pages/ChatConversationPage.tsx)
  → src/lib/chatApi.ts            (fetch('/api/chat'))
  → server/routes/chat.ts         (validates the request, builds a clean error on failure)
  → server/services/claude.ts     (owns the Anthropic client, model, and system prompt)
  → Anthropic Claude API
```

- The full recent message history for the open conversation is sent with
  every request (trimmed to the last 20 messages client-side, and again
  server-side as a hard limit) so Claude has real context across turns —
  it is never asked to reply to a message in isolation.
- The system prompt (in `server/services/claude.ts`) is fixed server-side.
  The client can only send `user`/`assistant` turns; it cannot inject or
  override the system prompt.
- `server/services/claude.ts` is intentionally the only place that talks to
  Anthropic, so it can grow to support tool use later (e.g. checking
  appointment slots) without touching the HTTP layer or the frontend.
- To run the built app as a single production-style process:
  `npm run build && npm start` (the server then also serves the built
  frontend from `dist/`, in addition to `/api/chat`).

## Project structure

```
src/
  components/   Reusable UI building blocks, grouped by feature
  context/       AppContext — the app's mock state and actions
  data/          Seeded mock data (professionals, plans, chats, history)
  lib/           Formatting, validation, storage, and API-client helpers
  pages/         Route-level screens
  routes/        Auth/subscription route guards
  types/         Shared TypeScript types

server/
  index.ts       Express app setup (JSON parsing, routes, static prod serving)
  routes/        HTTP endpoints (request validation, error → HTTP status mapping)
  services/      External integrations (currently just claude.ts)
```
