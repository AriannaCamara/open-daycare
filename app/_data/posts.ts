import type { SupabaseClient } from "@supabase/supabase-js";
import { avatarToneStyles, type AvatarTone } from "./children";
import type { PillChild, Post, PostKind, RoomOption } from "./feed";

// La URL firmada caduca: se genera en cada lectura del feed y nunca se
// persiste en post_photos.url (que guarda el storage path).
const SIGNED_URL_TTL_SECONDS = 3600;

const toneKeys = Object.keys(avatarToneStyles) as AvatarTone[];

interface PostChildRow {
  child_id: string;
  children: { full_name: string } | null;
}

interface PostPhotoRow {
  id: string;
  url: string;
  position: number;
}

interface PostReactionRow {
  user_id: string;
}

interface PostCommentRow {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  users: { full_name: string; role: string | null } | null;
}

interface PostRow {
  id: string;
  type: PostKind;
  body: string;
  room_id: string | null;
  author_id: string;
  published_at: string;
  users: { full_name: string } | null;
  rooms: { name: string } | null;
  post_children: PostChildRow[];
  post_photos: PostPhotoRow[];
  reactions: PostReactionRow[];
  comments: PostCommentRow[];
}

// published_at → "14:20" en la zona horaria de la guardería.
// Exportado para la línea de tiempo del resumen del día (SPEC 23).
export function formatPostTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(iso));
}

// "Mateo Fernández" → "Mateo" (mismo given name que el pill y el card).
function toGivenName(fullName: string): string {
  return fullName.trim().split(" ")[0];
}

function buildAudience(givenNames: string[], roomId: string | null): string {
  if (givenNames.length > 0) return `familia de ${givenNames.join(", ")}`;
  return roomId ? "toda la sala" : "toda la guardería";
}

function sortedPhotos(row: PostRow): PostPhotoRow[] {
  return [...row.post_photos].sort((a, b) => a.position - b.position);
}

// Mismo select para el feed y para el detalle (SPEC 25).
const POST_SELECT = `id, type, body, room_id, author_id, published_at,
       users ( full_name ),
       rooms ( name ),
       post_children ( child_id, children ( full_name ) ),
       post_photos ( id, url, position ),
       reactions ( user_id ),
       comments ( id, author_id, body, created_at, users ( full_name, role ) )`;

// La URL firmada caduca en 1h: se genera en cada lectura.
async function signPhotoPaths(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const { data, error } = await supabase.storage
    .from("post-photos")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;

  return new Map(
    (data ?? [])
      .filter((item) => !item.error && item.signedUrl)
      .map((item) => [item.path, item.signedUrl] as [string, string]),
  );
}

function mapPostRow(
  row: PostRow,
  userId: string,
  signedUrlByPath: Map<string, string>,
): Post {
  const givenNames = row.post_children
    .map((entry) => entry.children?.full_name)
    .filter((name): name is string => Boolean(name))
    .map(toGivenName);

  const comments = [...row.comments]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((comment) => ({
      id: comment.id,
      authorId: comment.author_id,
      authorName: comment.users?.full_name ?? "",
      authorRole: comment.users?.role ?? null,
      body: comment.body,
      time: formatPostTime(comment.created_at),
    }));

  return {
    id: row.id,
    kind: row.type,
    body: row.body,
    roomId: row.room_id,
    authorId: row.author_id,
    childIds: row.post_children.map((entry) => entry.child_id),
    photos: sortedPhotos(row)
      .map((photo) => ({
        id: photo.id,
        url: signedUrlByPath.get(photo.url) ?? "",
      }))
      .filter((photo) => photo.url),
    givenNames,
    time: formatPostTime(row.published_at),
    // SPEC 24: autor y sala reales para la tarjeta familiar
    // ("HH:MM · autor · sala"). RLS: users_select_same_daycare_members
    // (SPEC 17) + rooms_select; "" si el post no tiene sala.
    authorName: row.users?.full_name ?? "",
    roomName: row.rooms?.name ?? "",
    audience: buildAudience(givenNames, row.room_id),
    likes: row.reactions.length,
    likedByMe: row.reactions.some((reaction) => reaction.user_id === userId),
    commentsCount: comments.length,
    comments,
  };
}

// Posts del daycare (RLS can_read_post acota por rol), más recientes primero.
// Se firman todas las fotos (1h): la card muestra la primera y el modal de
// edición necesita cada id + URL. userId marca likedByMe (embed reactions).
export async function fetchPosts(
  supabase: SupabaseClient,
  userId: string,
): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .order("published_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as PostRow[];

  const signedUrlByPath = await signPhotoPaths(
    supabase,
    rows.flatMap((row) => sortedPhotos(row).map((photo) => photo.url)),
  );

  return rows.map((row) => mapPostRow(row, userId, signedUrlByPath));
}

// Post único para la ruta /posts/[id] (SPEC 25). RLS devuelve null si el post
// no es visible para el usuario (post inexistente o ajeno → mismo caso).
export async function fetchPostById(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
): Promise<Post | null> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", postId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as PostRow;

  const signedUrlByPath = await signPhotoPaths(
    supabase,
    sortedPhotos(row).map((photo) => photo.url),
  );

  return mapPostRow(row, userId, signedUrlByPath);
}

export interface PostOptions {
  children: PillChild[];
  rooms: RoomOption[];
}

// Niños activos (pills "PARA") + salas (dropdown SALA) para el modal.
export async function fetchPostOptions(
  supabase: SupabaseClient,
): Promise<PostOptions> {
  const [childrenRes, roomsRes] = await Promise.all([
    supabase
      .from("children")
      .select("id, full_name")
      .eq("status", "active")
      .order("full_name"),
    supabase.from("rooms").select("id, name").order("name"),
  ]);

  if (childrenRes.error) throw childrenRes.error;
  if (roomsRes.error) throw roomsRes.error;

  const childRows = (childrenRes.data ?? []) as {
    id: string;
    full_name: string;
  }[];

  // El dropdown SALA del modal toma la primera sala como default; el criterio
  // de aceptación pide que sea "Soles", así que va primero.
  const rooms = [...((roomsRes.data ?? []) as RoomOption[])].sort(
    (a, b) => Number(b.name === "Soles") - Number(a.name === "Soles"),
  );

  return {
    children: childRows.map((row, index) => ({
      id: row.id,
      fullName: toGivenName(row.full_name),
      avatarTone: toneKeys[index % toneKeys.length],
    })),
    rooms,
  };
}
