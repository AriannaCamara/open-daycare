"use server";

import { fetchSessionUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";
import type { ActionResult } from "./child-profile";
import { SESSION_ERROR } from "./errors";

const NAME_EMPTY_ERROR = "Escribí tu nombre.";
const SAVE_ERROR = "No se pudo guardar. Intentá de nuevo.";
const NOT_YOUR_CHILD_ERROR = "Este niño no es hijo tuyo.";
const PASSWORD_MISMATCH_ERROR = "Las contraseñas no coinciden.";
const PASSWORD_SHORT_ERROR = "La contraseña debe tener al menos 6 caracteres.";
const PASSWORD_ERROR = "No se pudo cambiar la contraseña.";

const MIN_PASSWORD_LENGTH = 6;

// Actualiza el nombre visible (users.full_name, policy users_select_own).
export async function updateProfileName(name: string): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: NAME_EMPTY_ERROR };

  const { data, error } = await supabase
    .from("users")
    .update({ full_name: trimmed })
    .eq("id", session.id)
    .select("id");

  if (error || !data || data.length !== 1) {
    return { ok: false, error: SAVE_ERROR };
  }

  return { ok: true };
}

// Persiste las preferencias de notificación en columnas existentes.
export async function updateNotificationSettings(
  notifyOnPost: boolean,
  dailySummaryEnabled: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  if (typeof notifyOnPost !== "boolean" || typeof dailySummaryEnabled !== "boolean") {
    return { ok: false, error: SAVE_ERROR };
  }

  const { data, error } = await supabase
    .from("users")
    .update({
      notify_on_post: notifyOnPost,
      daily_summary_enabled: dailySummaryEnabled,
    })
    .eq("id", session.id)
    .select("id");

  if (error || !data || data.length !== 1) {
    return { ok: false, error: SAVE_ERROR };
  }

  return { ok: true };
}

// Lista blanca de columna: solo photo_consent (RLS children_update_parent_linked).
export async function setChildPhotoConsent(
  childId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  if (typeof enabled !== "boolean") {
    return { ok: false, error: SAVE_ERROR };
  }

  const { data, error } = await supabase
    .from("children")
    .update({ photo_consent: enabled })
    .eq("id", childId)
    .eq("status", "active")
    .select("id");

  if (error) {
    return { ok: false, error: error.code === "42501" ? NOT_YOUR_CHILD_ERROR : SAVE_ERROR };
  }
  // 0 filas = RLS (children_update_parent_linked) o niño inexistente.
  if (!data || data.length === 0) {
    return { ok: false, error: NOT_YOUR_CHILD_ERROR };
  }

  return { ok: true };
}

// Cambio de contraseña vía Auth; la igualdad y el largo se validan también
// en el cliente, pero el servidor es la autoridad.
export async function changePassword(
  newPassword: string,
  confirmPassword: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  if (newPassword !== confirmPassword) {
    return { ok: false, error: PASSWORD_MISMATCH_ERROR };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: PASSWORD_SHORT_ERROR };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  // Se muestra el mensaje de Auth tal cual (p. ej. "Password should be at
  // least 6 characters" o re-autenticación requerida).
  if (error) return { ok: false, error: error.message || PASSWORD_ERROR };

  return { ok: true };
}
