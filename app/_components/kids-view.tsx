"use client";

import { useState } from "react";
import {
  avatarToneStyles,
  type AvatarTone,
  type Child,
} from "@/app/_data/children";
import { room } from "@/app/_data/feed";
import { KidsDirectory } from "@/app/_components/kids-directory";
import {
  AddChildModal,
  type AddChildValues,
} from "@/app/_components/add-child-modal";

interface KidsViewProps {
  initialKids: Child[];
}

const monthLabels = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const toneKeys = Object.keys(avatarToneStyles) as AvatarTone[];

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function uniqueId(base: string, existing: Child[]): string {
  if (!existing.some((child) => child.id === base)) {
    return base;
  }
  let suffix = 2;
  while (existing.some((child) => child.id === `${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function calculateAge(birthDate: string): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

function formatBirthDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${monthLabels[month - 1]} ${year}`;
}

function currentAdmissionLabel(): string {
  const now = new Date();
  return `${monthLabels[now.getMonth()]} ${now.getFullYear()}`;
}

function buildChild(values: AddChildValues, existing: Child[]): Child {
  const fullName = values.fullName.trim();
  const allergies = values.allergies.trim();
  const medicalNotes = values.medicalNotes.trim();

  return {
    id: uniqueId(slugify(fullName), existing),
    fullName,
    ageYears: calculateAge(values.birthDate),
    roomName: values.roomName,
    initial: fullName.charAt(0).toUpperCase(),
    tone: toneKeys[existing.length % toneKeys.length],
    allergyLabel: allergies ? allergies.toUpperCase() : undefined,
    allergiesNote: medicalNotes || undefined,
    birthDateLabel: formatBirthDate(values.birthDate),
    admissionLabel: currentAdmissionLabel(),
    parents: [],
  };
}

export function KidsView({ initialKids }: KidsViewProps) {
  const [kids, setKids] = useState<Child[]>(initialKids);
  const [open, setOpen] = useState(false);

  function handleSave(values: AddChildValues) {
    setKids((current) => [...current, buildChild(values, current)]);
    setOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-[880px] px-10 pb-20 pt-[34px]">
      <div className="mb-[22px] flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
            GESTIÓN
          </div>
          <h1 className="m-0 font-display text-[30px] font-semibold text-ink">
            Niños
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-none cursor-pointer items-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.7)]"
        >
          <PlusIcon />
          Agregar niño
        </button>
      </div>

      <KidsDirectory
        kids={kids}
        separator={
          <div className="mb-3.5 flex items-center gap-3">
            <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-ink">
              {room.roomName.toUpperCase()}
            </span>
            <span className="text-[13px] text-muted-strong">
              {kids.length} niños
            </span>
            <span className="h-px flex-1 bg-divider" />
          </div>
        }
      />

      <AddChildModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
