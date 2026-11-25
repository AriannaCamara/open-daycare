import type { SupabaseClient } from "@supabase/supabase-js";

// Avisos del panel staff (SPEC 27): unión de comentarios, reacciones y
// activaciones de invitaciones, sin tablas nuevas.

const TZ = "America/Argentina/Buenos_Aires";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
// El link parent_children se crea en el mismo instante que accepted_at
// (accept_parent_invitation): tolerancia para resolver el nombre del padre.
const ACTIVATION_LINK_WINDOW_MS = HOUR_MS;

export interface AnnouncementEvent {
  id: string;
  kind: "comment" | "reaction" | "activation";
  actorName: string; // users.full_name; fallback: email de la invitación
  childName: string | null; // given name del niño ("" si el post no tiene niños)
  postId: string | null; // "/posts/{id}"; null en activation
  timeLabel: string; // "Hace 12 min" — formateado en el servidor
  createdAt: string; // ISO — orden mezclado
}

export interface AnnouncementPage {
  events: AnnouncementEvent[];
  hasMore: boolean;
}

interface EngagementRow {
  id: string;
  created_at: string;
  users: { full_name: string; role: string | null } | null;
  posts: {
    id: string;
    post_children: { children: { full_name: string } | null }[];
  } | null;
}

interface InvitationRow {
  id: string;
  email: string;
  accepted_at: string;
  children: {
    full_name: string;
    parent_children: { parent_id: string; created_at: string }[];
  } | null;
}

// "Mateo Fernández" → "Mateo" (mismo given name que el pill y el card).
function toGivenName(fullName: string): string {
  return fullName.trim().split(" ")[0];
}

// DD/MM HH:MM en la zona de la guardería (tercer formato de la spec).
// Intl con es-AR devuelve "8" para el día: se rellena a 2 dígitos a mano
// para que siempre coincida con el formato DD/MM.
function formatDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("day")}/${value("month")} ${value("hour")}:${value("minute")}`;
}

// Tiempo relativo en español, precalculado en el servidor para que no haya
// errores de hidratación: "Hace 12 min" / "Hace 1 h" / "DD/MM HH:MM".
export function formatRelativeTime(iso: string): string {
  const createdAt = new Date(iso);
  const diffMinutes = Math.max(
    1,
    Math.floor((Date.now() - createdAt.getTime()) / MINUTE_MS),
  );

  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;

  return formatDateTime(createdAt);
}

// Given name del primer niño etiquetado en el post; "" si es post de sala.
function childNameFrom(
  post: EngagementRow["posts"],
): string | null {
  const fullName = post?.post_children[0]?.children?.full_name;
  return fullName ? toGivenName(fullName) : "";
}

function toEngagementEvent(
  row: EngagementRow,
  kind: "comment" | "reaction",
): AnnouncementEvent {
  return {
    id: `${kind}-${row.id}`,
    kind,
    actorName: row.users?.full_name ?? "",
    childName: childNameFrom(row.posts),
    postId: row.posts?.id ?? null,
    timeLabel: formatRelativeTime(row.created_at),
    createdAt: row.created_at,
  };
}

// Vínculo parent_children creado cerca de accepted_at (misma operación).
function findActivatedParent(row: InvitationRow): string | null {
  const links = row.children?.parent_children ?? [];
  const acceptedAt = new Date(row.accepted_at).getTime();

  let best: { parentId: string; diff: number } | null = null;

  for (const link of links) {
    const diff = Math.abs(new Date(link.created_at).getTime() - acceptedAt);
    if (diff > ACTIVATION_LINK_WINDOW_MS) continue;
    if (!best || diff < best.diff) {
      best = { parentId: link.parent_id, diff };
    }
  }

  return best?.parentId ?? null;
}

// Nombres de los padres activados en esta página, en una sola query.
// Si RLS los oculta, se usa el email de la invitación.
async function fetchActorNames(
  supabase: SupabaseClient,
  rows: InvitationRow[],
): Promise<Map<string, string>> {
  const parentIds = [
    ...new Set(
      rows.map(findActivatedParent).filter((id): id is string => Boolean(id)),
    ),
  ];

  if (parentIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", parentIds);

  if (error) throw error;

  return new Map(
    ((data ?? []) as { id: string; full_name: string }[]).map((row) => [
      row.id,
      row.full_name,
    ]),
  );
}

// Página de avisos: cada query pide offset + limit + 1 filas (la extra detecta
// si hay más), se unen, se ordenan por fecha desc y se corta [offset, limit).
// RLS: comments/reactions por can_read_post, invitations solo staff del niño,
// users por miembros de la misma guardería.
export async function fetchAnnouncements(
  supabase: SupabaseClient,
  offset: number,
  limit: number,
): Promise<AnnouncementPage> {
  const fetchLimit = offset + limit + 1;

  const [commentsRes, reactionsRes, invitationsRes] = await Promise.all([
    supabase
      .from("comments")
      .select(
        `id, created_at,
         users ( full_name, role ),
         posts ( id, post_children ( children ( full_name ) ) )`,
      )
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("reactions")
      .select(
        `id, created_at,
         users ( full_name, role ),
         posts ( id, post_children ( children ( full_name ) ) )`,
      )
      .order("created_at", { ascending: false })
      .limit(fetchLimit),
    supabase
      .from("invitations")
      .select(
        `id, email, accepted_at,
         children ( full_name, parent_children ( parent_id, created_at ) )`,
      )
      .eq("status", "accepted")
      .not("accepted_at", "is", null)
      .order("accepted_at", { ascending: false })
      .limit(fetchLimit),
  ]);

  if (commentsRes.error) throw commentsRes.error;
  if (reactionsRes.error) throw reactionsRes.error;
  if (invitationsRes.error) throw invitationsRes.error;

  const commentRows = (commentsRes.data ?? []) as unknown as EngagementRow[];
  const reactionRows = (reactionsRes.data ?? []) as unknown as EngagementRow[];
  const invitationRows = (invitationsRes.data ?? []) as unknown as
    InvitationRow[];

  // Solo actividad de las familias: los comentarios/reacciones del staff
  // (o admin) no son avisos.
  const events: AnnouncementEvent[] = [
    ...commentRows
      .filter((row) => row.users?.role === "parent")
      .map((row) => toEngagementEvent(row, "comment")),
    ...reactionRows
      .filter((row) => row.users?.role === "parent")
      .map((row) => toEngagementEvent(row, "reaction")),
  ];

  const actorNames = await fetchActorNames(supabase, invitationRows);

  for (const row of invitationRows) {
    const parentId = findActivatedParent(row);
    events.push({
      id: `activation-${row.id}`,
      kind: "activation",
      actorName: (parentId && actorNames.get(parentId)) || row.email,
      childName: row.children?.full_name
        ? toGivenName(row.children.full_name)
        : "",
      postId: null, // la referencia no enlaza las activaciones
      timeLabel: formatRelativeTime(row.accepted_at),
      createdAt: row.accepted_at,
    });
  }

  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const hasMore =
    commentRows.length > offset + limit ||
    reactionRows.length > offset + limit ||
    invitationRows.length > offset + limit;

  return {
    events: events.slice(offset, offset + limit),
    hasMore,
  };
}
