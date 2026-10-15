import type { Child } from "@/app/_data/children";
import { Avatar } from "@/app/_components/avatar";
import Link from "next/link";

interface KidCardProps {
  child: Child;
}

function ChevronIcon() {
  return (
    <svg
      className="flex-none"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#CBB89F"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function parentsLabel(count: number): string {
  if (count === 0) return "sin padres vinculados";
  if (count === 1) return "1 padre vinculado";
  return `${count} padres vinculados`;
}

export function KidCard({ child }: KidCardProps) {
  return (
    <Link
      href={`/kids/${child.id}`}
      className="flex min-w-0 items-center gap-3.5 rounded-[18px] border border-border bg-surface p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,0.5)] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#F2A78E]"
    >
      <Avatar initial={child.initial} tone={child.tone} variant="child" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[16px] font-semibold text-ink">
          {child.fullName}
        </div>
        <div className="text-[13px] text-muted-strong">
          {child.ageYears} años · {parentsLabel(child.parents.length)}
        </div>
      </div>
      {child.allergyLabel ? (
        <span className="flex-none rounded-full bg-[#FBD8CC] px-[9px] py-[5px] text-[11px] font-extrabold text-[#D9684A]">
          {child.allergyLabel}
        </span>
      ) : child.parents.length === 0 ? (
        <span className="flex-none rounded-full bg-[#F9D2DE] px-[9px] py-[5px] text-[11px] font-extrabold text-[#C56486]">
          VINCULAR
        </span>
      ) : (
        <ChevronIcon />
      )}
    </Link>
  );
}
