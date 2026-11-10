import { Suspense } from "react";
import { connection } from "next/server";
import { FeedView } from "@/app/_components/feed-view";
import { fetchFeedSummary, room } from "@/app/_data/feed";
import { fetchPosts } from "@/app/_data/posts";
import { fetchSessionUser, toSidebarUser } from "@/app/_data/session";
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

// Feed de solo lectura: sin CTA de publicar ni opciones del modal (mismo
// camino que sigue un parent hoy). El feed visual de familia es otro cambio.
async function FamilyFeed() {
  // Excluye el fetch de sesión del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const [summary, initialPosts] = await Promise.all([
    fetchFeedSummary(supabase),
    fetchPosts(supabase, session?.id ?? ""),
  ]);

  return (
    <FeedView
      user={toSidebarUser(session)}
      room={{ ...room, ...summary }}
      initialPosts={initialPosts}
      canPublish={false}
      childPills={[]}
      rooms={[]}
    />
  );
}

export default function FamilyPage() {
  return (
    <Suspense fallback={<FeedFallback />}>
      <FamilyFeed />
    </Suspense>
  );
}
