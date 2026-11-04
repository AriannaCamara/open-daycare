import { Suspense } from "react";
import { connection } from "next/server";
import { FeedView } from "@/app/_components/feed-view";
import { fetchFeedSummary, room } from "@/app/_data/feed";
import {
  fetchPostOptions,
  fetchPosts,
  type PostOptions,
} from "@/app/_data/posts";
import {
  fetchSessionUser,
  isStaffRole,
  toSidebarUser,
} from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

function FeedFallback() {
  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-[34px]">
        <div className="mb-6 h-[92px] animate-pulse rounded-[16px] bg-[#EFE3D5]" />
        <div className="mb-6 h-[64px] animate-pulse rounded-[18px] bg-[#EFE3D5]" />
        <div className="h-[240px] animate-pulse rounded-[18px] bg-[#EFE3D5]" />
      </div>
    </main>
  );
}

async function FeedWithSession() {
  // Excluye el fetch de sesión del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const canPublish = isStaffRole(session?.role ?? null);

  // Opciones del modal (pills + salas) solo para staff: el feed de familias es
  // de solo lectura.
  const [summary, initialPosts, options] = await Promise.all([
    fetchFeedSummary(supabase),
    fetchPosts(supabase),
    canPublish
      ? fetchPostOptions(supabase)
      : Promise.resolve({ children: [], rooms: [] } satisfies PostOptions),
  ]);

  return (
    <FeedView
      user={toSidebarUser(session)}
      room={{ ...room, ...summary }}
      initialPosts={initialPosts}
      canPublish={canPublish}
      childPills={options.children}
      rooms={options.rooms}
    />
  );
}

export default function StaffFeedPage() {
  return (
    <Suspense fallback={<FeedFallback />}>
      <FeedWithSession />
    </Suspense>
  );
}
