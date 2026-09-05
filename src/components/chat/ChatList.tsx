import { useNavigate } from "react-router-dom";
import { Avatar } from "../ui/Avatar";
import { getConversationPersona } from "../../lib/chatPersona";
import { formatRelativeTimestamp } from "../../lib/format";
import type { Conversation } from "../../types";

interface ChatListProps {
  conversations: Conversation[];
}

export function ChatList({ conversations }: ChatListProps) {
  const navigate = useNavigate();

  return (
    <ul className="flex flex-col divide-y divide-ink-100">
      {conversations.map((conversation) => {
        const professional = getConversationPersona(conversation);
        const unread = conversation.unreadCount > 0;

        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => navigate(`/chat/${conversation.id}`)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink-50 active:bg-ink-100"
            >
              <Avatar
                initials={professional.avatar}
                seed={professional.id}
                size="lg"
                online={professional.online}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold text-ink-900">{professional.name}</p>
                  <span
                    className={
                      unread
                        ? "shrink-0 text-xs font-semibold text-brand-600"
                        : "shrink-0 text-xs text-ink-400"
                    }
                  >
                    {formatRelativeTimestamp(conversation.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={
                      unread
                        ? "truncate text-sm font-medium text-ink-800"
                        : "truncate text-sm text-ink-500"
                    }
                  >
                    {conversation.lastMessage}
                  </p>
                  {unread && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
