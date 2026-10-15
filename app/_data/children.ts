export type AvatarTone =
  | "sky"
  | "pink"
  | "mint"
  | "yellow"
  | "lilac"
  | "blue";

export type ParentStatus = "active" | "pending";
export type ParentRelation = "mother" | "father";

export interface Parent {
  id: string;
  fullName: string;
  relation: ParentRelation;
  initial: string;
  tone: AvatarTone;
  status: ParentStatus;
}

export interface Child {
  id: string;
  fullName: string;
  ageYears: number;
  roomName: string;
  initial: string;
  tone: AvatarTone;
  allergyLabel?: string;
  allergiesNote?: string;
  birthDateLabel: string;
  admissionLabel: string;
  parents: Parent[];
}

export const avatarToneStyles: Record<
  AvatarTone,
  { background: string; text: string }
> = {
  sky: { background: "#A9D9E8", text: "#1F7A93" },
  pink: { background: "#F4B8CC", text: "#C44A7A" },
  mint: { background: "#B9DEC4", text: "#3E8B62" },
  yellow: { background: "#F4DC8E", text: "#9A7B1E" },
  lilac: { background: "#C9B6E8", text: "#7B5FC0" },
  blue: { background: "#A9C7E8", text: "#3A6EA5" },
};

export const parentStatusLabels: Record<ParentStatus, string> = {
  active: "ACTIVA",
  pending: "PENDIENTE",
};

export const parentStatusStyles: Record<
  ParentStatus,
  { background: string; text: string }
> = {
  active: { background: "#CFEBD8", text: "#3E9B6C" },
  pending: { background: "#F7E7A6", text: "#9A7B1E" },
};

export const children: Child[] = [
  {
    id: "mateo-fernandez",
    fullName: "Mateo Fernández",
    ageYears: 3,
    roomName: "Soles",
    initial: "M",
    tone: "sky",
    allergyLabel: "MANÍ",
    allergiesNote:
      "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.",
    birthDateLabel: "12 mar 2022",
    admissionLabel: "feb 2025",
    parents: [
      {
        id: "lucia-fernandez",
        fullName: "Lucía Fernández",
        relation: "mother",
        initial: "L",
        tone: "lilac",
        status: "active",
      },
      {
        id: "diego-fernandez",
        fullName: "Diego Fernández",
        relation: "father",
        initial: "D",
        tone: "blue",
        status: "pending",
      },
    ],
  },
  {
    id: "sofia-mendez",
    fullName: "Sofía Méndez",
    ageYears: 2,
    roomName: "Soles",
    initial: "S",
    tone: "pink",
    birthDateLabel: "22 sep 2023",
    admissionLabel: "ago 2025",
    parents: [
      {
        id: "carla-mendez",
        fullName: "Carla Méndez",
        relation: "mother",
        initial: "C",
        tone: "mint",
        status: "active",
      },
    ],
  },
  {
    id: "benjamin-ruiz",
    fullName: "Benjamín Ruiz",
    ageYears: 3,
    roomName: "Soles",
    initial: "B",
    tone: "mint",
    birthDateLabel: "03 ene 2022",
    admissionLabel: "ene 2025",
    parents: [
      {
        id: "marina-ruiz",
        fullName: "Marina Ruiz",
        relation: "mother",
        initial: "M",
        tone: "yellow",
        status: "active",
      },
      {
        id: "pablo-ruiz",
        fullName: "Pablo Ruiz",
        relation: "father",
        initial: "P",
        tone: "blue",
        status: "active",
      },
    ],
  },
  {
    id: "valentina-soto",
    fullName: "Valentina Soto",
    ageYears: 2,
    roomName: "Soles",
    initial: "V",
    tone: "yellow",
    birthDateLabel: "14 nov 2023",
    admissionLabel: "abr 2025",
    parents: [],
  },
  {
    id: "tomas-diaz",
    fullName: "Tomás Díaz",
    ageYears: 3,
    roomName: "Soles",
    initial: "T",
    tone: "lilac",
    allergyLabel: "LACTOSA",
    allergiesNote:
      "Intolerancia a la lactosa. Evitar lácteos en las colaciones.",
    birthDateLabel: "28 jul 2022",
    admissionLabel: "mar 2025",
    parents: [
      {
        id: "ana-diaz",
        fullName: "Ana Díaz",
        relation: "mother",
        initial: "A",
        tone: "pink",
        status: "active",
      },
    ],
  },
  {
    id: "emma-castro",
    fullName: "Emma Castro",
    ageYears: 2,
    roomName: "Soles",
    initial: "E",
    tone: "pink",
    birthDateLabel: "09 feb 2024",
    admissionLabel: "may 2025",
    parents: [
      {
        id: "julieta-castro",
        fullName: "Julieta Castro",
        relation: "mother",
        initial: "J",
        tone: "lilac",
        status: "active",
      },
    ],
  },
  {
    id: "lucas-romero",
    fullName: "Lucas Romero",
    ageYears: 3,
    roomName: "Soles",
    initial: "L",
    tone: "sky",
    birthDateLabel: "17 abr 2023",
    admissionLabel: "sep 2025",
    parents: [
      {
        id: "marcos-romero",
        fullName: "Marcos Romero",
        relation: "father",
        initial: "M",
        tone: "blue",
        status: "active",
      },
    ],
  },
  {
    id: "olivia-vega",
    fullName: "Olivia Vega",
    ageYears: 2,
    roomName: "Soles",
    initial: "O",
    tone: "mint",
    birthDateLabel: "30 jun 2024",
    admissionLabel: "oct 2025",
    parents: [
      {
        id: "valeria-vega",
        fullName: "Valeria Vega",
        relation: "mother",
        initial: "V",
        tone: "yellow",
        status: "active",
      },
    ],
  },
];

export function getChildById(id: string): Child | undefined {
  return children.find((child) => child.id === id);
}
