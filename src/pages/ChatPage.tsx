import { MessageCircle } from "lucide-react";
import { ChatList } from "../components/chat/ChatList";
import { Header } from "../components/layout/Header";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../context/AppContext";

export function ChatPage() {
  const { conversations } = useApp();
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );

  return (
    <div className="animate-fade-in">
      <Header title="Chat" subtitle="Your conversations with health professionals" />
      {sorted.length === 0 ? (
        <EmptyState
          icon={MessageCircle}
          title="No conversations yet"
          description="Once you message a health professional, your conversations will show up here."
        />
      ) : (
        <ChatList conversations={sorted} />
      )}
    </div>
  );
}
