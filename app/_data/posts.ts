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

interface PostRow {
  id: string;
  type: PostKind;
  body: string;
  room_id: string | null;
  author_id: string;
  published_at: string;
  post_children: PostChildRow[];
  post_photos: PostPhotoRow[];
}

// published_at → "14:20" en la zona horaria de la guardería.
function formatPostTime(iso: string): string {
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

// Posts del daycare (RLS can_read_post acota por rol), más recientes primero.
// Se firman todas las fotos (1h): la card muestra la primera y el modal de
// edición necesita cada id + URL.
export async function fetchPosts(supabase: SupabaseClient): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(
      `id, type, body, room_id, author_id, published_at,
       post_children ( child_id, children ( full_name ) ),
       post_photos ( id, url, position )`,
    )
    .order("published_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as unknown as PostRow[];

  const photoPaths = rows.flatMap((row) =>
    sortedPhotos(row).map((photo) => photo.url),
  );

  let signedUrlByPath = new Map<string, string>();

  if (photoPaths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from("post-photos")
      .createSignedUrls(photoPaths, SIGNED_URL_TTL_SECONDS);

    if (signError) throw signError;

    signedUrlByPath = new Map(
      (signed ?? [])
        .filter((item) => !item.error && item.signedUrl)
        .map((item) => [item.path, item.signedUrl] as [string, string]),
    );
  }

  return rows.map((row) => {
    const givenNames = row.post_children
      .map((entry) => entry.children?.full_name)
      .filter((name): name is string => Boolean(name))
      .map(toGivenName);

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
      audience: buildAudience(givenNames, row.room_id),
      likes: 0,
      comments: 0,
    };
  });
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
