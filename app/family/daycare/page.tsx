import { Suspense } from "react";
import { connection } from "next/server";
import { DaycareInfo } from "@/app/_components/daycare-info";
import { fetchDaycareInfo } from "@/app/_data/daycare";
import { fetchSessionUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

function DaycareFallback() {
  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[880px] px-10 pb-20 pt-[34px]">
        <div className="mb-[22px] h-[52px] w-full max-w-[280px] animate-pulse rounded-[14px] bg-[#EFE3D5]" />
        <div className="h-[220px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
        <div className="mt-[18px] h-[170px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
      </div>
    </main>
  );
}

async function FamilyDaycare() {
  // Excluye el fetch del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const info = session ? await fetchDaycareInfo(supabase, session.id) : null;

  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[880px] px-10 pb-20 pt-[34px]">
        <h1 className="mb-[22px] font-display text-[26px] font-semibold text-ink">
          Guardería
        </h1>

        {info ? (
          <DaycareInfo info={info} />
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1]/60 px-6 py-12 text-center">
            <p className="m-0 font-display text-[18px] font-semibold text-ink">
              No pudimos cargar la información de la guardería.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

export default function FamilyDaycarePage() {
  return (
    <Suspense fallback={<DaycareFallback />}>
      <FamilyDaycare />
    </Suspense>
  );
}
