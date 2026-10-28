"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Parent,
  ParentRelation,
} from "@/app/_data/children";
import {
  parentStatusLabel,
  parentStatusStyles,
} from "@/app/_data/children";
import { Avatar } from "@/app/_components/avatar";
import Link from "next/link";
import { LinkParentModal } from "@/app/_components/link-parent-modal";

interface ParentsPanelProps {
  parents: Parent[];
  childId: string;
  childName: string;
  canInvite: boolean;
}

const relationLabels: Record<ParentRelation, string> = {
  mother: "Mamá",
  father: "Papá",
  tutor: "Tutor/a",
};

function statusSubtitle(relation: ParentRelation, status: Parent["status"]) {
  if (status === "pending") return "invitación enviada";
  return relation === "mother" ? "activa" : "activo";
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ParentsPanel({
  parents,
  childId,
  childName,
  canInvite,
}: ParentsPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Link
        href="/daily-summary"
        className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-ink p-[13px] text-[15px] font-extrabold text-white"
      >
        <SunIcon />
        Resumen del día
      </Link>

      <div className="rounded-[16px] border border-border bg-surface px-[18px] py-4">
        <div className="mb-3.5 text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
          PADRES VINCULADOS
        </div>
        <div className="flex flex-col gap-3.5">
          {parents.map((parent) => {
            const statusStyle = parentStatusStyles[parent.status];
            return (
              <div key={parent.id} className="flex items-center gap-3">
                <Avatar
                  initial={parent.initial}
                  tone={parent.tone}
                  variant="parent"
                  className="size-10 text-[16px]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-extrabold text-ink">
                    {parent.fullName}
                  </div>
                  <div className="text-[12.5px] text-muted-strong">
                    {relationLabels[parent.relation]} ·{" "}
                    {statusSubtitle(parent.relation, parent.status)}
                  </div>
                </div>
                <span
                  className="flex-none rounded-full px-[9px] py-1 text-[10.5px] font-extrabold"
                  style={{
                    background: statusStyle.background,
                    color: statusStyle.text,
                  }}
                >
                  {parentStatusLabel(parent.relation, parent.status)}
                </span>
              </div>
            );
          })}

          {canInvite && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex cursor-pointer items-center gap-3 pt-2"
            >
              <span className="flex size-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-[#D8CBBA] text-[#B0A290]">
                <PlusIcon />
              </span>
              <span className="text-[14.5px] font-extrabold text-[#B3452E]">
                Vincular otro padre
              </span>
            </button>
          )}
        </div>
      </div>

      {canInvite && (
        <LinkParentModal
          open={open}
          onClose={() => setOpen(false)}
          onSuccess={() => router.refresh()}
          childId={childId}
          childName={childName}
        />
      )}
    </>
  );
}
