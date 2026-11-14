import type { SupabaseClient } from "@supabase/supabase-js";
import { initialFromName, type SessionRole } from "./session";

// Datos de contacto de la guardería (columnas nuevas de SPEC 19).
export interface DaycareContact {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
}

// Persona staff/admin activa de la guardería del padre.
export interface TeamMember {
  id: string;
  fullName: string;
  role: SessionRole; // "staff" | "admin"
  initial: string;
  avatarUrl: string | null;
}

export interface DaycareInfo {
  contact: DaycareContact;
  team: TeamMember[];
}

interface DaycareRow {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  hours: string | null;
}

interface TeamRow {
  id: string;
  full_name: string;
  role: SessionRole;
  avatar_url: string | null;
}

const FALLBACK_NAME = "Guardería";

function toTeamMember(row: TeamRow): TeamMember {
  return {
    id: row.id,
    fullName: row.full_name,
    role: row.role,
    initial: initialFromName(row.full_name),
    avatarUrl: row.avatar_url,
  };
}

function emptyContact(): DaycareContact {
  return {
    name: FALLBACK_NAME,
    phone: null,
    email: null,
    address: null,
    hours: null,
  };
}

// Contacto + equipo de la guardería del padre. Sin daycare_id (dato
// faltante o lectura denegada) devuelve null para que la pantalla muestre
// su estado vacío. El filtro de rol/status va en la query, no en JS.
export async function fetchDaycareInfo(
  supabase: SupabaseClient,
  parentId: string,
): Promise<DaycareInfo | null> {
  const { data: parent } = await supabase
    .from("users")
    .select("daycare_id")
    .eq("id", parentId)
    .maybeSingle();

  const daycareId = (parent?.daycare_id as string | null | undefined) ?? null;
  if (!daycareId) return null;

  const [{ data: daycare, error }, { data: teamRows }] = await Promise.all([
    supabase
      .from("daycares")
      .select("name, phone, email, address, hours")
      .eq("id", daycareId)
      .maybeSingle(),
    supabase
      .from("users")
      .select("id, full_name, role, avatar_url")
      .eq("daycare_id", daycareId)
      .in("role", ["staff", "admin"])
      .eq("status", "active")
      .order("full_name"),
  ]);

  if (error) return null;

  const row = daycare as DaycareRow | null;

  return {
    // Fila inexistente (no debería: daycare_id es FK obligatoria) →
    // contacto vacío con el nombre por defecto.
    contact: row
      ? {
          name: row.name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          hours: row.hours,
        }
      : emptyContact(),
    team: ((teamRows ?? []) as unknown as TeamRow[]).map(toTeamMember),
  };
}
