"use client";

import { avatarToneStyles, children } from "@/app/_data/children";
import { postKindStyles, type PostKind } from "@/app/_data/feed";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";

export interface NewPostValues {
  kind: PostKind;
  givenNames: string[];
  body: string;
  photoUrls: string[];
}

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onPublish: (values: NewPostValues) => void;
}

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

interface FieldErrors {
  kind?: string;
  body?: string;
  audience?: string;
}

const errorTextClassName = "mb-[22px] mt-1 text-[13px] font-semibold text-[#C5503A]";

export function CreatePostModal({
  open,
  onClose,
  onPublish,
}: CreatePostModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [room, setRoom] = useState(false);
  const [kind, setKind] = useState<PostKind | null>(null);
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const forcedRoom = kind === "announcement";
  const effectiveRoom = room || forcedRoom;

  function reset() {
    setSelectedIds([]);
    setRoom(false);
    setKind(null);
    setBody("");
    setErrors({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose]);

  if (!open) {
    return null;
  }

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
    if (forcedRoom) {
      return;
    }
    clearError("audience");
    setRoom(false);
    setSelectedIds((current) =>
      current.includes(childId)
        ? current.filter((id) => id !== childId)
        : [...current, childId],
    );
  }

  function toggleRoom() {
    if (forcedRoom) {
      return;
    }
    clearError("audience");
    setRoom((current) => {
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

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    if (!kind) {
      nextErrors.kind = "Elegí un tipo.";
    }
    if (!body.trim()) {
      nextErrors.body = "Escribí una descripción.";
    }
    if (selectedIds.length === 0 && !effectiveRoom) {
      nextErrors.audience = "Elegí al menos un niño o Toda la sala.";
    }
    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !kind) {
      return;
    }
    const givenNames = children
      .filter((child) => selectedIds.includes(child.id))
      .map((child) => child.fullName.split(" ")[0]);
    onPublish({ kind, givenNames, body: body.trim(), photoUrls: [] });
    reset();
  }

  const activePillClassName = "border-[#3F362E] bg-[#3F362E] text-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(63,54,46,0.45)] px-6 py-10"
      onClick={handleClose}
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
            onClick={handleClose}
            className="cursor-pointer text-[15px] font-bold text-muted-strong"
          >
            Cancelar
          </button>
          <span className="font-display text-[18px] font-semibold text-ink">
            Nueva publicación
          </span>
          <button
            type="submit"
            className="cursor-pointer text-[15px] font-extrabold text-[#D9583C]"
          >
            Publicar
          </button>
        </div>

        <div className="px-[26px] py-6">
          <div className={sectionLabelClassName}>PARA</div>
          <div
            className={`flex flex-wrap gap-[9px] ${errors.audience ? "" : "mb-[22px]"}`}
          >
            {children.map((child) => {
              const tone = avatarToneStyles[child.tone];
              const isActive = selectedIds.includes(child.id);
              return (
                <button
                  key={child.id}
                  type="button"
                  disabled={forcedRoom}
                  onClick={() => toggleChild(child.id)}
                  className={`${childPillClassName} ${isActive ? activePillClassName : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]"} ${forcedRoom ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span
                    className="flex size-[26px] items-center justify-center rounded-full font-display text-[13px] font-semibold"
                    style={{ backgroundColor: tone.background, color: tone.text }}
                  >
                    {child.initial}
                  </span>
                  {child.fullName.split(" ")[0]}
                </button>
              );
            })}
            <button
              type="button"
              disabled={forcedRoom}
              onClick={toggleRoom}
              className={`${childPillClassName} ${effectiveRoom ? activePillClassName : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]"} px-4 ${forcedRoom ? "cursor-not-allowed" : ""}`}
            >
              Toda la sala
            </button>
          </div>
          {errors.audience && (
            <p className={errorTextClassName}>{errors.audience}</p>
          )}

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
            className={`min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-[15px] leading-[1.5] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A] ${errors.body ? "border-[#D9583C]" : "border-[#EADFD0]"} ${errors.body ? "" : "mb-[22px]"}`}
          />
          {errors.body && (
            <p className={errorTextClassName}>{errors.body}</p>
          )}

          <div className={sectionLabelClassName}>FOTOS</div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="flex size-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C5503A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[12px]">Agregar</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
