"use server";

import { fetchSessionUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";
import { PROFANITY_ERROR } from "@/utils/profanity";
import { COMMENT_EMPTY_ERROR, SESSION_ERROR } from "./errors";

export type ActionResult = { ok: true } | { ok: false; error: string };

const LIKE_ERROR = "No podés reaccionar a esta publicación.";
const COMMENT_POST_ERROR = "No podés comentar esta publicación.";
const COMMENT_OWNERSHIP_ERROR = "No podés modificar este comentario.";

// Mensaje que levanta el trigger comments_profanity_guard en la DB: la action
// no valida groserías por su cuenta, solo traduce ese error (la DB es la
// única autoridad del filtro).
const PROFANITY_BLOCKED = "comment_profanity_blocked";

function isProfanityBlocked(error: { message: string } | null): boolean {
  return Boolean(error?.message.includes(PROFANITY_BLOCKED));
}

// Alterna la reacción "love" del usuario: existe → delete, no existe → insert.
export async function toggleLike(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  const { data: existing, error: selectError } = await supabase
    .from("reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", session.id)
    .eq("type", "love")
    .maybeSingle();

  if (selectError) return { ok: false, error: LIKE_ERROR };

  if (existing) {
    const { error } = await supabase.from("reactions").delete().eq("id", existing.id);
    return error ? { ok: false, error: LIKE_ERROR } : { ok: true };
  }

  const { error: insertError } = await supabase.from("reactions").insert({
    post_id: postId,
    user_id: session.id,
    type: "love",
  });

  // RLS reactions_insert_own exige can_read_post: 42501 si no puede leerlo.
  return insertError ? { ok: false, error: LIKE_ERROR } : { ok: true };
}

export async function addComment(
  postId: string,
  body: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: COMMENT_EMPTY_ERROR };

  const { error } = await supabase.from("comments").insert({
    post_id: postId,
    author_id: session.id,
    body: trimmed,
  });

  if (!error) return { ok: true };
  if (isProfanityBlocked(error)) return { ok: false, error: PROFANITY_ERROR };
  return { ok: false, error: COMMENT_POST_ERROR };
}

export async function updateComment(
  commentId: string,
  body: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: COMMENT_EMPTY_ERROR };

  // 0 filas = RLS comments_update_own (autor ajeno); el trigger de groserías
  // también corre en el update y vuelve a filtrar el cuerpo.
  const { data, error } = await supabase
    .from("comments")
    .update({ body: trimmed })
    .eq("id", commentId)
    .select("id");

  if (error) {
    if (isProfanityBlocked(error)) return { ok: false, error: PROFANITY_ERROR };
    return { ok: false, error: COMMENT_OWNERSHIP_ERROR };
  }
  if (!data || data.length !== 1) {
    return { ok: false, error: COMMENT_OWNERSHIP_ERROR };
  }

  return { ok: true };
}

export async function deleteComment(
  commentId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) return { ok: false, error: SESSION_ERROR };

  const { data, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .select("id");

  if (error || !data || data.length !== 1) {
    return { ok: false, error: COMMENT_OWNERSHIP_ERROR };
  }

  return { ok: true };
}
