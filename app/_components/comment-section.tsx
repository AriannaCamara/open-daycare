import { avatarToneStyles, type AvatarTone } from "@/app/_data/children";
import type { Comment } from "@/app/_data/feed";
import type { ActionResult } from "@/app/_actions/engagement";
import { COMMENT_EMPTY_ERROR } from "@/app/_actions/errors";
import { containsProfanity, PROFANITY_ERROR } from "@/utils/profanity";
import { useState, type FormEvent } from "react";

const toneKeys = Object.keys(avatarToneStyles) as AvatarTone[];

interface CommentSectionProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment?: (body: string) => Promise<ActionResult | null>;
  onUpdateComment?: (
    commentId: string,
    body: string,
  ) => Promise<ActionResult | null>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

// Pre-checks instantáneos (UX, sin llamar a la action): la DB es la autoridad.
function validateComment(body: string): string | null {
  if (!body) return COMMENT_EMPTY_ERROR;
  if (containsProfanity(body)) return PROFANITY_ERROR;
  return null;
}

function SendIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

const inputClassName =
  "min-w-0 flex-1 rounded-[14px] border-[1.5px] border-border bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B]";

const linkButtonClassName =
  "cursor-pointer border-none bg-transparent p-0 text-[13px] font-extrabold text-[#B3452E]";

// Sección expandible bajo el post (SPEC 17): lista completa de comentarios
// (autor, hora, cuerpo) con contador real, formulario de escritura y CRUD de
// comentarios propios (editar/borrar).
export function CommentSection({
  comments,
  currentUserId,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: CommentSectionProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !onAddComment) return;

    const body = value.trim();
    const validationError = validateComment(body);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await onAddComment(body);
      if (!result) return; // operación en vuelo: conserva el texto
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Éxito: input limpio, sección sigue abierta (router.refresh trae la lista).
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(comment: Comment) {
    setEditingId(comment.id);
    setEditValue(comment.body);
    setEditError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditValue("");
    setEditError(null);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editSubmitting || !onUpdateComment || !editingId) return;

    const body = editValue.trim();
    const validationError = validateComment(body);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setEditSubmitting(true);
    setEditError(null);

    try {
      const result = await onUpdateComment(editingId, body);
      if (!result) return; // operación en vuelo: conserva el modo edición
      if (!result.ok) {
        setEditError(result.error);
        return;
      }
      cancelEditing();
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="mt-3.5 border-t border-line pt-3.5">
      <div className="mb-3 text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
        COMENTARIOS · {comments.length}
      </div>

      <div className="flex flex-col gap-3.5">
        {comments.map((comment, index) => {
          const tone = avatarToneStyles[toneKeys[index % toneKeys.length]];
          const isOwn = comment.authorId === currentUserId;
          const isEditing = comment.id === editingId;

          return (
            <div key={comment.id} className="group flex items-start gap-3">
              <div
                className="flex size-[38px] flex-none items-center justify-center rounded-full font-display text-[15px] font-semibold"
                style={{ background: tone.background, color: tone.text }}
              >
                {comment.authorName.charAt(0)}
              </div>
              <div className="flex-1 rounded-[14px] border border-border bg-surface px-[15px] py-3">
                <div className="mb-[3px] flex items-baseline gap-2">
                  <span className="text-[14px] font-extrabold text-ink">
                    {comment.authorName}
                  </span>
                  <span className="flex-1" />
                  <span className="text-[12px] text-muted-strong">
                    {comment.time}
                  </span>
                  {isOwn && (
                    <span className="flex items-baseline gap-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => startEditing(comment)}
                        className={linkButtonClassName}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteComment?.(comment.id)}
                        className={linkButtonClassName}
                      >
                        Borrar
                      </button>
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSave} className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(event) => setEditValue(event.target.value)}
                      aria-label="Editar comentario"
                      autoFocus
                      className={inputClassName}
                    />
                    {editError && (
                      <p className="m-0 text-[13px] font-semibold text-[#B3452E]">
                        {editError}
                      </p>
                    )}
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="cursor-pointer rounded-[12px] border border-border bg-white px-3 py-1.5 text-[13px] font-bold text-muted-strong"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        className="cursor-pointer rounded-[12px] border-none bg-[#B3452E] px-3 py-1.5 text-[13px] font-extrabold text-white disabled:opacity-60"
                      >
                        Guardar
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="m-0 text-[14.5px] leading-[1.45] text-ink-soft">
                    {comment.body}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-3.5 flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Escribí un comentario…"
          aria-label="Comentario"
          className={inputClassName}
        />
        <button
          type="submit"
          disabled={submitting}
          aria-label="Enviar comentario"
          className="flex size-[46px] flex-none cursor-pointer items-center justify-center rounded-[14px] border-none bg-[linear-gradient(180deg,#F4977E,#EE8164)] text-white disabled:opacity-60"
        >
          <SendIcon />
        </button>
      </form>

      {error && (
        <p className="mt-2 text-[13px] font-semibold text-[#B3452E]">{error}</p>
      )}
    </div>
  );
}
