import { MessageCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatList } from "../components/chat/ChatList";
import { NewChatModal } from "../components/chat/NewChatModal";
import { Header } from "../components/layout/Header";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../context/AppContext";

export function ChatPage() {
  const { conversations, startConversation } = useApp();
  const navigate = useNavigate();
  const [newChatOpen, setNewChatOpen] = useState(false);
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  function handleSelectProfessional(professionalId: string) {
    const conversationId = startConversation(professionalId);
    setNewChatOpen(false);
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
            onClick={() => setNewChatOpen(true)}
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
          description="Once you message a health professional, your conversations will show up here."
          action={
            <button
              type="button"
              onClick={() => setNewChatOpen(true)}
              className="text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Start a new chat
            </button>
          }
        />
      ) : (
        <ChatList conversations={sorted} />
      )}

      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        conversations={conversations}
        onSelectProfessional={handleSelectProfessional}
      />
    </div>
  );
}
