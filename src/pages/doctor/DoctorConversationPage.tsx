import { Send } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { useApp } from "../../context/AppContext";

export function DoctorConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { doctorSession, conversations, messages, user, sendDoctorMessage, markConversationReadByProfessional } =
    useApp();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find(
    (c) => c.id === conversationId && c.professionalId === doctorSession!.practitionerId,
  );

  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [messages, conversationId],
  );

  useEffect(() => {
    if (conversationId) markConversationReadByProfessional(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  if (!conversation) {
    return <Navigate to="/doctor/messages" replace />;
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !conversationId) return;
    sendDoctorMessage(conversationId, text);
    setDraft("");
  }

  return (
    <div className="animate-fade-in -m-4 flex h-[calc(100dvh-6.5rem)] flex-col sm:m-0 sm:h-[calc(100dvh-9.5rem)]">
      <div className="flex items-center gap-2 border-b border-ink-100 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => navigate("/doctor/messages")}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
          aria-label="Back to messages"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold text-ink-900">{user?.fullName ?? "Student"}</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-ink-50 px-4 py-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {thread.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSend} className="border-t border-ink-100 bg-white px-3 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message to your patient..."
            className="flex-1 rounded-full border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-500/20"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white transition-colors hover:bg-accent-600 disabled:bg-ink-200 disabled:text-ink-400"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
