"use server";

import { fetchSessionUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";
import { NOTE_EMPTY_ERROR, SESSION_ERROR } from "./errors";

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface ChildProfileInput {
  emergencyContact: string;
  pickupAuthorization: string;
  diet: string;
  medication: string;
  napSchedule: string;
  medicalNotes: string;
  allergyTags: string[]; // "Maní, Lactosa" → ["Maní", "Lactosa"]
  photoConsent: boolean;
}

const NOT_YOUR_CHILD_ERROR = "Este niño no es hijo tuyo.";
const SAVE_ERROR = "No se pudo guardar. Intentá de nuevo.";
const NOTE_FORBIDDEN_ERROR = "No podés modificar esta aclaración.";

// Texto opcional: vacío (o solo espacios) → null.
function optionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

// "Maní, Lactosa" → ["Maní", "Lactosa"]; descarta entradas vacías.
function normalizeAllergyTags(tags: string[]): string[] {
  return tags
    .flatMap((tag) => tag.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// 42501 = RLS rechazó la fila; el resto es un fallo genérico de DB.
function errorMessage(error: { code?: string | null }): string {
  return error.code === "42501" ? NOT_YOUR_CHILD_ERROR : SAVE_ERROR;
}

// Actualiza cuidados: primero children (medical_notes, allergy_tags,
// photo_consent) y después upsert de child_profile. La lista blanca de
// columnas vive acá: nunca acepta ni envía datos administrativos.
export async function updateChildProfile(
  childId: string,
  input: ChildProfileInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }

  if (typeof input.photoConsent !== "boolean") {
    return { ok: false, error: SAVE_ERROR };
  }

  const allergyTags = normalizeAllergyTags(input.allergyTags ?? []);

  // 0 filas = RLS (policy children_update_parent_linked) o niño inexistente.
  const { data: updated, error: childrenError } = await supabase
    .from("children")
    .update({
      medical_notes: optionalText(input.medicalNotes),
      allergy_tags: allergyTags,
      photo_consent: input.photoConsent,
    })
    .eq("id", childId)
    .eq("status", "active")
    .select("id");

  if (childrenError) {
    return { ok: false, error: errorMessage(childrenError) };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: NOT_YOUR_CHILD_ERROR };
  }

  const { error } = await supabase.from("child_profile").upsert(
    {
      child_id: childId,
      emergency_contact: optionalText(input.emergencyContact),
      pickup_authorization: optionalText(input.pickupAuthorization),
      diet: optionalText(input.diet),
      medication: optionalText(input.medication),
      nap_schedule: optionalText(input.napSchedule),
    },
    { onConflict: "child_id" },
  );

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  return { ok: true };
}

export async function addChildNote(
  childId: string,
  body: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: NOTE_EMPTY_ERROR };
  }

  const { error } = await supabase.from("child_notes").insert({
    child_id: childId,
    author_id: session.id,
    body: trimmed,
  });

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }

  return { ok: true };
}

export async function updateChildNote(
  noteId: string,
  body: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: NOTE_EMPTY_ERROR };
  }

  // 0 filas = la nota no existe o no es del autor (RLS child_notes_update_author).
  const { data, error } = await supabase
    .from("child_notes")
    .update({ body: trimmed })
    .eq("id", noteId)
    .select("id");

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }
  if (!data || data.length !== 1) {
    return { ok: false, error: NOTE_FORBIDDEN_ERROR };
  }

  return { ok: true };
}

export async function deleteChildNote(
  noteId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }

  // 0 filas = la nota no existe o no es del autor (RLS child_notes_delete_author).
  const { data, error } = await supabase
    .from("child_notes")
    .delete()
    .eq("id", noteId)
    .select("id");

  if (error) {
    return { ok: false, error: errorMessage(error) };
  }
  if (!data || data.length !== 1) {
    return { ok: false, error: NOTE_FORBIDDEN_ERROR };
  }

  return { ok: true };
}
