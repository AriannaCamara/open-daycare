import type { SupabaseClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { mapChildRow, type ChildRow } from "./child-mapper";
import type { AvatarTone, Child } from "./children";
import { fetchSessionUser } from "./session";

// Hijo del listado familiar (/family/kids): subconjunto de Child para la
// tarjeta estilo KidCard.
export interface FamilyChild {
  id: string;
  fullName: string;
  ageYears: number;
  roomName: string;
  initial: string;
  tone: AvatarTone;
  allergyLabel?: string;
}

// Bloque CUIDADOS: child_profile (1:1) + las 3 columnas que aporta children.
export interface ChildCare {
  emergencyContact: string | null;
  pickupAuthorization: string | null;
  diet: string | null;
  medication: string | null;
  napSchedule: string | null;
  medicalNotes: string | null;
  allergyTags: string[];
  photoConsent: boolean;
}

export interface ChildNote {
  id: string;
  body: string;
  createdAt: string;
}

export interface ChildFullProfile {
  child: Child; // reutiliza mapChildRow (SPEC 10/11)
  care: ChildCare;
  notes: ChildNote[]; // order created_at asc
}

interface FamilyChildRow {
  children: ChildRow | null;
}

interface ChildProfileRow {
  emergency_contact: string | null;
  pickup_authorization: string | null;
  diet: string | null;
  medication: string | null;
  nap_schedule: string | null;
}

interface ChildNoteRow {
  id: string;
  body: string;
  created_at: string;
}

interface ChildCareRow extends ChildProfileRow {
  medical_notes: string | null;
  allergy_tags: string[] | null;
  photo_consent: boolean;
}

const CHILD_SELECT =
  "id, full_name, birth_date, enrolled_at, medical_notes, allergy_tags, photo_consent, rooms(name)";

// Hijos vinculados al padre (filtro por parent_id en la query, no en JS).
export async function fetchFamilyChildren(
  supabase: SupabaseClient,
  parentId: string,
): Promise<FamilyChild[]> {
  const { data } = await supabase
    .from("parent_children")
    .select(`children(${CHILD_SELECT})`)
    .eq("parent_id", parentId);

  return (data ?? [])
    .map((row) => (row as unknown as FamilyChildRow).children)
    .filter((row): row is ChildRow => row !== null)
    .map((row, index) => {
      const child = mapChildRow(row, index);
      return {
        id: child.id,
        fullName: child.fullName,
        ageYears: child.ageYears,
        roomName: child.roomName,
        initial: child.initial,
        tone: child.tone,
        allergyLabel: child.allergyLabel,
      };
    });
}

function toCare(row: ChildCareRow, profile: ChildProfileRow | null): ChildCare {
  return {
    emergencyContact: profile?.emergency_contact ?? null,
    pickupAuthorization: profile?.pickup_authorization ?? null,
    diet: profile?.diet ?? null,
    medication: profile?.medication ?? null,
    napSchedule: profile?.nap_schedule ?? null,
    medicalNotes: row.medical_notes,
    allergyTags: row.allergy_tags ?? [],
    photoConsent: row.photo_consent,
  };
}

function toNotes(rows: ChildNoteRow[]): ChildNote[] {
  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
  }));
}

// Ficha completa para la vista familiar. Verifica el vínculo con el padre de
// sesión: si el niño no es hijo suyo → 404 (doble filtro con RLS).
export async function fetchChildFullProfile(
  supabase: SupabaseClient,
  childId: string,
): Promise<ChildFullProfile> {
  const session = await fetchSessionUser(supabase);

  const { data: link } = await supabase
    .from("parent_children")
    .select("id")
    .eq("parent_id", session?.id ?? "")
    .eq("child_id", childId)
    .maybeSingle();

  if (!link) {
    notFound();
  }

  return fetchProfileRows(supabase, childId);
}

// Misma ficha para la vista staff (solo lectura), sin verificar vínculo.
export async function fetchStaffChildProfile(
  supabase: SupabaseClient,
  childId: string,
): Promise<ChildFullProfile> {
  return fetchProfileRows(supabase, childId);
}

async function fetchProfileRows(
  supabase: SupabaseClient,
  childId: string,
): Promise<ChildFullProfile> {
  const [{ data, error }, { data: profile }, { data: noteRows }] =
    await Promise.all([
      supabase
        .from("children")
        .select(CHILD_SELECT)
        .eq("id", childId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("child_profile")
        .select(
          "emergency_contact, pickup_authorization, diet, medication, nap_schedule",
        )
        .eq("child_id", childId)
        .maybeSingle(),
      supabase
        .from("child_notes")
        .select("id, body, created_at")
        .eq("child_id", childId)
        .order("created_at", { ascending: true }),
    ]);

  // Id no-uuid o niño inexistente/archivado → 404.
  if (error || !data) {
    notFound();
  }

  return {
    child: mapChildRow(data as unknown as ChildRow, 0),
    care: toCare(
      data as unknown as ChildCareRow,
      profile as unknown as ChildProfileRow | null,
    ),
    notes: toNotes((noteRows ?? []) as unknown as ChildNoteRow[]),
  };
}
