import type { SupabaseClient } from "@supabase/supabase-js";
import type { AvatarTone } from "./children";

export type PostKind =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export const postKindLabels: Record<PostKind, string> = {
  meal: "COMIDA",
  nap: "SIESTA",
  activity: "ACTIVIDAD",
  achievement: "LOGRO",
  mood: "ÁNIMO",
  photo: "FOTO",
  announcement: "ANUNCIO",
};

export const postKindStyles: Record<
  PostKind,
  {
    label: string;
    solid: { bg: string; text: string };
    pill: { bg: string; text: string };
  }
> = {
  meal: {
    label: postKindLabels.meal,
    solid: { bg: "#F4DC8E", text: "#9A7B1E" },
    pill: { bg: "#F3E7C4", text: "#9A7B1E" },
  },
  nap: {
    label: postKindLabels.nap,
    solid: { bg: "#E7DCF6", text: "#7B5FC0" },
    pill: { bg: "#E7DCF6", text: "#7B5FC0" },
  },
  activity: {
    label: postKindLabels.activity,
    solid: { bg: "#2E89A6", text: "#fff" },
    pill: { bg: "#C7E7F1", text: "#1F7A93" },
  },
  achievement: {
    label: postKindLabels.achievement,
    solid: { bg: "#CFEBD8", text: "#3E9B6C" },
    pill: { bg: "#CFEBD8", text: "#3E9B6C" },
  },
  mood: {
    label: postKindLabels.mood,
    solid: { bg: "#F9D2DE", text: "#C56486" },
    pill: { bg: "#F9D2DE", text: "#C56486" },
  },
  photo: {
    label: postKindLabels.photo,
    solid: { bg: "#FBD8CC", text: "#D9684A" },
    pill: { bg: "#FBD8CC", text: "#D9684A" },
  },
  announcement: {
    label: postKindLabels.announcement,
    solid: { bg: "#CCD8F4", text: "#4E72C8" },
    pill: { bg: "#CCD8F4", text: "#4E72C8" },
  },
};

export interface PostPhoto {
  id: string; // uuid de post_photos (para keptPhotoIds al editar)
  url: string; // signed URL (1h); la card muestra [0]
}

// Campos que el modal necesita para precargar el modo edición.
export interface EditablePost {
  id: string;
  kind: PostKind;
  body: string;
  roomId: string | null;
  childIds: string[];
  photos: PostPhoto[];
}

// Comentario del feed (SPEC 17), ya formateado para la sección expandible.
export interface Comment {
  id: string; // uuid de comments
  authorId: string; // users.id
  authorName: string; // users.full_name
  body: string;
  time: string; // "14:20" — mismo formateo TZ que los posts
}

export interface Post extends EditablePost {
  givenNames: string[]; // [] si es post de sala/día
  time: string; // "14:20" — published_at en America/Argentina/Buenos_Aires
  audience: string; // "familia de X, Y" | "toda la sala" | "toda la guardería"
  authorId: string;
  likes: number; // total real de reactions
  likedByMe: boolean; // el usuario actual ya reaccionó
  commentsCount: number; // comments.length
  comments: Comment[]; // todos, ordenados created_at asc
}

// Niño activo para los pills "PARA" del modal (mismo tono por índice que /kids).
export interface PillChild {
  id: string;
  fullName: string; // given name para el pill y el card
  avatarTone: AvatarTone;
}

export interface RoomOption {
  id: string;
  name: string;
}

// Lo único que la sidebar necesita del cuarto: sin contadores mock.
export interface SidebarRoom {
  roomName: string;
}

export interface RoomSummary extends SidebarRoom {
  childCount: number;
  dateLabel: string;
}

// "martes, 28 oct." → "martes 28 oct" (minúsculas, sin coma ni punto).
function normalizeDateLabel(formatted: string): string {
  return formatted
    .toLowerCase()
    .replace(/[,.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fecha de hoy fija en la zona de la guardería, sea cual sea el TZ del servidor.
export function formatTodayLabel(): string {
  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  return normalizeDateLabel(label);
}

// Niños activos (todas las salas) + fecha de hoy, calculados por request.
export async function fetchFeedSummary(
  supabase: SupabaseClient,
): Promise<Pick<RoomSummary, "childCount" | "dateLabel">> {
  const { count, error } = await supabase
    .from("children")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  if (error) throw error;

  return { childCount: count ?? 0, dateLabel: formatTodayLabel() };
}

export const room: SidebarRoom = {
  roomName: "Sala Soles",
};
