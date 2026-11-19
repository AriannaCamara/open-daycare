import { Suspense } from "react";
import { connection } from "next/server";
import {
  DailySummaryView,
  type DailySummaryEntry,
} from "@/app/_components/daily-summary-view";
import { getDailyMoments, getDailySummary } from "@/app/_data/daily-summary";
import { fetchFamilyChildren } from "@/app/_data/family-children";
import { fetchSessionUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

function DailySummaryFallback() {
  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[700px] px-10 pb-20 pt-[34px]">
        <div className="mb-[22px] h-[44px] w-full max-w-[340px] animate-pulse rounded-full bg-[#EFE3D5]" />
        <div className="mb-[22px] h-[150px] w-full animate-pulse rounded-[22px] bg-[#EFE3D5]" />
        <div className="mb-[18px] h-[124px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
        <div className="h-[100px] w-full animate-pulse rounded-[16px] bg-[#EFE3D5]" />
      </div>
    </main>
  );
}

// "martes, 17 de junio" → "martes 17 de junio" (formato de la referencia).
function formatTodayLabel(): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date())
    .replace(/,/g, "");
}

// Vista solo-lectura del resumen de hoy: resumen + momentos por cada hijo
// vinculado (la pestaña la elige el cliente, sin searchParams).
async function FamilyDailySummary() {
  // Excluye el fetch y new Date() del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const children = await fetchFamilyChildren(supabase, session?.id ?? "");

  const entries: DailySummaryEntry[] = await Promise.all(
    children.map(async (child) => {
      const [summary, moments] = await Promise.all([
        getDailySummary(supabase, child.id),
        getDailyMoments(supabase, child.id),
      ]);
      return { child, summary, moments };
    }),
  );

  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[700px] px-10 pb-20 pt-[34px]">
        <DailySummaryView entries={entries} dateLabel={formatTodayLabel()} />
      </div>
    </main>
  );
}

export default function FamilyDailySummaryPage() {
  return (
    <Suspense fallback={<DailySummaryFallback />}>
      <FamilyDailySummary />
    </Suspense>
  );
}
