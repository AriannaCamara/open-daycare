"use client";

import { useState } from "react";
import type { Child } from "@/app/_data/children";
import { mapChildRow, type ChildRow } from "@/app/_data/child-mapper";
import { createClient } from "@/utils/supabase/client";
import { KidsDirectory } from "@/app/_components/kids-directory";
import {
  AddChildModal,
  type AddChildValues,
} from "@/app/_components/add-child-modal";

interface KidsViewProps {
  initialKids: Child[];
  rooms: { id: string; name: string }[];
  canAddChild: boolean;
}

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

export function KidsView({ initialKids, rooms, canAddChild }: KidsViewProps) {
  const [kids, setKids] = useState<Child[]>(initialKids);
  const [open, setOpen] = useState(false);

  async function handleSave(values: AddChildValues): Promise<boolean> {
    const supabase = createClient();
    const allergies = values.allergies.trim();
    const medicalNotes = values.medicalNotes.trim();

    const { data, error } = await supabase
      .from("children")
      .insert({
        full_name: values.fullName.trim(),
        birth_date: values.birthDate,
        room_id: values.roomId,
        enrolled_at: new Date().toISOString().slice(0, 10),
        medical_notes: medicalNotes || null,
        allergy_tags: allergies ? [allergies] : [],
      })
      .select("id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, rooms(name)")
      .single();

    if (error || !data) {
      return false;
    }

    setKids((current) => [
      ...current,
      mapChildRow(data as unknown as ChildRow, current.length),
    ]);
    setOpen(false);
    return true;
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
        {canAddChild && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-none cursor-pointer items-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.7)]"
          >
            <PlusIcon />
            Agregar niño
          </button>
        )}
      </div>

      <KidsDirectory kids={kids} rooms={rooms} />

      <AddChildModal
        open={open}
        rooms={rooms}
        onClose={() => setOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
