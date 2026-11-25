"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { loadMoreAnnouncements } from "@/app/_actions/announcements";
import type { AnnouncementEvent } from "@/app/_data/announcements";

interface AnnouncementsViewProps {
  initialEvents: AnnouncementEvent[];
  initialHasMore: boolean;
}

// Tonos de la referencia (avisos.dc.html): comentario lila, activación verde,
// reacción coral. El initial va en Fredoka como los avatares del feed.
const kindStyles: Record<
  AnnouncementEvent["kind"],
  { background: string; color: string }
> = {
  comment: { background: "#C9B6E8", color: "#FFFFFF" },
  activation: { background: "#CFEBD8", color: "#3E9B6C" },
  reaction: { background: "#FBD8CC", color: "#D9684A" },
};

function CheckIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function initialFromName(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

// Copy de la referencia: «{nombre} comentó en la publicación de {niño}.».
// El nombre va en <b> (la referencia lo pone en negrita). Sin niño etiquetado
// (post de sala o RLS ocultando el embed) se usa «en una publicación»,
// como documenta la tabla de riesgos de la spec.
function buildMessage(event: AnnouncementEvent): ReactNode {
  const name = event.actorName || "Alguien";

  let rest: string;
  switch (event.kind) {
    case "comment":
      rest = event.childName
        ? `comentó en la publicación de ${event.childName}.`
        : "comentó en una publicación.";
      break;
    case "reaction":
      rest = event.childName
        ? `reaccionó a la publicación de ${event.childName}.`
        : "reaccionó a una publicación.";
      break;
    case "activation":
      rest = `activó su cuenta y ya sigue a${
        event.childName ? ` ${event.childName}` : " un niño"
      }.`;
  }

  return (
    <>
      <b>{name}</b> {rest}
    </>
  );
}

function EventAvatar({ event }: { event: AnnouncementEvent }) {
  const style = kindStyles[event.kind];

  return (
    <div
      className="flex size-10 flex-none items-center justify-center rounded-full font-display text-[16px] font-semibold"
      style={{ background: style.background, color: style.color }}
      aria-hidden
    >
      {event.kind === "comment"
        ? initialFromName(event.actorName)
        : event.kind === "activation"
          ? <CheckIcon />
          : <HeartIcon />}
    </div>
  );
}

export function AnnouncementsView({
  initialEvents,
  initialHasMore,
}: AnnouncementsViewProps) {
  const [events, setEvents] = useState<AnnouncementEvent[]>(initialEvents);
  const [hasMore, setHasMore] = useState(initialHasMore);
  // Mismo patrón que el feed: el flag descarta dobles clics en "Cargar más".
  const loading = useRef(false);

  async function handleLoadMore(): Promise<void> {
    if (loading.current) return;
    loading.current = true;
    try {
      const page = await loadMoreAnnouncements(events.length);
      setEvents((current) => [...current, ...page.events]);
      setHasMore(page.hasMore);
    } finally {
      loading.current = false;
    }
  }

  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[680px] px-10 pb-20 pt-[34px]">
        <div className="mb-[22px]">
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
            ACTIVIDAD
          </div>
          <h1 className="m-0 font-display text-[30px] font-semibold text-ink">
            Avisos
          </h1>
        </div>

        {events.length === 0 ? (
          <p className="m-0 text-[14.5px] text-muted">
            Todavía no hay avisos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => {
              const card = (
                <>
                  <EventAvatar event={event} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] text-ink-soft">
                      {buildMessage(event)}
                    </div>
                    <div className="mt-[3px] text-[12.5px] text-[#A89A8B]">
                      {event.timeLabel}
                    </div>
                  </div>
                </>
              );

              return event.postId ? (
                <Link
                  key={event.id}
                  href={`/posts/${event.postId}`}
                  className="flex items-start gap-[13px] rounded-[16px] border border-border bg-surface px-[18px] py-4"
                >
                  {card}
                </Link>
              ) : (
                <div
                  key={event.id}
                  className="flex items-start gap-[13px] rounded-[16px] border border-border bg-surface px-[18px] py-4"
                >
                  {card}
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <button
            type="button"
            onClick={handleLoadMore}
            className="mt-5 w-full cursor-pointer rounded-[14px] border border-border bg-surface px-4 py-3 text-[14.5px] font-bold text-[#6E6359]"
          >
            Cargar más
          </button>
        )}
      </div>
    </main>
  );
}
