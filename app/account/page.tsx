import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AccountView } from "@/app/_components/account-view";
import { PanelSidebar } from "@/app/_components/panel-sidebar";
import { room } from "@/app/_data/feed";
import { fetchFamilyChildren, type FamilyChild } from "@/app/_data/family-children";
import {
  fetchSessionUser,
  isStaffRole,
  roleLabel,
} from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

function AccountFallback() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 h-14 border-b border-border bg-surface lg:hidden" />
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none border-r border-border bg-surface lg:block" />
      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-[680px] px-10 pb-20 pt-[34px]">
          <div className="mb-[22px] h-[46px] w-[240px] animate-pulse rounded-[10px] bg-[#EFE3D5]" />
          <div className="mb-[18px] h-[104px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
          <div className="mb-[18px] h-[130px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
          <div className="h-[120px] w-full animate-pulse rounded-[18px] bg-[#EFE3D5]" />
        </div>
      </main>
    </>
  );
}

// "Mateo Fernández y Sofía Méndez" → "Familia de Mateo y Sofía" (primeros
// nombres: users no tiene relación de parentesco ni género).
function familySubtitle(children: FamilyChild[]): string {
  if (children.length === 0) return "";

  const firstNames = children.map((child) => child.fullName.split(" ")[0]);
  const names =
    firstNames.length === 1
      ? firstNames[0]
      : `${firstNames.slice(0, -1).join(", ")} y ${firstNames[firstNames.length - 1]}`;

  return `Familia de ${names}`;
}

async function Account() {
  // Excluye los fetch del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  // El proxy ya exige sesión para /account; si se perdió, volver al login.
  if (!session) redirect("/login");

  const panel = isStaffRole(session.role) ? "staff" : "family";

  const [{ data: { user } }, { data: prefs }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("users")
      .select("notify_on_post, daily_summary_enabled")
      .eq("id", session.id)
      .maybeSingle(),
  ]);

  // Mis hijos es sección solo del panel familia (SPEC 16/18).
  const children =
    panel === "family" ? await fetchFamilyChildren(supabase, session.id) : [];

  const subtitle =
    panel === "staff" ? roleLabel(session.role) : familySubtitle(children);

  return (
    <>
      <PanelSidebar panel={panel} room={panel === "staff" ? room : undefined} />
      <AccountView
        panel={panel}
        name={session.fullName ?? ""}
        email={user?.email ?? null}
        subtitle={subtitle}
        notifyOnPost={prefs?.notify_on_post ?? false}
        dailySummaryEnabled={prefs?.daily_summary_enabled ?? false}
        familyChildren={children}
      />
    </>
  );
}

export default function AccountPage() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Suspense fallback={<AccountFallback />}>
        <Account />
      </Suspense>
    </div>
  );
}
