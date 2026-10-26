import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { KidsView } from "@/app/_components/kids-view";
import { mapChildRow, type ChildRow } from "@/app/_data/child-mapper";
import { fetchSessionUser, isStaffRole } from "@/app/_data/session";

const CHILD_SELECT =
  "id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, rooms(name)";

export async function KidsViewServer() {
  // Excluye el fetch y new Date() (edad) del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();

  const [session, roomsRes, kidsRes] = await Promise.all([
    fetchSessionUser(supabase),
    supabase.from("rooms").select("id, name").order("name"),
    supabase
      .from("children")
      .select(CHILD_SELECT)
      .eq("status", "active")
      .order("full_name"),
  ]);

  const rooms = (roomsRes.data ?? []) as { id: string; name: string }[];
  const kids = ((kidsRes.data ?? []) as unknown as ChildRow[]).map(mapChildRow);

  return (
    <KidsView
      initialKids={kids}
      rooms={rooms}
      canAddChild={isStaffRole(session?.role ?? null)}
    />
  );
}
