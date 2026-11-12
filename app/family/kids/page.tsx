import { Suspense } from "react";
import { connection } from "next/server";
import { KidCard } from "@/app/_components/kid-card";
import { fetchFamilyChildren } from "@/app/_data/family-children";
import { fetchSessionUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

function KidsFallback() {
  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[880px] px-10 pb-20 pt-[34px]">
        <div className="mb-[22px] h-[52px] w-full max-w-[280px] animate-pulse rounded-[14px] bg-[#EFE3D5]" />
        <div className="mb-[22px] h-[48px] w-full animate-pulse rounded-[14px] bg-[#EFE3D5]" />
        <div className="h-[120px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
      </div>
    </main>
  );
}

async function FamilyKids() {
  // Excluye el fetch y new Date() (edad) del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const kids = await fetchFamilyChildren(supabase, session?.id ?? "");

  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[880px] px-10 pb-20 pt-[34px]">
        <h1 className="mb-[22px] font-display text-[26px] font-semibold text-ink">
          Mis hijos
        </h1>

        {kids.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1]/60 px-6 py-12 text-center">
            <p className="m-0 font-display text-[18px] font-semibold text-ink">
              Todavía no tenés hijos vinculados…
            </p>
            <p className="m-0 text-[14px] text-muted">
              Cuando la guardería te vincule con tu hijo, va a aparecer acá.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {kids.map((kid) => (
              <KidCard
                key={kid.id}
                child={kid}
                href={`/family/kids/${kid.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function FamilyKidsPage() {
  return (
    <Suspense fallback={<KidsFallback />}>
      <FamilyKids />
    </Suspense>
  );
}
