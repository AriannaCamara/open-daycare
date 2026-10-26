import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionRole = "staff" | "parent" | "admin";

export interface SessionUser {
  id: string;
  role: SessionRole | null;
}

// Solo staff/admin de la guardería pueden invitar padres (misma condición
// que la policy invitations_insert_staff vía is_staff_of_child).
export function isStaffRole(role: SessionRole | null): boolean {
  return role === "staff" || role === "admin";
}

// Usuario autenticado + su rol en public.users (policy users_select_own).
export async function fetchSessionUser(
  supabase: SupabaseClient,
): Promise<SessionUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { id: user.id, role: (data?.role as SessionRole | undefined) ?? null };
}
