import { MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { EmptyState } from "../../components/ui/EmptyState";
import { useApp } from "../../context/AppContext";
import { formatRelativeTimestamp } from "../../lib/format";

type Filter = "all" | "unread" | "read";

export function DoctorMessagesPage() {
  const navigate = useNavigate();
  const { doctorSession, conversations, user } = useApp();
  const practitionerId = doctorSession!.practitionerId;
  const [filter, setFilter] = useState<Filter>("all");

  const myConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.professionalId === practitionerId)
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
    [conversations, practitionerId],
  );

  const filtered = myConversations.filter((c) => {
    if (filter === "unread") return c.unreadByProfessionalCount > 0;
    if (filter === "read") return c.unreadByProfessionalCount === 0;
    return true;
  });

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Messages</h1>
        <p className="text-sm text-ink-500">Conversations with students.</p>
      </div>

      <div className="flex gap-2">
        {(["all", "unread", "read"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={MessageCircle} title="No conversations here" />
      ) : (
        <ul className="flex flex-col divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-white shadow-card">
          {filtered.map((conversation) => {
            const unread = conversation.unreadByProfessionalCount > 0;
            return (
              <li key={conversation.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/doctor/messages/${conversation.id}`)}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-semibold text-ink-900">
                        {user?.fullName ?? "Student"}
                      </p>
                      <span
                        className={clsx(
                          "shrink-0 text-xs",
                          unread ? "font-semibold text-accent-600" : "text-ink-400",
                        )}
                      >
                        {formatRelativeTimestamp(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={clsx(
                          "truncate text-sm",
                          unread ? "font-medium text-ink-800" : "text-ink-500",
                        )}
                      >
                        {conversation.lastMessage}
                      </p>
                      {unread && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-semibold text-white">
                          {conversation.unreadByProfessionalCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
