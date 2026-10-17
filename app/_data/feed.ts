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

export interface SessionUser {
  name: string;
  role: string;
  initial: string;
}

export interface RoomSummary {
  roomName: string;
  greetingName: string;
  childCount: number;
  dateLabel: string;
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

export const sessionUser: SessionUser = {
  name: "Caro Giménez",
  role: "Maestra · Soles",
  initial: "C",
};

export const room: RoomSummary = {
  roomName: "Sala Soles",
  greetingName: "Caro",
  childCount: 12,
  dateLabel: "martes 17 jun",
};
