import { Phone, Send, Video } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { MessageBubble } from "../components/chat/MessageBubble";
import { HealthProfessionalCard } from "../components/professionals/HealthProfessionalCard";
import { useApp } from "../context/AppContext";
import { getProfessional } from "../data";

export function ChatConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { conversations, messages, sendMessage, markConversationRead, setPendingConsultation } =
    useApp();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const professional = conversation ? getProfessional(conversation.professionalId) : undefined;

  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages, conversationId],
  );

  useEffect(() => {
    if (conversationId) markConversationRead(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  if (!conversation || !professional) {
    return <Navigate to="/chat" replace />;
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !conversationId) return;
    sendMessage(conversationId, text);
    setDraft("");
  }

  function startConsultationScheduling(type: "audio" | "video") {
    const label = type === "video" ? "Schedule Video Consultation" : "Schedule Audio Consultation";
    setPendingConsultation(type, label, professional!.id);
    navigate("/schedule");
  }

  return (
    <div className="flex h-dvh flex-col bg-ink-50">
      <Header
        title={professional.name}
        subtitle={professional.online ? "Online now" : professional.availabilityNote}
        showBack
        onBack={() => navigate("/chat")}
        right={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => startConsultationScheduling("audio")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-brand-600 transition-colors hover:bg-brand-50 active:bg-brand-100"
              aria-label="Schedule an audio consultation"
              title="Schedule an audio consultation"
            >
              <Phone className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => startConsultationScheduling("video")}
              className="flex h-9 w-9 items-center justify-center rounded-full text-brand-600 transition-colors hover:bg-brand-50 active:bg-brand-100"
              aria-label="Schedule a video consultation"
              title="Schedule a video consultation"
            >
              <Video className="h-5 w-5" />
            </button>
          </div>
        }
      />
      <HealthProfessionalCard professional={professional} />

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {thread.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="safe-bottom border-t border-ink-100 bg-white px-3 py-3"
      >
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-400"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
