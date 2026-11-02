"use client";

import { createPost, updatePost, type PostInput } from "@/app/_actions/posts";
import { avatarToneStyles } from "@/app/_data/children";
import {
  postKindStyles,
  type EditablePost,
  type PillChild,
  type PostKind,
  type PostPhoto,
  type RoomOption,
} from "@/app/_data/feed";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";

type ModalMode = "create" | "edit";

// Se monta por apertura ({open && …} en FeedView): el estado nace con el
// prefill (edición) o limpio (creación) y se descarta al cerrar.
interface CreatePostModalProps {
  mode: ModalMode;
  initialPost?: EditablePost;
  // "childPills" y no "children": React reserva ese nombre para el contenido.
  childPills: PillChild[];
  rooms: RoomOption[];
  onClose: () => void;
  onSaved: () => void;
}

interface NewPhoto {
  file: File;
  previewUrl: string;
}

interface FieldErrors {
  kind?: string;
  body?: string;
  audience?: string;
  photos?: string;
}

const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_PHOTOS_ERROR = "Máximo 5 fotos.";
const PHOTO_SIZE_ERROR = "Cada foto debe pesar menos de 5 MB.";
const PHOTO_TYPE_ERROR = "Formatos permitidos: JPG, PNG o WebP.";

const kindOrder: { kind: PostKind; label: string }[] = [
  { kind: "meal", label: "Comida" },
  { kind: "nap", label: "Siesta" },
  { kind: "activity", label: "Actividad" },
  { kind: "achievement", label: "Logro" },
  { kind: "mood", label: "Ánimo" },
  { kind: "photo", label: "Foto" },
  { kind: "announcement", label: "Anuncio" },
];

const sectionLabelClassName =
  "mb-2.5 text-[12px] font-extrabold tracking-[0.7px] text-muted-strong";

const childPillClassName =
  "flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 text-[14px] font-bold";

const errorTextClassName = "mb-[22px] mt-1 text-[13px] font-semibold text-[#B3452E]";

const activePillClassName = "border-[#3F362E] bg-[#3F362E] text-white";

const inactivePillClassName = "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]";

const selectClassName =
  "mb-[22px] w-full cursor-pointer appearance-none rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-3.5 text-[15px] font-bold text-ink focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]";

export function CreatePostModal({
  mode,
  initialPost,
  childPills,
  rooms,
  onClose,
  onSaved,
}: CreatePostModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialPost?.childIds ?? [],
  );
  const [roomPill, setRoomPill] = useState(
    initialPost ? initialPost.childIds.length === 0 : false,
  );
  const [roomId, setRoomId] = useState<string | null>(
    initialPost?.roomId ?? rooms[0]?.id ?? null,
  );
  const [kind, setKind] = useState<PostKind | null>(initialPost?.kind ?? null);
  const [body, setBody] = useState(initialPost?.body ?? "");
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [keptPhotos, setKeptPhotos] = useState<PostPhoto[]>(
    initialPost?.photos ?? [],
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Anuncio: siempre "toda la sala" (sin niños etiquetados); conserva la sala.
  const forcedRoomPill = kind === "announcement";
  const effectiveRoomPill = roomPill || forcedRoomPill;

  // Las objectURL de las miniaturas viven mientras la foto sigue en la lista;
  // al desmontar (cierre del modal, que se monta por apertura) se revoca todo.
  const livePreviewUrls = newPhotos.map((photo) => photo.previewUrl);
  const previousPreviewUrls = useRef<string[]>(livePreviewUrls);

  useEffect(() => {
    const previous = new Set(previousPreviewUrls.current);
    const live = new Set(livePreviewUrls);
    previousPreviewUrls.current = livePreviewUrls;

    return () => {
      previous.forEach((url) => {
        if (!live.has(url)) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [livePreviewUrls]);

  useEffect(() => {
    return () => {
      previousPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function clearError(field: keyof FieldErrors) {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function toggleChild(childId: string) {
    if (forcedRoomPill) {
      return;
    }
    clearError("audience");
    setRoomPill(false);
    setSelectedIds((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId],
    );
  }

  function toggleRoomPill() {
    if (forcedRoomPill) {
      return;
    }
    clearError("audience");
    setRoomPill((current) => {
      if (!current) {
        setSelectedIds([]);
      }
      return !current;
    });
  }

  function handleBodyChange(event: ChangeEvent<HTMLTextAreaElement>) {
    clearError("body");
    setBody(event.target.value);
  }

  function handlePhotosChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    const totalKept = keptPhotos.length + newPhotos.length;
    let error: string | null = null;

    if (totalKept + files.length > MAX_PHOTOS) {
      error = MAX_PHOTOS_ERROR;
    } else if (files.some((file) => file.size > MAX_PHOTO_BYTES)) {
      error = PHOTO_SIZE_ERROR;
    } else if (files.some((file) => !ALLOWED_MIME_TYPES.includes(file.type))) {
      error = PHOTO_TYPE_ERROR;
    }

    if (error) {
      setErrors((current) => ({ ...current, photos: error }));
      return;
    }

    clearError("photos");
    setNewPhotos((current) => [
      ...current,
      ...files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeNewPhoto(previewUrl: string) {
    setNewPhotos((current) =>
      current.filter((photo) => photo.previewUrl !== previewUrl),
    );
  }

  // En edición: quitar una foto existente significa no conservarla (el action
  // borra su fila y su archivo del bucket).
  function removeKeptPhoto(photoId: string) {
    setKeptPhotos((current) => current.filter((photo) => photo.id !== photoId));
  }

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    if (!kind) {
      nextErrors.kind = "Elegí un tipo.";
    }
    if (!body.trim()) {
      nextErrors.body = "Escribí una descripción.";
    }
    const needsAudience = kind !== "announcement";
    if (needsAudience && selectedIds.length === 0 && !roomPill) {
      nextErrors.audience = "Elegí al menos un niño o Toda la sala.";
    }
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0 || !kind) {
      return;
    }

    setSubmitting(true);
    try {
      const input: PostInput = {
        kind,
        body: body.trim(),
        roomId,
        childIds: effectiveRoomPill ? [] : selectedIds,
      };
      const photoFiles = newPhotos.map((photo) => photo.file);

      const result =
        mode === "edit" && initialPost
          ? await updatePost(
              initialPost.id,
              input,
              photoFiles,
              keptPhotos.map((photo) => photo.id),
            )
          : await createPost(input, photoFiles);

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  const isEdit = mode === "edit";
  const busyLabel = isEdit ? "Guardando…" : "Publicando…";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(63,54,46,0.45)] px-6 py-10"
      onClick={onClose}
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="cursor-pointer text-[15px] font-bold text-muted-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <span className="font-display text-[18px] font-semibold text-ink">
            {isEdit ? "Editar publicación" : "Nueva publicación"}
          </span>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer text-[15px] font-extrabold text-[#D9583C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? busyLabel : isEdit ? "Guardar" : "Publicar"}
          </button>
        </div>

        <div className="px-[26px] py-6">
          {submitError && (
            <p className="mb-[22px] text-[13px] font-semibold text-[#B3452E]">
              {submitError}
            </p>
          )}

          <div className={sectionLabelClassName}>PARA</div>
          <div
            className={`flex flex-wrap gap-[9px] ${errors.audience ? "" : "mb-[22px]"}`}
          >
            {childPills.map((child) => {
              const tone = avatarToneStyles[child.avatarTone];
              const isActive = selectedIds.includes(child.id);
              return (
                <button
                  key={child.id}
                  type="button"
                  disabled={forcedRoomPill}
                  onClick={() => toggleChild(child.id)}
                  className={`${childPillClassName} ${isActive ? activePillClassName : inactivePillClassName} ${forcedRoomPill ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span
                    className="flex size-[26px] items-center justify-center rounded-full font-display text-[13px] font-semibold"
                    style={{ backgroundColor: tone.background, color: tone.text }}
                  >
                    {child.fullName.charAt(0)}
                  </span>
                  {child.fullName}
                </button>
              );
            })}
            <button
              type="button"
              disabled={forcedRoomPill}
              onClick={toggleRoomPill}
              className={`${childPillClassName} ${effectiveRoomPill ? activePillClassName : inactivePillClassName} px-4 ${forcedRoomPill ? "cursor-not-allowed" : ""}`}
            >
              Toda la sala
            </button>
          </div>
          {errors.audience && (
            <p className={errorTextClassName}>{errors.audience}</p>
          )}

          <div className={sectionLabelClassName}>SALA</div>
          <select
            value={roomId ?? ""}
            onChange={(event) => setRoomId(event.target.value || null)}
            className={selectClassName}
          >
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
            <option value="">Toda la guardería</option>
          </select>

          <div className={sectionLabelClassName}>TIPO</div>
          <div
            className={`flex flex-wrap gap-[9px] ${errors.kind ? "" : "mb-[22px]"}`}
          >
            {kindOrder.map(({ kind: option, label }) => {
              const style = postKindStyles[option].solid;
              const isActive = kind === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    clearError("kind");
                    setKind(option);
                  }}
                  className={`cursor-pointer rounded-full border-none px-4 py-2 text-[13.5px] font-extrabold ${isActive ? "shadow-[0_0_0_2px_#3F362E]" : ""}`}
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {errors.kind && <p className={errorTextClassName}>{errors.kind}</p>}

          <div className={sectionLabelClassName}>DESCRIPCIÓN</div>
          <textarea
            placeholder="Contá cómo le fue hoy…"
            value={body}
            onChange={handleBodyChange}
            className={`min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] leading-[1.5] text-ink placeholder:text-[#7E7264] focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E] ${errors.body ? "border-[#D9583C]" : "border-[#EADFD0]"} ${errors.body ? "" : "mb-[22px]"}`}
          />
          {errors.body && (
            <p className={errorTextClassName}>{errors.body}</p>
          )}

          <div className={sectionLabelClassName}>FOTOS</div>
          <div className="flex flex-wrap gap-3">
            {keptPhotos.map((photo) => (
              <div key={photo.id} className="relative size-24">
                <img
                  src={photo.url}
                  alt="Foto de la publicación"
                  className="size-24 rounded-[14px] border border-[#ECE0D0] object-cover"
                />
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => removeKeptPhoto(photo.id)}
                  className="absolute -right-2 -top-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-[#ECE0D0] bg-white text-[#B3452E] shadow-sm"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {newPhotos.map((photo) => (
              <div key={photo.previewUrl} className="relative size-24">
                <img
                  src={photo.previewUrl}
                  alt="Foto seleccionada"
                  className="size-24 rounded-[14px] border border-[#ECE0D0] object-cover"
                />
                <button
                  type="button"
                  aria-label="Quitar foto"
                  onClick={() => removeNewPhoto(photo.previewUrl)}
                  className="absolute -right-2 -top-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-[#ECE0D0] bg-white text-[#B3452E] shadow-sm"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <label className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotosChange}
              />
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B3452E"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[12px]">Agregar</span>
            </label>
          </div>
          {errors.photos && (
            <p className={`${errorTextClassName} mt-2.5`}>{errors.photos}</p>
          )}
        </div>
      </form>
    </div>
  );
}
