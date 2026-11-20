import { Suspense } from "react";
import { connection } from "next/server";
import { FamilyFeedView } from "@/app/_components/family-feed-view";
import { fetchFamilyChildren } from "@/app/_data/family-children";
import { fetchFeedSummary } from "@/app/_data/feed";
import { fetchPosts } from "@/app/_data/posts";
import { fetchSessionUser, toSidebarUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

// Mismo esqueleto que la vista familiar: cabecera + pills + tarjeta.
function FeedFallback() {
  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-[34px]">
        <div className="mb-5 h-[88px] animate-pulse rounded-[16px] bg-[#EFE3D5]" />
        <div className="mb-[22px] h-[38px] animate-pulse rounded-full bg-[#EFE3D5]" />
        <div className="mb-3.5 h-[18px] w-[240px] animate-pulse rounded-[8px] bg-[#EFE3D5]" />
        <div className="h-[240px] animate-pulse rounded-[18px] bg-[#EFE3D5]" />
      </div>
    </main>
  );
}

// Vista familiar de solo lectura (SPEC 24): cabecera personalizada, filtro de
// posts por hijo y tarjetas con engagement. Sin CTA de publicar.
async function FamilyFeed() {
  // Excluye el fetch de sesión del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const [summary, initialPosts, familyChildren] = await Promise.all([
    fetchFeedSummary(supabase),
    fetchPosts(supabase, session?.id ?? ""),
    fetchFamilyChildren(supabase, session?.id ?? ""),
  ]);

  return (
    <FamilyFeedView
      user={toSidebarUser(session)}
      dateLabel={summary.dateLabel}
      initialPosts={initialPosts}
      familyChildren={familyChildren}
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
