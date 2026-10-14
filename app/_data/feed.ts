export type PostKind = "achievement" | "activity" | "announcement";

export const postKindLabels: Record<PostKind, string> = {
  achievement: "LOGRO",
  activity: "ACTIVIDAD",
  announcement: "ANUNCIO",
};

export interface Post {
  id: string;
  kind: PostKind;
  childName?: string;
  time: string;
  audience: string;
  body: string;
  likes: number;
  comments: number;
  photoLabel?: string;
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
    childName: "Mateo",
    time: "14:20",
    audience: "familia de Mateo",
    body: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    likes: 3,
    comments: 1,
  },
  {
    id: "temperas-mateo",
    kind: "activity",
    childName: "Mateo",
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
