"use client";

import { useState } from "react";
import type { Child } from "@/app/_data/children";
import { KidCard } from "@/app/_components/kid-card";
import { SelectDropdown } from "@/app/_components/select-dropdown";

interface KidsDirectoryProps {
  kids: Child[];
  rooms: { id: string; name: string }[];
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

export function KidsDirectory({ kids, rooms }: KidsDirectoryProps) {
  const [query, setQuery] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(
    () => rooms.find((room) => room.name === "Soles")?.id ?? rooms[0]?.id ?? "",
  );

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);
  const normalizedQuery = normalize(query);
  const roomKids = kids.filter((kid) => kid.roomName === selectedRoom?.name);
  const filtered = roomKids.filter((kid) =>
    normalize(kid.fullName).includes(normalizedQuery),
  );

  return (
    <>
      <div className="mb-[22px] flex flex-col gap-[11px] sm:flex-row sm:items-stretch">
        <div className="flex min-w-0 flex-1 items-center gap-[11px] rounded-[14px] border border-border bg-surface px-4 py-3">
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar niño…"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-[#7E7264]"
          />
        </div>
        <SelectDropdown
          options={rooms.map((room) => ({ id: room.id, label: room.name }))}
          value={selectedRoomId}
          onChange={setSelectedRoomId}
          ariaLabel="Filtrar por sala"
          placeholder="Sala"
        />
      </div>

      {kids.length === 0 && (
        <div className="mb-2 flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1]/60 px-6 py-12 text-center">
          <p className="m-0 font-display text-[18px] font-semibold text-ink">
            Todavía no hay niños…
          </p>
          <p className="m-0 text-[14px] text-muted">
            Agregá el primer niño con el botón “Agregar niño”.
          </p>
        </div>
      )}

      {kids.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1]/60 px-6 py-12 text-center">
          <p className="m-0 font-display text-[18px] font-semibold text-ink">
            {query ? "Sin resultados" : `No hay niños en ${selectedRoom?.name}`}
          </p>
          <p className="m-0 text-[14px] text-muted">
            {query
              ? `No hay niños que coincidan con “${query}”.`
              : "Elegí otra sala o agregá el primero."}
          </p>
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 rounded-[12px] border border-border bg-surface px-4 py-2 text-[13.5px] font-bold text-[#B3452E] transition-colors hover:border-[#B3452E]"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2">
          {filtered.map((kid) => (
            <KidCard key={kid.id} child={kid} />
          ))}
        </div>
      )}
    </>
  );
}
