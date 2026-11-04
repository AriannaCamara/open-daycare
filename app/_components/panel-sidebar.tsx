import { Suspense } from "react";
import { connection } from "next/server";
import { Sidebar } from "@/app/_components/sidebar";
import { fetchSessionUser, toSidebarUser } from "@/app/_data/session";
import type { SidebarRoom } from "@/app/_data/feed";
import { createClient } from "@/utils/supabase/server";

interface PanelSidebarProps {
  panel: "staff" | "family";
  // Subtítulo del panel staff; el panel familia muestra "Familia".
  room?: SidebarRoom;
}

async function SidebarWithSession({ panel, room }: PanelSidebarProps) {
  // Excluye el fetch de sesión del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  return <Sidebar user={toSidebarUser(session)} panel={panel} room={room} />;
}

// Shell del panel: sidebar con sesión + children (la página renderiza su <main>).
export function PanelSidebar(props: PanelSidebarProps) {
  return (
    <Suspense
      fallback={
        <>
          <div className="fixed inset-x-0 top-0 z-30 h-14 border-b border-border bg-surface lg:hidden" />
          <aside className="sticky top-0 hidden h-screen w-[248px] flex-none border-r border-border bg-surface lg:block" />
        </>
      }
    >
      <SidebarWithSession {...props} />
    </Suspense>
  );
}
