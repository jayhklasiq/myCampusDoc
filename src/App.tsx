import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AppProvider } from "./context/AppContext";
import { PaymentGate, RequireSubscription, SignUpGate } from "./routes/guards";
import { ChatConversationPage } from "./pages/ChatConversationPage";
import { ChatPage } from "./pages/ChatPage";
import { HistoryDetailPage } from "./pages/HistoryDetailPage";
import { HistoryPage } from "./pages/HistoryPage";
import { PaymentPage } from "./pages/PaymentPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SchedulePage } from "./pages/SchedulePage";
import { SignUpPage } from "./pages/SignUpPage";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route index element={<Navigate to="/signup" replace />} />
          <Route
            path="/signup"
            element={
              <SignUpGate>
                <SignUpPage />
              </SignUpGate>
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
          <Route path="*" element={<Navigate to="/signup" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
