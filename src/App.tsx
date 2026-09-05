import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { LoadingState } from "./components/ui/LoadingState";
import { AppProvider, useApp } from "./context/AppContext";
import { LoginGate, PaymentGate, RequireSubscription, SignUpGate } from "./routes/guards";
import { ChatConversationPage } from "./pages/ChatConversationPage";
import { ChatPage } from "./pages/ChatPage";
import { HistoryDetailPage } from "./pages/HistoryDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { LoginPage } from "./pages/LoginPage";
import { PaymentPage } from "./pages/PaymentPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SchedulePage } from "./pages/SchedulePage";
import { SignUpPage } from "./pages/SignUpPage";

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
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
