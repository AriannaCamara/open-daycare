"use server";

import { fetchAnnouncements } from "@/app/_data/announcements";
import { createClient } from "@/utils/supabase/server";

export interface LoadMoreAnnouncementsResult {
  events: Awaited<ReturnType<typeof fetchAnnouncements>>["events"];
  hasMore: boolean;
}

const PAGE_SIZE = 20;

// Siguiente página de avisos (mismo fetch que la ruta, offset creciente).
// Sin guarda de rol extra: el guard del proxy en /staff/* ya exige sesión
// staff y la RLS acota los datos (SPEC 27, alcance "sin schema nuevo").
export async function loadMoreAnnouncements(
  offset: number,
): Promise<LoadMoreAnnouncementsResult> {
  const supabase = await createClient();
  const safeOffset = Number.isInteger(offset) && offset > 0 ? offset : 0;
  const page = await fetchAnnouncements(supabase, safeOffset, PAGE_SIZE);

  return { events: page.events, hasMore: page.hasMore };
}
