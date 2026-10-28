import { avatarToneStyles, type AvatarTone, type Child } from "./children";

const monthLabels = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const toneKeys = Object.keys(avatarToneStyles) as AvatarTone[];

export interface ChildRow {
  id: string;
  full_name: string;
  birth_date: string;
  enrolled_at: string;
  medical_notes: string | null;
  allergy_tags: string[] | null;
  rooms?: { name: string } | null;
}

export function calculateAge(birthDate: string): number {
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age;
}

export function formatBirthDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${monthLabels[month - 1]} ${year}`;
}

function formatAdmission(iso: string): string {
  const [year, month] = iso.split("-").map(Number);
  return `${monthLabels[month - 1]} ${year}`;
}

// Fila de DB → tipo Child de la vista. tone rota por índice (no se persiste).
export function mapChildRow(
  row: ChildRow,
  index: number,
  parentsCount = 0,
): Child {
  return {
    id: row.id,
    fullName: row.full_name,
    ageYears: calculateAge(row.birth_date),
    roomName: row.rooms?.name ?? "",
    initial: row.full_name.charAt(0).toUpperCase(),
    tone: toneKeys[index % toneKeys.length],
    allergyLabel: row.allergy_tags?.[0]?.toUpperCase() || undefined,
    allergiesNote: row.medical_notes || undefined,
    birthDateLabel: formatBirthDate(row.birth_date),
    admissionLabel: formatAdmission(row.enrolled_at),
    parentsCount,
  };
}
