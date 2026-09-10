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
  initialAvailabilityRanges,
  initialConsultations,
  initialConversations,
  initialMessages,
  initialProfessionals,
} from "../data";
import { requestChatResponse, type ChatApiTurn, type ChatMode } from "../lib/chatApi";
import { findAvailableClinicians } from "../lib/clinicianMatching";
import { generateId } from "../lib/id";
import { isValidRange, rangeHasConflict, rangesOverlap } from "../lib/availability";
import {
  buildOnboardingEmailContent,
  buildVerificationEmailContent,
  generateVerificationCode,
  newDemoEmail,
} from "../lib/demoEmail";
import { PROFESSIONAL_LEVEL_TITLE } from "../lib/practitionerOptions";
import { loadState, saveState } from "../lib/storage";
import { buildIntakeSummaryText, CLINICIAN_TYPE_LABELS } from "../lib/triage";
import type {
  AiTriageRecord,
  Appointment,
  AvailabilityRange,
  ChatStage,
  ClinicianType,
  Consultation,
  Conversation,
  ConsultationType,
  DemoEmail,
  HealthProfessional,
  MedicalNote,
  Message,
  PlanId,
  Prescription,
  ProfessionalLevel,
  PractitionerStatus,
  Subscription,
  TriageResult,
  User,
} from "../types";

interface Credentials {
  email: string;
  password: string;
}

interface DoctorSession {
  practitionerId: string;
}

interface HivecareSession {
  adminName: string;
}

interface PendingDoctorVerification {
  email: string;
  practitionerId: string;
  code: string;
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

  // --- Multi-role platform state (shared by student, doctor, and HiveCare) ---
  /** The single practitioner roster — read identically by all three roles. */
  professionals: HealthProfessional[];
  /** Weekly-recurring availability each practitioner has set (PART 9/10). */
  availabilityRanges: AvailabilityRange[];
  /** Simulated outbound emails (onboarding invitations + verification codes). */
  demoEmails: DemoEmail[];
  doctorSession: DoctorSession | null;
  hivecareSession: HivecareSession | null;
  pendingDoctorVerification: PendingDoctorVerification | null;
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
  professionals: initialProfessionals,
  availabilityRanges: initialAvailabilityRanges,
  demoEmails: [],
  doctorSession: null,
  hivecareSession: null,
  pendingDoctorVerification: null,
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
  | { type: "MARK_CONVERSATION_READ_BY_PROFESSIONAL"; conversationId: string }
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
  | { type: "ONBOARD_PRACTITIONER"; professional: HealthProfessional; email: DemoEmail }
  | {
      type: "REQUEST_DOCTOR_CODE";
      email: string;
      practitionerId: string;
      code: string;
      verificationEmail: DemoEmail;
    }
  | { type: "CANCEL_DOCTOR_VERIFICATION" }
  | { type: "VERIFY_DOCTOR_CODE_SUCCESS"; practitionerId: string }
  | { type: "DOCTOR_LOG_OUT" }
  | { type: "HIVECARE_LOG_IN"; adminName: string }
  | { type: "HIVECARE_LOG_OUT" }
  | { type: "ADD_AVAILABILITY_RANGE"; range: AvailabilityRange }
  | { type: "REMOVE_AVAILABILITY_RANGE"; rangeId: string }
  | { type: "UPDATE_PRACTITIONER_CONTACT"; practitionerId: string; phone: string; address: string }
  | { type: "SET_PRACTITIONER_STATUS"; practitionerId: string; status: PractitionerStatus }
  | {
      type: "COMPLETE_CONSULTATION";
      consultationId?: string;
      appointment?: Appointment;
      summary: string;
      diagnosis: string | null;
      prescriptions: Prescription[];
      tests: string[];
      followUpAppointmentId: string | null;
    }
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
            ? {
                ...c,
                lastMessage: action.text,
                lastMessageAt: message.timestamp,
                // A real practitioner is attached once stage is past AI intake —
                // that's the doctor's own inbox unread count (PART 16), tracked
                // independently of the student-facing `unreadCount` above.
                unreadByProfessionalCount:
                  c.professionalId !== null ? c.unreadByProfessionalCount + 1 : c.unreadByProfessionalCount,
              }
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
    case "MARK_CONVERSATION_READ_BY_PROFESSIONAL":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.conversationId ? { ...c, unreadByProfessionalCount: 0 } : c,
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
            unreadByProfessionalCount: 0,
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
        unreadByProfessionalCount: 0,
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
              recommendedProfessionalIds = findAvailableClinicians(
                clinicianType,
                state.professionals,
              ).map((p) => p.id);
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
            recommendedProfessionalIds: findAvailableClinicians(
              clinicianType,
              state.professionals,
            ).map((p) => p.id),
          };
        }),
      };
    case "ONBOARD_PRACTITIONER":
      return {
        ...state,
        professionals: [...state.professionals, action.professional],
        demoEmails: [...state.demoEmails, action.email],
      };
    case "REQUEST_DOCTOR_CODE":
      return {
        ...state,
        pendingDoctorVerification: {
          email: action.email,
          practitionerId: action.practitionerId,
          code: action.code,
        },
        demoEmails: [...state.demoEmails, action.verificationEmail],
      };
    case "CANCEL_DOCTOR_VERIFICATION":
      return { ...state, pendingDoctorVerification: null };
    case "VERIFY_DOCTOR_CODE_SUCCESS": {
      const now = new Date().toISOString();
      return {
        ...state,
        doctorSession: { practitionerId: action.practitionerId },
        pendingDoctorVerification: null,
        professionals: state.professionals.map((p) =>
          p.id === action.practitionerId
            ? {
                ...p,
                status: "active" as const,
                activatedAt: p.activatedAt ?? now,
                online: true,
                availabilityNote: p.availabilityNote === "Invitation sent — awaiting first login"
                  ? "Available — set your hours"
                  : p.availabilityNote,
              }
            : p,
        ),
      };
    }
    case "DOCTOR_LOG_OUT":
      return { ...state, doctorSession: null };
    case "HIVECARE_LOG_IN":
      return { ...state, hivecareSession: { adminName: action.adminName } };
    case "HIVECARE_LOG_OUT":
      return { ...state, hivecareSession: null };
    case "ADD_AVAILABILITY_RANGE":
      return { ...state, availabilityRanges: [...state.availabilityRanges, action.range] };
    case "REMOVE_AVAILABILITY_RANGE":
      return {
        ...state,
        availabilityRanges: state.availabilityRanges.filter((r) => r.id !== action.rangeId),
      };
    case "UPDATE_PRACTITIONER_CONTACT":
      return {
        ...state,
        professionals: state.professionals.map((p) =>
          p.id === action.practitionerId ? { ...p, phone: action.phone, address: action.address } : p,
        ),
      };
    case "SET_PRACTITIONER_STATUS":
      return {
        ...state,
        professionals: state.professionals.map((p) =>
          p.id === action.practitionerId ? { ...p, status: action.status } : p,
        ),
      };
    case "COMPLETE_CONSULTATION": {
      if (action.consultationId) {
        const existing = state.consultations.find((c) => c.id === action.consultationId);
        if (!existing) return state;
        const updated: Consultation = {
          ...existing,
          status: "completed",
          summary: action.summary,
          diagnosis: action.diagnosis,
          prescriptions: action.prescriptions,
          tests: action.tests,
          followUpAppointmentId: action.followUpAppointmentId,
        };
        return {
          ...state,
          consultations: state.consultations.map((c) => (c.id === updated.id ? updated : c)),
          appointments: existing.appointmentId
            ? state.appointments.map((a) =>
                a.id === existing.appointmentId ? { ...a, status: "completed" as const } : a,
              )
            : state.appointments,
        };
      }
      if (action.appointment) {
        const appointment = action.appointment;
        const newConsultation: Consultation = {
          id: generateId("consult"),
          date: appointment.date,
          time: appointment.time,
          professionalId: appointment.professionalId,
          consultationType: appointment.consultationType,
          status: "completed",
          summary: action.summary,
          diagnosis: action.diagnosis,
          prescriptions: action.prescriptions,
          tests: action.tests,
          followUpAppointmentId: action.followUpAppointmentId,
          appointmentId: appointment.id,
        };
        return {
          ...state,
          consultations: [...state.consultations, newConsultation],
          appointments: state.appointments.map((a) =>
            a.id === appointment.id ? { ...a, status: "completed" as const } : a,
          ),
        };
      }
      return state;
    }
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

export interface DoctorAuthResult {
  success: boolean;
  error?: string;
}

export interface OnboardPractitionerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  professionalLevel: ProfessionalLevel;
  clinicianType: ClinicianType;
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

  // --- Doctor Portal ---
  requestDoctorCode: (email: string) => DoctorAuthResult;
  resendDoctorCode: () => DoctorAuthResult;
  verifyDoctorCode: (code: string) => DoctorAuthResult;
  cancelDoctorVerification: () => void;
  doctorLogOut: () => void;
  addAvailabilityRange: (
    practitionerId: string,
    dayOfWeek: number,
    startTime: string,
    endTime: string,
  ) => { success: boolean; error?: string };
  removeAvailabilityRange: (rangeId: string) => { success: boolean; error?: string };
  updatePractitionerContact: (practitionerId: string, phone: string, address: string) => void;
  completeConsultation: (input: {
    consultationId?: string;
    appointment?: Appointment;
    summary: string;
    diagnosis: string | null;
    prescriptions: Prescription[];
    tests: string[];
    followUpAppointmentId: string | null;
  }) => void;
  sendDoctorMessage: (conversationId: string, text: string) => void;
  markConversationReadByProfessional: (conversationId: string) => void;

  // --- HiveCare Admin Portal ---
  hivecareLogIn: (adminName: string) => void;
  hivecareLogOut: () => void;
  onboardPractitioner: (
    input: OnboardPractitionerInput,
  ) => { success: boolean; error?: string; professional?: HealthProfessional };
  setPractitionerStatus: (practitionerId: string, status: PractitionerStatus) => void;
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

  function issueDoctorCode(email: string, practitionerId: string): DoctorAuthResult {
    const code = generateVerificationCode();
    const verificationEmail = newDemoEmail(
      email,
      buildVerificationEmailContent(code),
      "verification",
      generateId("email"),
      new Date().toISOString(),
    );
    dispatch({ type: "REQUEST_DOCTOR_CODE", email, practitionerId, code, verificationEmail });
    return { success: true };
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
          "Hi, I'm the MyCampusDoc AI Health Assistant. I'm not a doctor, but I'll ask you a few questions about what you're experiencing so I can help connect you with the right healthcare professional here at MyCampusDoc. What's going on today?";
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

      // --- Doctor Portal ---
      requestDoctorCode: (email) => {
        const normalized = email.trim().toLowerCase();
        const practitioner = state.professionals.find((p) => p.email.toLowerCase() === normalized);
        if (!practitioner) {
          return {
            success: false,
            error: "No practitioner found with that email. Contact HiveCare if this seems wrong.",
          };
        }
        if (practitioner.status === "inactive") {
          return { success: false, error: "This account is inactive. Contact HiveCare." };
        }
        return issueDoctorCode(practitioner.email, practitioner.id);
      },
      resendDoctorCode: () => {
        const pending = state.pendingDoctorVerification;
        if (!pending) return { success: false, error: "Start over with your email address." };
        return issueDoctorCode(pending.email, pending.practitionerId);
      },
      verifyDoctorCode: (code) => {
        const pending = state.pendingDoctorVerification;
        if (!pending) return { success: false, error: "Start over with your email address." };
        if (code.trim() !== pending.code) {
          return { success: false, error: "Incorrect code. Please try again." };
        }
        dispatch({ type: "VERIFY_DOCTOR_CODE_SUCCESS", practitionerId: pending.practitionerId });
        return { success: true };
      },
      cancelDoctorVerification: () => dispatch({ type: "CANCEL_DOCTOR_VERIFICATION" }),
      doctorLogOut: () => dispatch({ type: "DOCTOR_LOG_OUT" }),
      addAvailabilityRange: (practitionerId, dayOfWeek, startTime, endTime) => {
        if (!isValidRange(startTime, endTime)) {
          return { success: false, error: "End time must be after start time." };
        }
        const overlapsExisting = state.availabilityRanges.some(
          (r) =>
            r.practitionerId === practitionerId &&
            r.dayOfWeek === dayOfWeek &&
            rangesOverlap(startTime, endTime, r.startTime, r.endTime),
        );
        if (overlapsExisting) {
          return { success: false, error: "This overlaps a block you've already set for that day." };
        }
        dispatch({
          type: "ADD_AVAILABILITY_RANGE",
          range: { id: generateId("avail"), practitionerId, dayOfWeek, startTime, endTime },
        });
        return { success: true };
      },
      removeAvailabilityRange: (rangeId) => {
        const range = state.availabilityRanges.find((r) => r.id === rangeId);
        if (!range) return { success: false, error: "That availability block no longer exists." };
        if (
          rangeHasConflict(
            range.practitionerId,
            range.dayOfWeek,
            range.startTime,
            range.endTime,
            state.appointments,
          )
        ) {
          return {
            success: false,
            error: "Can't remove this block — it has a confirmed consultation. Reschedule or cancel that consultation first.",
          };
        }
        dispatch({ type: "REMOVE_AVAILABILITY_RANGE", rangeId });
        return { success: true };
      },
      updatePractitionerContact: (practitionerId, phone, address) =>
        dispatch({ type: "UPDATE_PRACTITIONER_CONTACT", practitionerId, phone, address }),
      completeConsultation: (input) => dispatch({ type: "COMPLETE_CONSULTATION", ...input }),
      sendDoctorMessage: (conversationId, text) => {
        dispatch({ type: "RECEIVE_MESSAGE", conversationId, text });
      },
      markConversationReadByProfessional: (conversationId) =>
        dispatch({ type: "MARK_CONVERSATION_READ_BY_PROFESSIONAL", conversationId }),

      // --- HiveCare Admin Portal ---
      hivecareLogIn: (adminName) =>
        dispatch({ type: "HIVECARE_LOG_IN", adminName: adminName.trim() || "HiveCare Admin" }),
      hivecareLogOut: () => dispatch({ type: "HIVECARE_LOG_OUT" }),
      onboardPractitioner: (input) => {
        const normalizedEmail = input.email.trim().toLowerCase();
        if (state.professionals.some((p) => p.email.toLowerCase() === normalizedEmail)) {
          return { success: false, error: "A practitioner with that email already exists." };
        }
        const now = new Date().toISOString();
        const professional: HealthProfessional = {
          id: generateId("prof"),
          name: `Dr. ${input.firstName} ${input.lastName}`,
          title: PROFESSIONAL_LEVEL_TITLE[input.professionalLevel],
          specialty: CLINICIAN_TYPE_LABELS[input.clinicianType],
          clinicianType: input.clinicianType,
          avatar: `${input.firstName[0] ?? ""}${input.lastName[0] ?? ""}`.toUpperCase(),
          online: false,
          availabilityNote: "Invitation sent — awaiting first login",
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          email: normalizedEmail,
          phone: input.phone.trim(),
          address: input.address.trim(),
          professionalLevel: input.professionalLevel,
          status: "invitation_sent",
          invitedAt: now,
        };
        const email = newDemoEmail(
          professional.email,
          buildOnboardingEmailContent(professional),
          "onboarding",
          generateId("email"),
          now,
        );
        dispatch({ type: "ONBOARD_PRACTITIONER", professional, email });
        return { success: true, professional };
      },
      setPractitionerStatus: (practitionerId, status) =>
        dispatch({ type: "SET_PRACTITIONER_STATUS", practitionerId, status }),
    }),
    // performReply/issueDoctorCode are plain functions redefined every render; their only
    // real dependency (state) is already tracked below, and the setState functions are stable.
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
