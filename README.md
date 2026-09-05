# MyCampusCare — Product Demo

An interactive product demo of MyCampusCare, a student healthcare consultation
platform. It walks through the full student journey — sign up, choose a
payment plan, subscribe, chat with a health professional, schedule an audio
or video consultation, and review consultation history — entirely with mock
data and simulated interactions. No backend, real payments, or real
video/audio calling are included; this is a click-through prototype.

## Stack

- React 19 + TypeScript, built with Vite
- React Router for client-side routing and route guards
- Tailwind CSS v4 for styling
- React Context + `useReducer` for app state, persisted to `localStorage`
- `lucide-react` for icons, `date-fns` for date handling

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. The app starts at `/signup`.

## Demo flow

Sign up → choose a payment plan → simulated checkout → land on your profile →
chat with a health professional → tap the audio/video icon to schedule a
consultation → confirm the appointment → see it on the Schedule calendar →
review past consultations in History.

Useful demo shortcuts:

- Payment card number `4000 0000 0000 0002` simulates a declined payment.
- Any other 15–16 digit card number simulates a successful payment.
- App state (account, subscription, chat messages, medical notes,
  appointments) persists in `localStorage` across page refreshes. Clear your
  browser's site data for this origin to reset the demo.

## Project structure

```
src/
  components/   Reusable UI building blocks, grouped by feature
  context/       AppContext — the app's mock state and actions
  data/          Seeded mock data (professionals, plans, chats, history)
  lib/           Formatting, validation, storage, and id helpers
  pages/         Route-level screens
  routes/        Auth/subscription route guards
  types/         Shared TypeScript types
```
