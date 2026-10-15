"use client";

import { useState, type ReactNode } from "react";
import type { Child } from "@/app/_data/children";
import { KidCard } from "@/app/_components/kid-card";

interface KidsDirectoryProps {
  kids: Child[];
  separator?: ReactNode;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function SearchIcon() {
  return (
    <svg
      className="flex-none"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B0A290"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function KidsDirectory({ kids, separator }: KidsDirectoryProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query);
  const filtered = kids.filter((kid) =>
    normalize(kid.fullName).includes(normalizedQuery),
  );

  return (
    <>
      <div className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-border bg-surface px-4 py-3">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar niño…"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#B6A99B]"
        />
      </div>

      {separator}

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
          {filtered.map((kid) => (
            <KidCard key={kid.id} child={kid} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1]/60 px-6 py-12 text-center">
          <p className="m-0 font-display text-[18px] font-semibold text-ink">
            Sin resultados
          </p>
          <p className="m-0 text-[14px] text-muted">
            No hay niños que coincidan con “{query}”.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-2 rounded-[12px] border border-border bg-surface px-4 py-2 text-[13.5px] font-bold text-[#C5503A] transition-colors hover:border-[#F2A78E]"
          >
            Limpiar búsqueda
          </button>
        </div>
      )}
    </>
  );
}
