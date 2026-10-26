import type { SupabaseClient } from "@supabase/supabase-js";

export type SessionRole = "staff" | "parent" | "admin";

export interface SessionUser {
  id: string;
  role: SessionRole | null;
  fullName: string | null;
}

// Datos de display que Sidebar/FeedView muestran del usuario logueado.
export interface SidebarUser {
  name: string;
  role: string;
  initial: string;
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
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    role: (data?.role as SessionRole | undefined) ?? null,
    fullName: data?.full_name ?? null,
  };
}

// Rol en español para mostrar en la UI.
export function roleLabel(role: SessionRole | null): string {
  switch (role) {
    case "staff":
      return "Staff";
    case "parent":
      return "Padre";
    case "admin":
      return "Admin";
    default:
      return "";
  }
}

// "Caro Giménez" → "C"; sin nombre → "".
export function initialFromName(fullName: string | null): string {
  if (!fullName) return "";
  return fullName.trim().charAt(0).toUpperCase();
}

// Mapea la sesión al tipo de display que Sidebar/FeedView renderizan.
export function toSidebarUser(session: SessionUser | null): SidebarUser {
  if (!session) return { name: "", role: "", initial: "" };

  return {
    name: session.fullName ?? "",
    role: roleLabel(session.role),
    initial: initialFromName(session.fullName),
  };
}
