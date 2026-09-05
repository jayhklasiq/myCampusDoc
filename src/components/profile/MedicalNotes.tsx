import { NotebookPen, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal } from "../ui/Modal";
import { useApp } from "../../context/AppContext";
import { formatDateShort } from "../../lib/format";
import type { MedicalNote } from "../../types";

export function MedicalNotes() {
  const { medicalNotes, addMedicalNote, updateMedicalNote } = useApp();
  const [editingNote, setEditingNote] = useState<MedicalNote | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function openForAdd() {
    setEditingNote(null);
    setDraft("");
    setModalOpen(true);
  }

  function openForEdit(note: MedicalNote) {
    setEditingNote(note);
    setDraft(note.text);
    setModalOpen(true);
  }

  function handleSave() {
    const text = draft.trim();
    if (!text) return;
    if (editingNote) {
      updateMedicalNote(editingNote.id, text);
    } else {
      addMedicalNote(text);
    }
    setModalOpen(false);
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink-800">Medical Notes</h2>
          <p className="text-xs text-ink-500">Private notes only you can see</p>
        </div>
        <Button size="sm" variant="secondary" onClick={openForAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add note
        </Button>
      </div>

      {medicalNotes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No medical notes yet"
          description="Add details like allergies, ongoing conditions, or medications so professionals have context during your consultations."
          action={
            <Button size="sm" onClick={openForAdd}>
              Add your first note
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {medicalNotes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-ink-100 bg-white p-3.5 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-800">
                  {note.text}
                </p>
                <button
                  type="button"
                  onClick={() => openForEdit(note)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
                  aria-label="Edit note"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-[11px] text-ink-400">
                Updated {formatDateShort(note.updatedAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingNote ? "Edit medical note" : "Add medical note"}
      >
        <textarea
          rows={4}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='e.g. "History of asthma. Allergic to penicillin."'
          className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <Button size="lg" fullWidth className="mt-4" onClick={handleSave} disabled={!draft.trim()}>
          Save note
        </Button>
      </Modal>
    </section>
  );
}
