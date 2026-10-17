"use client";

import { avatarToneStyles, children } from "@/app/_data/children";
import { postKindStyles, type PostKind } from "@/app/_data/feed";
import { useState } from "react";

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

export function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [room, setRoom] = useState(false);
  const [kind, setKind] = useState<PostKind | null>(null);

  const forcedRoom = kind === "announcement";
  const effectiveRoom = room || forcedRoom;

  if (!open) {
    return null;
  }

  function toggleChild(childId: string) {
    if (forcedRoom) {
      return;
    }
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
    setRoom((current) => {
      if (!current) {
        setSelectedIds([]);
      }
      return !current;
    });
  }

  const activePillClassName = "border-[#3F362E] bg-[#3F362E] text-white";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(63,54,46,0.45)] px-6 py-10"
      onClick={onClose}
    >
      <form
        noValidate
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[580px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[15px] font-bold text-muted-strong"
          >
            Cancelar
          </button>
          <span className="font-display text-[18px] font-semibold text-ink">
            Nueva publicación
          </span>
          <button
            type="button"
            className="cursor-pointer text-[15px] font-extrabold text-[#D9583C]"
          >
            Publicar
          </button>
        </div>

        <div className="px-[26px] py-6">
          <div className={sectionLabelClassName}>PARA</div>
          <div className="mb-[22px] flex flex-wrap gap-[9px]">
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

          <div className={sectionLabelClassName}>TIPO</div>
          <div className="mb-[22px] flex flex-wrap gap-[9px]">
            {kindOrder.map(({ kind: option, label }) => {
              const style = postKindStyles[option].solid;
              const isActive = kind === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  className={`cursor-pointer rounded-full border-none px-4 py-2 text-[13.5px] font-extrabold ${isActive ? "shadow-[0_0_0_2px_#3F362E]" : ""}`}
                  style={{ backgroundColor: style.bg, color: style.text }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className={sectionLabelClassName}>DESCRIPCIÓN</div>
          <textarea
            placeholder="Contá cómo le fue hoy…"
            className="mb-[22px] min-h-[120px] w-full resize-y rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-3.5 text-[15px] leading-[1.5] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A]"
          />

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
