import { Suspense } from "react";
import { connection } from "next/server";
import { AnnouncementsView } from "@/app/_components/announcements-view";
import { fetchAnnouncements } from "@/app/_data/announcements";
import { createClient } from "@/utils/supabase/server";

const PAGE_SIZE = 20;

function AnnouncementsFallback() {
  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[680px] px-10 pb-20 pt-[34px]">
        <div className="mb-[22px] h-[52px] w-full max-w-[280px] animate-pulse rounded-[14px] bg-[#EFE3D5]" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-[76px] w-full animate-pulse rounded-[16px] bg-[#EFE3D5]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

async function AnnouncementsWithSession() {
  // Excluye el fetch del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const { events, hasMore } = await fetchAnnouncements(supabase, 0, PAGE_SIZE);

  return <AnnouncementsView initialEvents={events} initialHasMore={hasMore} />;
}

export default function AnnouncementsPage() {
  return (
    <Suspense fallback={<AnnouncementsFallback />}>
      <AnnouncementsWithSession />
    </Suspense>
  );
}
