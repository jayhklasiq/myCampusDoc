import clsx from "clsx";
import { formatMessageTime } from "../../lib/format";
import type { Message } from "../../types";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isStudent = message.sender === "student";

  return (
    <div className={clsx("flex", isStudent ? "justify-end" : "justify-start")}>
      <div className={clsx("flex max-w-[78%] flex-col gap-1", isStudent ? "items-end" : "items-start")}>
        <div
          className={clsx(
            "animate-slide-up rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words whitespace-pre-line",
            isStudent
              ? "rounded-br-md bg-brand-600 text-white"
              : "rounded-bl-md bg-white text-ink-800 shadow-card",
          )}
        >
          {message.text}
        </div>
        <span className="px-1 text-[11px] text-ink-400">{formatMessageTime(message.timestamp)}</span>
      </div>
    </div>
  );
}
