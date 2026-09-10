import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DoctorShell } from "./components/layout/DoctorShell";
import { HivecareShell } from "./components/layout/HivecareShell";
import { LoadingState } from "./components/ui/LoadingState";
import { AppProvider, useApp } from "./context/AppContext";
import {
  DoctorLoginGate,
  HivecareLoginGate,
  LoginGate,
  PaymentGate,
  RequireDoctorAuth,
  RequireHivecareAuth,
  RequireSubscription,
  SignUpGate,
} from "./routes/guards";
import { ChatConversationPage } from "./pages/ChatConversationPage";
import { ChatPage } from "./pages/ChatPage";
import { DevEmailInboxPage } from "./pages/DevEmailInboxPage";
import { HistoryDetailPage } from "./pages/HistoryDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";
import { PaymentPage } from "./pages/PaymentPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SchedulePage } from "./pages/SchedulePage";
import { SignUpPage } from "./pages/SignUpPage";
import { DoctorAvailabilityPage } from "./pages/doctor/DoctorAvailabilityPage";
import { DoctorCalendarPage } from "./pages/doctor/DoctorCalendarPage";
import { DoctorConsultationDetailPage } from "./pages/doctor/DoctorConsultationDetailPage";
import { DoctorConsultationsPage } from "./pages/doctor/DoctorConsultationsPage";
import { DoctorConversationPage } from "./pages/doctor/DoctorConversationPage";
import { DoctorDashboardPage } from "./pages/doctor/DoctorDashboardPage";
import { DoctorLoginPage } from "./pages/doctor/DoctorLoginPage";
import { DoctorMessagesPage } from "./pages/doctor/DoctorMessagesPage";
import { DoctorProfilePage } from "./pages/doctor/DoctorProfilePage";
import { HivecareConsultationsPage } from "./pages/hivecare/HivecareConsultationsPage";
import { HivecareDashboardPage } from "./pages/hivecare/HivecareDashboardPage";
import { HivecareLoginPage } from "./pages/hivecare/HivecareLoginPage";
import { OnboardPractitionerPage } from "./pages/hivecare/OnboardPractitionerPage";
import { PractitionerDetailPage } from "./pages/hivecare/PractitionerDetailPage";
import { PractitionersListPage } from "./pages/hivecare/PractitionersListPage";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

/** Sends a visitor wherever their current auth/account/subscription state implies they belong. */
function RootRedirect() {
  const { isAuthenticated, hasActiveSubscription, hasAccount } = useApp();
  if (isAuthenticated && hasActiveSubscription) return <Navigate to="/profile" replace />;
  if (isAuthenticated && !hasActiveSubscription) return <Navigate to="/payment" replace />;
  if (hasAccount) return <Navigate to="/login" replace />;
  return <Navigate to="/signup" replace />;
}

function AppRoutes() {
  const { isHydrated } = useApp();

  // Restoring a saved session from localStorage resolves just after mount. Rendering
  // the routes before then would let a guard judge an already-logged-in student as
  // signed out and bounce them to /signup, so hold a beat until state is known.
  if (!isHydrated) {
    return <LoadingState fullScreen label="Loading MyCampusDoc..." />;
  }

  return (
    <Routes>
      <Route index element={<RootRedirect />} />
      <Route
        path="/signup"
        element={
          <SignUpGate>
            <SignUpPage />
          </SignUpGate>
        }
      />
      <Route
        path="/login"
        element={
          <LoginGate>
            <LoginPage />
          </LoginGate>
        }
      />
      <Route
        path="/payment"
        element={
          <PaymentGate>
            <PaymentPage />
          </PaymentGate>
        }
      />
      <Route
        element={
          <RequireSubscription>
            <AppShell />
          </RequireSubscription>
        }
      >
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/schedule" element={<SchedulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route
        path="/chat/:conversationId"
        element={
          <RequireSubscription>
            <ChatConversationPage />
          </RequireSubscription>
        }
      />
      <Route
        path="/history/:consultationId"
        element={
          <RequireSubscription>
            <HistoryDetailPage />
          </RequireSubscription>
        }
      />
      {/* Dev-only tool for inspecting simulated onboarding/verification emails
          (PART 19) — intentionally outside any role guard. */}
      <Route path="/dev/emails" element={<DevEmailInboxPage />} />

      {/* Doctor Portal — independent auth/session from the student flow above
          (see routes/guards.tsx RequireDoctorAuth). */}
      <Route
        path="/doctor/login"
        element={
          <DoctorLoginGate>
            <DoctorLoginPage />
          </DoctorLoginGate>
        }
      />
      <Route
        element={
          <RequireDoctorAuth>
            <DoctorShell />
          </RequireDoctorAuth>
        }
      >
        <Route path="/doctor/dashboard" element={<DoctorDashboardPage />} />
        <Route path="/doctor/calendar" element={<DoctorCalendarPage />} />
        <Route path="/doctor/availability" element={<DoctorAvailabilityPage />} />
        <Route path="/doctor/consultations" element={<DoctorConsultationsPage />} />
        <Route path="/doctor/consultations/:id" element={<DoctorConsultationDetailPage />} />
        <Route path="/doctor/messages" element={<DoctorMessagesPage />} />
        <Route path="/doctor/profile" element={<DoctorProfilePage />} />
      </Route>
      <Route
        path="/doctor/messages/:conversationId"
        element={
          <RequireDoctorAuth>
            <DoctorConversationPage />
          </RequireDoctorAuth>
        }
      />

      {/* HiveCare Admin Portal — separate demo-only admin session. */}
      <Route
        path="/hivecare/login"
        element={
          <HivecareLoginGate>
            <HivecareLoginPage />
          </HivecareLoginGate>
        }
      />
      <Route
        element={
          <RequireHivecareAuth>
            <HivecareShell />
          </RequireHivecareAuth>
        }
      >
        <Route path="/hivecare/dashboard" element={<HivecareDashboardPage />} />
        <Route path="/hivecare/practitioners" element={<PractitionersListPage />} />
        <Route path="/hivecare/practitioners/:practitionerId" element={<PractitionerDetailPage />} />
        <Route path="/hivecare/onboard" element={<OnboardPractitionerPage />} />
        <Route path="/hivecare/consultations" element={<HivecareConsultationsPage />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
