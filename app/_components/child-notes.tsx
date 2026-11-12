"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addChildNote,
  deleteChildNote,
  updateChildNote,
} from "@/app/_actions/child-profile";
import { NOTE_EMPTY_ERROR } from "@/app/_actions/errors";
import type { ChildNote } from "@/app/_data/family-children";
import { NotesBlock } from "./child-profile-blocks";

interface ChildNotesProps {
  childId: string;
  notes: ChildNote[];
}

const labelClassName =
  "mb-2 block text-[12px] font-bold tracking-[0.7px] text-muted";
const inputClassName =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#7E7264] focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]";
const errorTextClassName = "mt-1 text-[13px] font-semibold text-[#B3452E]";
const smallButtonClassName =
  "cursor-pointer rounded-[10px] border border-border bg-surface px-3 py-1.5 text-[12.5px] font-bold text-[#6E6359] transition-colors hover:border-[#F2A78E]";

// CRUD de aclaraciones: alta con validación inline (sin llamar a la action),
// edición inline por nota y borrado con confirmación (patrón SPEC 16).
export function ChildNotes({ childId, notes }: ChildNotesProps) {
  const router = useRouter();

  const [draft, setDraft] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [pendingDelete, setPendingDelete] = useState<ChildNote | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Validación inline: no se invoca la action con el cuerpo vacío.
    if (!draft.trim()) {
      setAddError(NOTE_EMPTY_ERROR);
      return;
    }

    setSaving(true);
    setAddError(null);
    const result = await addChildNote(childId, draft);
    setSaving(false);

    if (!result.ok) {
      setAddError(result.error);
      return;
    }

    setDraft("");
    router.refresh();
  }

  function startEdit(note: ChildNote) {
    setEditingId(note.id);
    setEditingDraft(note.body);
    setEditError(null);
  }

  async function handleUpdate(noteId: string) {
    if (!editingDraft.trim()) {
      setEditError(NOTE_EMPTY_ERROR);
      return;
    }

    setSaving(true);
    setEditError(null);
    const result = await updateChildNote(noteId, editingDraft);
    setSaving(false);

    if (!result.ok) {
      setEditError(result.error);
      return;
    }

    setEditingId(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!pendingDelete) return;

    setDeleting(true);
    setDeleteError(null);
    const result = await deleteChildNote(pendingDelete.id);
    setDeleting(false);

    if (!result.ok) {
      setDeleteError(result.error);
      return;
    }

    setPendingDelete(null);
    router.refresh();
  }

  return (
    <NotesBlock
      notes={notes}
      renderNoteBody={(note, defaultBody) =>
        editingId === note.id ? (
          <div className="flex w-full flex-col gap-2">
            <textarea
              value={editingDraft}
              onChange={(event) => {
                setEditingDraft(event.target.value);
                setEditError(null);
              }}
              aria-label="Editar aclaración"
              className={`${inputClassName} min-h-[70px] resize-y leading-[1.5]`}
            />
            {editError && (
              <p className={`${errorTextClassName} m-0`}>{editError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className={smallButtonClassName}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleUpdate(note.id)}
                disabled={saving}
                className={smallButtonClassName}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        ) : (
          defaultBody
        )
      }
      renderNoteActions={(note) =>
        editingId === note.id ? null : (
          <div className="flex flex-none gap-2">
            <button
              type="button"
              onClick={() => startEdit(note)}
              className={smallButtonClassName}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setPendingDelete(note);
              }}
              className={smallButtonClassName}
            >
              Borrar
            </button>
          </div>
        )
      }
    >
      <form
        noValidate
        onSubmit={handleAdd}
        className="border-t border-line px-[18px] py-[15px]"
      >
        <label className={labelClassName} htmlFor="new-child-note">
          AGREGAR ACLARACIÓN
        </label>
        <textarea
          id="new-child-note"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setAddError(null);
          }}
          placeholder="Ej. Martina llegó con sueño temprano."
          className={`${inputClassName} min-h-[70px] resize-y leading-[1.5]`}
        />
        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {addError && (
              <p className={`${errorTextClassName} m-0`}>{addError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="flex-none cursor-pointer rounded-[12px] border-[1.5px] border-[#B3452E] bg-white px-4 py-2 text-[13.5px] font-extrabold text-[#B3452E] transition-colors hover:bg-[#B3452E] hover:text-white disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </form>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(63,54,46,0.45)] px-6"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] p-[26px] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="m-0 font-display text-[19px] font-semibold text-ink">
              ¿Borrar la aclaración?
            </h2>
            <p className="mb-[22px] mt-2 text-[14.5px] leading-[1.5] text-muted-strong">
              Se eliminará y no se puede deshacer.
            </p>
            {deleteError && (
              <p className={`${errorTextClassName} -mt-3 mb-3`}>{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="cursor-pointer rounded-[12px] border border-[#ECE0D0] bg-white px-4 py-2.5 text-[14px] font-bold text-muted-strong"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="cursor-pointer rounded-[12px] border-none bg-[#B3452E] px-4 py-2.5 text-[14px] font-extrabold text-white disabled:opacity-60"
              >
                {deleting ? "Borrando…" : "Borrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotesBlock>
  );
}
