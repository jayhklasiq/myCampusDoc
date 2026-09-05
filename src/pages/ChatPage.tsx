import { MessageCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChatList } from "../components/chat/ChatList";
import { Header } from "../components/layout/Header";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../context/AppContext";

export function ChatPage() {
  const { conversations, startAIIntake } = useApp();
  const navigate = useNavigate();
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  // "New Chat" always starts with the AI health assistant, never a doctor
  // directly — it triages first and routes to a clinician once it knows
  // enough (see ChatConversationPage for the rest of that workflow).
  function handleNewChat() {
    const conversationId = startAIIntake();
    navigate(`/chat/${conversationId}`);
  }

  return (
    <div className="animate-fade-in">
      <Header
        title="Chat"
        subtitle="Your conversations with health professionals"
        right={
          <button
            type="button"
            onClick={handleNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-full text-brand-600 transition-colors hover:bg-brand-50 active:bg-brand-100"
            aria-label="Start a new chat"
            title="Start a new chat"
          >
            <Plus className="h-5 w-5" />
          </button>
        }
      />
      {sorted.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Start a new chat with the MyCampusDoc AI health assistant to get connected with the right professional."
          action={
            <button
              type="button"
              onClick={handleNewChat}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Start a new chat
            </button>
          }
        />
      ) : (
        <ChatList conversations={sorted} />
      )}
    </div>
  );
}
