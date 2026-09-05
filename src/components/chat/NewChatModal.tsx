import { Badge } from "../ui/Badge";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";
import { professionals } from "../../data";
import type { Conversation } from "../../types";

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  conversations: Conversation[];
  onSelectProfessional: (professionalId: string) => void;
}

export function NewChatModal({
  open,
  onClose,
  conversations,
  onSelectProfessional,
}: NewChatModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Start a new chat">
      <p className="mb-4 text-sm text-ink-500">
        Choose a health professional to message.
      </p>
      <ul className="flex flex-col divide-y divide-ink-100">
        {professionals.map((professional) => {
          const alreadyChatting = conversations.some(
            (c) => c.professionalId === professional.id,
          );
          return (
            <li key={professional.id}>
              <button
                type="button"
                onClick={() => onSelectProfessional(professional.id)}
                className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-ink-50 active:bg-ink-100"
              >
                <Avatar
                  initials={professional.avatar}
                  seed={professional.id}
                  size="md"
                  online={professional.online}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">
                    {professional.name}, {professional.title}
                  </p>
                  <p className="truncate text-xs text-ink-500">{professional.specialty}</p>
                </div>
                {alreadyChatting && (
                  <Badge tone="neutral" className="shrink-0">
                    Continue chat
                  </Badge>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
