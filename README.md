# MyCampusDoc — Product Demo

An interactive product demo of MyCampusDoc, a student healthcare consultation
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

## Routes

All frontend routes are defined in `src/App.tsx`. Each maps to one route-level
page component under `src/pages/`.

### Student (default entry point)

| Route | Purpose | Page component |
| --- | --- | --- |
| `/` | Redirects to wherever the current session belongs (`/signup`, `/login`, `/payment`, or `/profile`) — no page of its own, handled by a `RootRedirect` helper in `App.tsx`. | — |
| `/signup` | Create a student account (name, email, phone, password). | `src/pages/SignUpPage.tsx` |
| `/login` | Log in with an existing student account. | `src/pages/LoginPage.tsx` |
| `/payment` | Choose a plan and complete simulated checkout. | `src/pages/PaymentPage.tsx` |
| `/chat` | List of the student's conversations; "+" starts a new AI health-intake chat. | `src/pages/ChatPage.tsx` |
| `/chat/:conversationId` | One conversation — AI intake, clinician recommendation cards, urgent/emergency advisories, or a live thread with an attached doctor. | `src/pages/ChatConversationPage.tsx` |
| `/history` | List of the student's past/scheduled consultations. | `src/pages/HistoryPage.tsx` |
| `/history/:consultationId` | Full record for one consultation — summary, AI intake (if any), diagnosis, prescriptions, tests, follow-up. | `src/pages/HistoryDetailPage.tsx` |
| `/schedule` | Calendar + booking flow; also where an AI-recommended clinician's real time slots are booked. | `src/pages/SchedulePage.tsx` |
| `/profile` | Student profile, subscription, medical notes, log out. | `src/pages/ProfilePage.tsx` |

### Doctor Portal

| Route | Purpose | Page component |
| --- | --- | --- |
| `/doctor/login` | Passwordless sign-in: email → simulated verification code → verify. | `src/pages/doctor/DoctorLoginPage.tsx` |
| `/doctor/dashboard` | Today's/upcoming consultation counts, unread messages, next appointment. | `src/pages/doctor/DoctorDashboardPage.tsx` |
| `/doctor/calendar` | Calendar view of the doctor's own appointments and availability by day. | `src/pages/doctor/DoctorCalendarPage.tsx` |
| `/doctor/availability` | Add/remove weekly availability blocks (what students can actually book). | `src/pages/doctor/DoctorAvailabilityPage.tsx` |
| `/doctor/consultations` | List of upcoming/completed consultations, including AI-triaged bookings. | `src/pages/doctor/DoctorConsultationsPage.tsx` |
| `/doctor/consultations/:id` | Open one consultation — AI intake summary (clearly labeled), and enter notes/diagnosis/prescriptions/tests/follow-up. | `src/pages/doctor/DoctorConsultationDetailPage.tsx` |
| `/doctor/messages` | Conversations with students, filterable by All/Unread/Read. | `src/pages/doctor/DoctorMessagesPage.tsx` |
| `/doctor/messages/:conversationId` | One conversation thread with a student. | `src/pages/doctor/DoctorConversationPage.tsx` |
| `/doctor/profile` | Practitioner profile — HiveCare-managed fields vs. doctor-editable contact info. | `src/pages/doctor/DoctorProfilePage.tsx` |

### HiveCare Admin Portal

| Route | Purpose | Page component |
| --- | --- | --- |
| `/hivecare/login` | Demo-only admin sign-in (no password). | `src/pages/hivecare/HivecareLoginPage.tsx` |
| `/hivecare/dashboard` | Practitioner network overview (counts by status, upcoming consultations). | `src/pages/hivecare/HivecareDashboardPage.tsx` |
| `/hivecare/practitioners` | Table of all practitioners — contact info, specialty, status, availability. | `src/pages/hivecare/PractitionersListPage.tsx` |
| `/hivecare/practitioners/:practitionerId` | One practitioner's full profile + their upcoming consultations; activate/deactivate. | `src/pages/hivecare/PractitionerDetailPage.tsx` |
| `/hivecare/onboard` | Onboard a new practitioner (triggers the simulated invitation email). | `src/pages/hivecare/OnboardPractitionerPage.tsx` |
| `/hivecare/consultations` | Company-wide view of upcoming consultations across all practitioners. | `src/pages/hivecare/HivecareConsultationsPage.tsx` |

### Dev tools

| Route | Purpose | Page component |
| --- | --- | --- |
| `/dev/emails` | Inbox of every simulated onboarding/verification email — development only, not gated behind any role. | `src/pages/DevEmailInboxPage.tsx` |

### Backend API

Not a page route — this is the one HTTP endpoint the frontend calls, served by the Express app in `server/`:

| Endpoint | Purpose | Handler |
| --- | --- | --- |
| `POST /api/chat` | Sends a conversation to Claude (with automatic RodiumAI fallback) for either AI intake or doctor-thread replies; returns `{ reply, triage }`. | `server/routes/chat.ts` → `server/services/claude.ts` |

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
