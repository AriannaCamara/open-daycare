import type { SupabaseClient } from "@supabase/supabase-js";

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

export interface Post {
  id: string;
  kind: PostKind;
  givenNames: string[];
  time: string;
  audience: string;
  body: string;
  likes: number;
  comments: number;
  photoLabel?: string;
  photoUrl?: string;
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

export const posts: Post[] = [
  {
    id: "orinal-mateo",
    kind: "achievement",
    givenNames: ["Mateo"],
    time: "14:20",
    audience: "familia de Mateo",
    body: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    likes: 3,
    comments: 1,
  },
  {
    id: "temperas-mateo",
    kind: "activity",
    givenNames: ["Mateo"],
    time: "09:40",
    audience: "familia de Mateo",
    body: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.",
    likes: 5,
    comments: 2,
    photoLabel: "Foto · pintando con témperas",
  },
  {
    id: "parque-viernes",
    kind: "announcement",
    givenNames: [],
    time: "07:50",
    audience: "toda la sala",
    body: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.",
    likes: 8,
    comments: 0,
  },
];

export const room: SidebarRoom = {
  roomName: "Sala Soles",
};
