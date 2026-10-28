import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/app/_components/sidebar";
import { fetchSessionUser, toSidebarUser } from "@/app/_data/session";
import type { SidebarRoom } from "@/app/_data/feed";

interface AppSidebarProps {
  room: SidebarRoom;
  activeHref: string;
}

export async function AppSidebar({ room, activeHref }: AppSidebarProps) {
  // Excluye el fetch de sesión del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  return (
    <Sidebar
      user={toSidebarUser(session)}
      room={room}
      activeHref={activeHref}
    />
  );
}

// Placeholder de la sidebar mientras resuelve el fetch de sesión.
export function SidebarFallback() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 h-14 border-b border-border bg-surface lg:hidden" />
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none border-r border-border bg-surface lg:block" />
    </>
  );
}
