"use client";

import { useEffect, useRef, useState } from "react";
import type { Child } from "@/app/_data/children";
import { KidCard } from "@/app/_components/kid-card";

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

const triggerClassName =
  "flex w-full cursor-pointer items-center gap-2 rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-3 text-[15px] font-bold text-ink transition-colors hover:border-[#B3452E] focus:border-[#B3452E] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`ml-auto flex-none transition-transform duration-150 ${open ? "rotate-180" : ""}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B0A290"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface RoomDropdownProps {
  rooms: { id: string; name: string }[];
  selectedRoomId: string;
  onSelect: (roomId: string) => void;
}

function RoomDropdown({ rooms, selectedRoomId, onSelect }: RoomDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedRoom = rooms.find((room) => room.id === selectedRoomId);

  return (
    <div ref={containerRef} className="relative w-full flex-none sm:w-[168px]">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Filtrar por sala"
        onClick={() => setOpen((current) => !current)}
        className={triggerClassName}
      >
        {selectedRoom?.name ?? "Sala"}
        <ChevronIcon open={open} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Salas"
          className="absolute right-0 left-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-[16px] border border-[#ECE0D0] bg-[#FBF4EC] p-1.5 shadow-[0_16px_36px_-16px_rgba(63,54,46,0.28)]"
        >
          {rooms.map((room) => {
            const isSelected = room.id === selectedRoomId;
            return (
              <li key={room.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(room.id);
                    setOpen(false);
                  }}
                  className={`w-full cursor-pointer rounded-[12px] px-3.5 py-2.5 text-left text-[15px] font-bold transition-colors ${
                    isSelected
                      ? "bg-accent-ghost text-accent"
                      : "text-ink hover:bg-[#F4ECE1]"
                  }`}
                >
                  {room.name}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
        <RoomDropdown
          rooms={rooms}
          selectedRoomId={selectedRoomId}
          onSelect={setSelectedRoomId}
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
