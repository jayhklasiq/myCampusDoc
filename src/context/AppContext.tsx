import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import {
  initialAppointments,
  initialConsultations,
  initialConversations,
  initialMessages,
} from "../data";
import { requestChatResponse, type ChatApiTurn, type ChatMode } from "../lib/chatApi";
import { findAvailableClinicians } from "../lib/clinicianMatching";
import { generateId } from "../lib/id";
import { loadState, saveState } from "../lib/storage";
import { buildIntakeSummaryText } from "../lib/triage";
import type {
  AiTriageRecord,
  Appointment,
  ChatStage,
  ClinicianType,
  Consultation,
  Conversation,
  ConsultationType,
  MedicalNote,
  Message,
  PlanId,
  Subscription,
  TriageResult,
  User,
} from "../types";

interface Credentials {
  email: string;
  password: string;
}

interface AppState {
  user: User | null;
  credentials: Credentials | null;
  isLoggedIn: boolean;
  subscription: Subscription | null;
  medicalNotes: MedicalNote[];
  conversations: Conversation[];
  messages: Message[];
  appointments: Appointment[];
  consultations: Consultation[];
  pendingConsultationType: ConsultationType | null;
  pendingConsultationSourceLabel: string | null;
  pendingProfessionalId: string | null;
  /** Set when scheduling was reached via an AI-intake "View Times" card, so
   * CREATE_APPOINTMENT knows which conversation to hand the booking back to. */
  pendingIntakeConversationId: string | null;
}

const initialState: AppState = {
  user: null,
  credentials: null,
  isLoggedIn: false,
  subscription: null,
  medicalNotes: [],
  conversations: initialConversations,
  messages: initialMessages,
  appointments: initialAppointments,
  consultations: initialConsultations,
  pendingConsultationType: null,
  pendingConsultationSourceLabel: null,
  pendingProfessionalId: null,
  pendingIntakeConversationId: null,
};

type Action =
  | { type: "SIGN_UP"; user: User; password: string }
  | { type: "LOG_IN" }
  | { type: "LOG_OUT" }
  | { type: "SUBSCRIBE"; planId: PlanId }
  | { type: "ADD_MEDICAL_NOTE"; text: string }
  | { type: "UPDATE_MEDICAL_NOTE"; id: string; text: string }
  | { type: "SEND_MESSAGE"; conversationId: string; text: string }
  | { type: "RECEIVE_MESSAGE"; conversationId: string; text: string }
  | { type: "MARK_CONVERSATION_READ"; conversationId: string }
  | {
      type: "SET_PENDING_CONSULTATION";
      consultationType: ConsultationType | null;
      sourceLabel?: string | null;
      professionalId?: string | null;
      intakeConversationId?: string | null;
    }
  | {
      type: "CREATE_APPOINTMENT";
      appointment: Appointment;
    }
  | { type: "START_CONVERSATION"; conversationId: string; professionalId: string }
  | { type: "START_AI_INTAKE"; conversationId: string; openingMessage: string }
  | {
      type: "RECEIVE_INTAKE_MESSAGE";
      conversationId: string;
      text: string;
      triage: TriageResult | null;
    }
  | { type: "PROCEED_TO_CLINICIAN_SELECTION"; conversationId: string }
  | { type: "HYDRATE"; state: AppState };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SIGN_UP":
      return {
        ...state,
        user: action.user,
        credentials: { email: action.user.email.toLowerCase(), password: action.password },
        isLoggedIn: true,
      };
    case "LOG_IN":
      return { ...state, isLoggedIn: true };
    case "LOG_OUT":
      return { ...state, isLoggedIn: false };
    case "SUBSCRIBE":
      return {
        ...state,
        subscription: {
          planId: action.planId,
          startedAt: new Date().toISOString(),
          status: "active",
        },
      };
    case "ADD_MEDICAL_NOTE": {
      const now = new Date().toISOString();
      const note: MedicalNote = {
        id: generateId("note"),
        text: action.text,
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, medicalNotes: [note, ...state.medicalNotes] };
    }
    case "UPDATE_MEDICAL_NOTE":
      return {
        ...state,
        medicalNotes: state.medicalNotes.map((n) =>
          n.id === action.id
            ? { ...n, text: action.text, updatedAt: new Date().toISOString() }
            : n,
        ),
      };
    case "SEND_MESSAGE": {
      const message: Message = {
        id: generateId("msg"),
        conversationId: action.conversationId,
        sender: "student",
        text: action.text,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        messages: [...state.messages, message],
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? { ...c, lastMessage: action.text, lastMessageAt: message.timestamp }
            : c,
        ),
      };
    }
    case "RECEIVE_MESSAGE": {
      const message: Message = {
        id: generateId("msg"),
        conversationId: action.conversationId,
        sender: "professional",
        text: action.text,
        timestamp: new Date().toISOString(),
      };
      return {
        ...state,
        messages: [...state.messages, message],
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId
            ? {
                ...c,
                lastMessage: action.text,
                lastMessageAt: message.timestamp,
                unreadCount: c.unreadCount + 1,
              }
            : c,
        ),
      };
    }
    case "MARK_CONVERSATION_READ":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      };
    case "SET_PENDING_CONSULTATION":
      return {
        ...state,
        pendingConsultationType: action.consultationType,
        pendingConsultationSourceLabel: action.sourceLabel ?? null,
        pendingProfessionalId: action.professionalId ?? null,
        pendingIntakeConversationId: action.intakeConversationId ?? null,
      };
    case "CREATE_APPOINTMENT": {
      const intakeConversationId = state.pendingIntakeConversationId;
      const intakeConversation = intakeConversationId
        ? state.conversations.find((c) => c.id === intakeConversationId)
        : undefined;

      if (!intakeConversation) {
        return {
          ...state,
          appointments: [...state.appointments, action.appointment],
          pendingConsultationType: null,
          pendingConsultationSourceLabel: null,
          pendingProfessionalId: null,
          pendingIntakeConversationId: null,
        };
      }

      // This appointment was booked from an AI-intake "View Times" card —
      // hand the same conversation over to the clinician who was scheduled,
      // and create the linked (not-yet-completed) consultation record so the
      // AI intake shows up in History too (see Consultation.status "scheduled").
      const now = new Date().toISOString();
      const handoffText = [
        `You're all set — your ${action.appointment.consultationType} consultation is scheduled for ${action.appointment.date} at ${action.appointment.time}.`,
        "",
        "Your clinician will have this AI intake summary going into the visit:",
        "",
        action.appointment.aiIntakeSummary ?? buildIntakeSummaryText(intakeConversation.triage),
      ].join("\n");
      const handoffMessage: Message = {
        id: generateId("msg"),
        conversationId: intakeConversationId!,
        sender: "professional",
        text: handoffText,
        timestamp: now,
      };

      const consultation: Consultation = {
        id: generateId("consult"),
        date: action.appointment.date,
        time: action.appointment.time,
        professionalId: action.appointment.professionalId,
        consultationType: action.appointment.consultationType,
        status: "scheduled",
        summary:
          intakeConversation.triage?.summary?.trim() ||
          "AI intake completed prior to consultation; no summary text was captured.",
        diagnosis: null,
        prescriptions: [],
        tests: [],
        followUpAppointmentId: null,
        appointmentId: action.appointment.id,
        aiIntakeSummary: action.appointment.aiIntakeSummary,
        aiTriage: action.appointment.aiTriage,
      };

      return {
        ...state,
        appointments: [...state.appointments, action.appointment],
        consultations: [...state.consultations, consultation],
        conversations: state.conversations.map((c) =>
          c.id === intakeConversationId
            ? {
                ...c,
                professionalId: action.appointment.professionalId,
                stage: "scheduled" as const,
                recommendedProfessionalIds: undefined,
                lastMessage: handoffText,
                lastMessageAt: now,
                unreadCount: c.unreadCount + 1,
              }
            : c,
        ),
        messages: [...state.messages, handoffMessage],
        pendingConsultationType: null,
        pendingConsultationSourceLabel: null,
        pendingProfessionalId: null,
        pendingIntakeConversationId: null,
      };
    }
    case "START_CONVERSATION":
      return {
        ...state,
        conversations: [
          ...state.conversations,
          {
            id: action.conversationId,
            professionalId: action.professionalId,
            stage: "doctor_consultation",
            lastMessage: "",
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
          },
        ],
      };
    case "START_AI_INTAKE": {
      const now = new Date().toISOString();
      const conversation: Conversation = {
        id: action.conversationId,
        professionalId: null,
        stage: "ai_intake",
        lastMessage: action.openingMessage,
        lastMessageAt: now,
        unreadCount: 0,
      };
      const openingMessageRecord: Message = {
        id: generateId("msg"),
        conversationId: action.conversationId,
        sender: "professional",
        text: action.openingMessage,
        timestamp: now,
      };
      return {
        ...state,
        conversations: [...state.conversations, conversation],
        messages: [...state.messages, openingMessageRecord],
      };
    }
    case "RECEIVE_INTAKE_MESSAGE": {
      const now = new Date().toISOString();
      const message: Message = {
        id: generateId("msg"),
        conversationId: action.conversationId,
        sender: "professional",
        text: action.text,
        timestamp: now,
      };

      return {
        ...state,
        messages: [...state.messages, message],
        conversations: state.conversations.map((c) => {
          if (c.id !== action.conversationId) return c;
          const triage = action.triage ?? c.triage;
          let stage: ChatStage = c.stage;
          let recommendedProfessionalIds = c.recommendedProfessionalIds;

          // Only act on a routing decision while intake is still in progress —
          // once the conversation has moved on, further replies (e.g. in
          // doctor mode) never carry a triage payload anyway.
          if (c.stage === "ai_intake" && action.triage) {
            if (action.triage.status === "complete") {
              const clinicianType: ClinicianType =
                action.triage.clinicianType ?? "general_practitioner";
              recommendedProfessionalIds = findAvailableClinicians(clinicianType).map((p) => p.id);
              stage = "clinician_selection";
            } else if (action.triage.status === "urgent") {
              stage = "urgent_advisory";
            } else if (action.triage.status === "emergency") {
              stage = "emergency_advisory";
            }
          }

          return {
            ...c,
            triage,
            stage,
            recommendedProfessionalIds,
            lastMessage: action.text,
            lastMessageAt: now,
            unreadCount: c.unreadCount + 1,
          };
        }),
      };
    }
    case "PROCEED_TO_CLINICIAN_SELECTION":
      return {
        ...state,
        conversations: state.conversations.map((c) => {
          if (c.id !== action.conversationId) return c;
          const clinicianType: ClinicianType = c.triage?.clinicianType ?? "general_practitioner";
          return {
            ...c,
            stage: "clinician_selection",
            recommendedProfessionalIds: findAvailableClinicians(clinicianType).map((p) => p.id),
          };
        }),
      };
    default:
      return state;
  }
}

export interface ChatError {
  /** The user's message that failed to get a reply, so it can be retried verbatim. */
  text: string;
  /** Safe, user-facing message (already sanitized server-side). */
  message: string;
}

interface AppContextValue extends AppState {
  isAuthenticated: boolean;
  hasAccount: boolean;
  hasActiveSubscription: boolean;
  isHydrated: boolean;
  /** Conversation IDs with a Claude reply currently in flight. */
  pendingConversationIds: Set<string>;
  /** Conversation IDs whose most recent reply attempt failed, and why. */
  chatErrors: Record<string, ChatError>;
  signUp: (user: User, password: string) => void;
  logIn: (email: string, password: string) => { success: boolean; error?: string };
  logOut: () => void;
  subscribe: (planId: PlanId) => void;
  addMedicalNote: (text: string) => void;
  updateMedicalNote: (id: string, text: string) => void;
  sendMessage: (conversationId: string, text: string) => void;
  retryLastMessage: (conversationId: string) => void;
  /** Returns the id of the (possibly newly-created) conversation with this professional. */
  startConversation: (professionalId: string) => string;
  /** Starts a brand-new AI health-assistant intake conversation and returns its id. */
  startAIIntake: () => string;
  /** Urgent-advisory path: continue on to clinician matching after the warning. */
  proceedToClinicianSelection: (conversationId: string) => void;
  markConversationRead: (conversationId: string) => void;
  setPendingConsultation: (
    consultationType: ConsultationType | null,
    sourceLabel?: string | null,
    professionalId?: string | null,
    intakeConversationId?: string | null,
  ) => void;
  createAppointment: (input: {
    date: string;
    time: string;
    professionalId: string;
    consultationType: ConsultationType;
    needToKnow: string;
  }) => Appointment;
}

const AppContext = createContext<AppContextValue | null>(null);

// Client-side courtesy trim mirroring the server's own cap (server/routes/chat.ts) —
// keeps requests small/cheap. The server enforces its own limit independently, so this
// is not the security boundary, just avoids sending history we know will be dropped.
const MAX_CLIENT_HISTORY_TURNS = 20;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  // Session/subscription persist across reloads via localStorage, but that read only
  // resolves after mount. Route guards must not judge auth state until it's known,
  // otherwise a refresh on a protected page reads the blank initial state and bounces
  // an already-logged-in student back to /signup before the real data ever loads.
  const [isHydrated, setIsHydrated] = useState(false);

  // Chat request state is intentionally NOT part of the persisted reducer state above —
  // an in-flight request or a stale error has no business surviving a page reload.
  const [pendingConversationIds, setPendingConversationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [chatErrors, setChatErrors] = useState<Record<string, ChatError>>({});

  useEffect(() => {
    const persisted = loadState<AppState>();
    if (persisted) {
      dispatch({ type: "HYDRATE", state: { ...initialState, ...persisted } });
    }
    setIsHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isHydrated) saveState(state);
  }, [state, isHydrated]);

  // Sends the conversation-so-far to Claude and resolves it into either a new
  // "professional" message or a recorded chat error the UI can offer to retry.
  // `latestUserText` is the newest user turn: on a first send it hasn't been added to
  // `state.messages` yet (the SEND_MESSAGE dispatch that adds it hasn't re-rendered this
  // closure), so it's appended manually; on a retry it's already the last message in the
  // thread, so it isn't added twice.
  async function performReply(conversationId: string, latestUserText: string, isRetry: boolean) {
    const conversation = state.conversations.find((c) => c.id === conversationId);
    const mode: ChatMode = conversation?.stage === "ai_intake" ? "intake" : "doctor";

    setPendingConversationIds((prev) => new Set(prev).add(conversationId));
    if (!isRetry) {
      setChatErrors((prev) => {
        if (!(conversationId in prev)) return prev;
        const { [conversationId]: _removed, ...rest } = prev;
        return rest;
      });
    }

    const thread = state.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const turns: ChatApiTurn[] = thread.map((m) => ({
      role: m.sender === "student" ? "user" : "assistant",
      content: m.text,
    }));
    if (!isRetry) {
      turns.push({ role: "user", content: latestUserText });
    }

    try {
      const { reply, triage } = await requestChatResponse(
        turns.slice(-MAX_CLIENT_HISTORY_TURNS),
        mode,
      );
      if (mode === "intake") {
        dispatch({ type: "RECEIVE_INTAKE_MESSAGE", conversationId, text: reply, triage });
      } else {
        dispatch({ type: "RECEIVE_MESSAGE", conversationId, text: reply });
      }
      setChatErrors((prev) => {
        if (!(conversationId in prev)) return prev;
        const { [conversationId]: _removed, ...rest } = prev;
        return rest;
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again in a moment.";
      setChatErrors((prev) => ({ ...prev, [conversationId]: { text: latestUserText, message } }));
    } finally {
      setPendingConversationIds((prev) => {
        if (!prev.has(conversationId)) return prev;
        const next = new Set(prev);
        next.delete(conversationId);
        return next;
      });
    }
  }

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      isAuthenticated: !!state.user && state.isLoggedIn,
      hasAccount: !!state.user,
      hasActiveSubscription: !!state.subscription,
      isHydrated,
      pendingConversationIds,
      chatErrors,
      signUp: (user, password) => dispatch({ type: "SIGN_UP", user, password }),
      logIn: (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        if (!state.credentials || state.credentials.email !== normalizedEmail) {
          return {
            success: false,
            error: "No account found with that email. Sign up to get started.",
          };
        }
        if (state.credentials.password !== password) {
          return { success: false, error: "Incorrect password. Please try again." };
        }
        dispatch({ type: "LOG_IN" });
        return { success: true };
      },
      logOut: () => dispatch({ type: "LOG_OUT" }),
      subscribe: (planId) => dispatch({ type: "SUBSCRIBE", planId }),
      addMedicalNote: (text) => dispatch({ type: "ADD_MEDICAL_NOTE", text }),
      updateMedicalNote: (id, text) =>
        dispatch({ type: "UPDATE_MEDICAL_NOTE", id, text }),
      sendMessage: (conversationId, text) => {
        if (pendingConversationIds.has(conversationId)) return;
        const conversation = state.conversations.find((c) => c.id === conversationId);
        // Free-text only makes sense while the AI is actively conducting intake,
        // or once a real clinician is attached to the thread — the workflow
        // stages in between (clinician cards, advisories, scheduling) are
        // driven by their own dedicated actions, not by chatting further.
        const canSend =
          conversation?.stage === "ai_intake" ||
          conversation?.stage === "doctor_consultation" ||
          conversation?.stage === "scheduled";
        if (!canSend) return;
        dispatch({ type: "SEND_MESSAGE", conversationId, text });
        void performReply(conversationId, text, false);
      },
      retryLastMessage: (conversationId) => {
        if (pendingConversationIds.has(conversationId)) return;
        const failed = chatErrors[conversationId];
        if (!failed) return;
        void performReply(conversationId, failed.text, true);
      },
      startConversation: (professionalId) => {
        const existing = state.conversations.find((c) => c.professionalId === professionalId);
        if (existing) return existing.id;
        const conversationId = generateId("conv");
        dispatch({ type: "START_CONVERSATION", conversationId, professionalId });
        return conversationId;
      },
      startAIIntake: () => {
        const conversationId = generateId("conv");
        const openingMessage =
          "Hi, I'm the MyCampusCare AI Health Assistant. I'm not a doctor, but I'll ask you a few questions about what you're experiencing so I can help connect you with the right healthcare professional here at MyCampusCare. What's going on today?";
        dispatch({ type: "START_AI_INTAKE", conversationId, openingMessage });
        return conversationId;
      },
      proceedToClinicianSelection: (conversationId) =>
        dispatch({ type: "PROCEED_TO_CLINICIAN_SELECTION", conversationId }),
      markConversationRead: (conversationId) =>
        dispatch({ type: "MARK_CONVERSATION_READ", conversationId }),
      setPendingConsultation: (consultationType, sourceLabel, professionalId, intakeConversationId) =>
        dispatch({
          type: "SET_PENDING_CONSULTATION",
          consultationType,
          sourceLabel,
          professionalId,
          intakeConversationId,
        }),
      createAppointment: (input) => {
        const intakeConversation = state.pendingIntakeConversationId
          ? state.conversations.find((c) => c.id === state.pendingIntakeConversationId)
          : undefined;
        const triage = intakeConversation?.triage;
        const aiTriage: AiTriageRecord | undefined = triage
          ? {
              clinicianType: triage.clinicianType ?? "general_practitioner",
              urgency: triage.urgency,
              reason: triage.summary?.trim() || "Not specified by the student.",
            }
          : undefined;

        const appointment: Appointment = {
          id: generateId("appt"),
          date: input.date,
          time: input.time,
          professionalId: input.professionalId,
          consultationType: input.consultationType,
          status: "upcoming",
          needToKnow: input.needToKnow || undefined,
          note: input.needToKnow ? input.needToKnow.slice(0, 60) : undefined,
          aiIntakeSummary: intakeConversation ? buildIntakeSummaryText(triage) : undefined,
          aiTriage,
        };
        dispatch({ type: "CREATE_APPOINTMENT", appointment });
        return appointment;
      },
    }),
    // performReply is a plain function redefined every render; its only real dependency
    // (state) is already tracked below, and the setState functions are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, isHydrated, pendingConversationIds, chatErrors],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
