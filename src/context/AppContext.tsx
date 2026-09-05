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
import { requestChatReply, type ChatApiTurn } from "../lib/chatApi";
import { generateId } from "../lib/id";
import { loadState, saveState } from "../lib/storage";
import type {
  Appointment,
  Consultation,
  Conversation,
  ConsultationType,
  MedicalNote,
  Message,
  PlanId,
  Subscription,
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
    }
  | {
      type: "CREATE_APPOINTMENT";
      appointment: Appointment;
    }
  | { type: "START_CONVERSATION"; conversationId: string; professionalId: string }
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
      };
    case "CREATE_APPOINTMENT":
      return {
        ...state,
        appointments: [...state.appointments, action.appointment],
        pendingConsultationType: null,
        pendingConsultationSourceLabel: null,
        pendingProfessionalId: null,
      };
    case "START_CONVERSATION":
      return {
        ...state,
        conversations: [
          ...state.conversations,
          {
            id: action.conversationId,
            professionalId: action.professionalId,
            lastMessage: "",
            lastMessageAt: new Date().toISOString(),
            unreadCount: 0,
          },
        ],
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
  markConversationRead: (conversationId: string) => void;
  setPendingConsultation: (
    consultationType: ConsultationType | null,
    sourceLabel?: string | null,
    professionalId?: string | null,
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
      const reply = await requestChatReply(turns.slice(-MAX_CLIENT_HISTORY_TURNS));
      dispatch({ type: "RECEIVE_MESSAGE", conversationId, text: reply });
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
      markConversationRead: (conversationId) =>
        dispatch({ type: "MARK_CONVERSATION_READ", conversationId }),
      setPendingConsultation: (consultationType, sourceLabel, professionalId) =>
        dispatch({
          type: "SET_PENDING_CONSULTATION",
          consultationType,
          sourceLabel,
          professionalId,
        }),
      createAppointment: (input) => {
        const appointment: Appointment = {
          id: generateId("appt"),
          date: input.date,
          time: input.time,
          professionalId: input.professionalId,
          consultationType: input.consultationType,
          status: "upcoming",
          needToKnow: input.needToKnow || undefined,
          note: input.needToKnow ? input.needToKnow.slice(0, 60) : undefined,
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
