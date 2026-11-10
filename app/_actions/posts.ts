"use server";

import { fetchSessionUser, isStaffRole } from "@/app/_data/session";
import type { PostKind } from "@/app/_data/feed";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SESSION_ERROR } from "./errors";

export interface PostInput {
  kind: PostKind;
  body: string; // trim
  roomId: string | null; // null = toda la guardería
  childIds: string[]; // [] = post de sala (sin etiquetas)
}

export type ActionResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

const BUCKET = "post-photos";
const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const KIND_ERROR = "Elegí un tipo.";
const BODY_ERROR = "Escribí una descripción.";
const AUDIENCE_ERROR = "Elegí al menos un niño o Toda la sala.";
const MAX_PHOTOS_ERROR = "Máximo 5 fotos.";
const PHOTO_SIZE_ERROR = "Cada foto debe pesar menos de 5 MB.";
const PHOTO_TYPE_ERROR = "Formatos permitidos: JPG, PNG o WebP.";
const STORAGE_ERROR = "No se pudieron subir las fotos. Intentá de nuevo.";
const FORBIDDEN_ERROR =
  "Solo el personal de la guardería puede publicar.";

const POST_KINDS: PostKind[] = [
  "meal",
  "nap",
  "activity",
  "achievement",
  "mood",
  "photo",
  "announcement",
];

interface ChildCheckRow {
  id: string;
  full_name: string;
  photo_consent: boolean;
}

interface PhotoRow {
  id: string;
  url: string;
}

function validateInput(input: PostInput): string | null {
  if (!POST_KINDS.includes(input.kind)) {
    return KIND_ERROR;
  }
  if (!input.body.trim()) {
    return BODY_ERROR;
  }
  // Anuncio: siempre "toda la sala" (roomId obligatorio, sin niños etiquetados).
  const needsAudience = input.kind !== "announcement";
  if (needsAudience && !input.roomId && input.childIds.length === 0) {
    return AUDIENCE_ERROR;
  }
  return null;
}

function validatePhotos(photoFiles: File[]): string | null {
  if (photoFiles.length > MAX_PHOTOS) {
    return MAX_PHOTOS_ERROR;
  }
  for (const file of photoFiles) {
    if (file.size > MAX_PHOTO_BYTES) {
      return PHOTO_SIZE_ERROR;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return PHOTO_TYPE_ERROR;
    }
  }
  return null;
}

// Los niños deben existir, estar activos y, si hay fotos, tener consent.
async function checkChildren(
  supabase: SupabaseClient,
  childIds: string[],
  hasPhotos: boolean,
): Promise<{ ok: true; children: ChildCheckRow[] } | { ok: false; error: string }> {
  if (childIds.length === 0) {
    return { ok: true, children: [] };
  }

  const { data, error } = await supabase
    .from("children")
    .select("id, full_name, photo_consent")
    .in("id", childIds)
    .eq("status", "active");

  if (error) {
    return { ok: false, error: "No pudimos verificar los niños seleccionados." };
  }

  const children = (data ?? []) as ChildCheckRow[];
  if (children.length !== childIds.length) {
    return { ok: false, error: "No pudimos encontrar los niños seleccionados." };
  }

  if (hasPhotos) {
    const blocked = children.filter((child) => !child.photo_consent);
    if (blocked.length > 0) {
      const names = blocked.map((child) => child.full_name).join(", ");
      const verb = blocked.length === 1 ? "tiene" : "tienen";
      return {
        ok: false,
        error: `No se puede publicar con fotos: ${names} ${verb} desactivado el consentimiento de fotos.`,
      };
    }
  }

  return { ok: true, children };
}

async function fetchDaycareId(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("users")
    .select("daycare_id")
    .eq("id", userId)
    .maybeSingle();

  return (data?.daycare_id as string | undefined) ?? null;
}

// Path {daycare_id}/{post_id}/{index}-{uuid}.{ext}: el post_id en la carpeta
// permite que las policies de storage deleguen en can_edit_post/can_read_post.
function buildPhotoPath(params: {
  daycareId: string;
  postId: string;
  index: number;
  file: File;
}): string {
  const extensionByMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensionByMime[params.file.type];
  const unique = crypto.randomUUID();

  return `${params.daycareId}/${params.postId}/${params.index}-${unique}.${extension}`;
}

// Sube todas las fotos; si alguna falla borra las ya subidas (rollback) y
// devuelve error. Devuelve los paths subidos, en orden.
async function uploadPhotos(params: {
  supabase: SupabaseClient;
  daycareId: string;
  postId: string;
  photoFiles: File[];
}): Promise<{ ok: true; paths: string[] } | { ok: false; error: string }> {
  const paths: string[] = [];

  for (const [index, file] of params.photoFiles.entries()) {
    const path = buildPhotoPath({
      daycareId: params.daycareId,
      postId: params.postId,
      index,
      file,
    });

    const { error } = await params.supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type });

    if (error) {
      if (paths.length > 0) {
        await params.supabase.storage.from(BUCKET).remove(paths);
      }
      return { ok: false, error: STORAGE_ERROR };
    }

    paths.push(path);
  }

  return { ok: true, paths };
}

async function removePhotos(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths);
  }
}

async function replacePostChildren(
  supabase: SupabaseClient,
  postId: string,
  childIds: string[],
): Promise<boolean> {
  const { error: deleteError } = await supabase
    .from("post_children")
    .delete()
    .eq("post_id", postId);

  if (deleteError) return false;

  if (childIds.length === 0) return true;

  const { error: insertError } = await supabase
    .from("post_children")
    .insert(childIds.map((childId) => ({ post_id: postId, child_id: childId })));

  return !insertError;
}

export async function createPost(
  input: PostInput,
  photoFiles: File[],
): Promise<ActionResult> {
  const inputError = validateInput(input);
  if (inputError) {
    return { ok: false, error: inputError };
  }

  const photoError = validatePhotos(photoFiles);
  if (photoError) {
    return { ok: false, error: photoError };
  }

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }
  if (!isStaffRole(session.role)) {
    return { ok: false, error: FORBIDDEN_ERROR };
  }

  const childrenCheck = await checkChildren(
    supabase,
    input.childIds,
    photoFiles.length > 0,
  );
  if (!childrenCheck.ok) {
    return childrenCheck;
  }

  const daycareId = await fetchDaycareId(supabase, session.id);
  if (!daycareId) {
    return { ok: false, error: SESSION_ERROR };
  }

  const childIds = [...new Set(input.childIds)];
  const body = input.body.trim();

  // El id se pregenera porque INSERT ... RETURNING aplica también la policy de
  // SELECT (can_read_post), que hace un self-lookup a posts: la fila nueva no
  // es visible dentro del mismo comando y el insert fallaría con 42501.
  const postId = crypto.randomUUID();

  const { error: insertError } = await supabase.from("posts").insert({
    id: postId,
    author_id: session.id,
    room_id: input.roomId,
    type: input.kind,
    body,
  });

  if (insertError) {
    return { ok: false, error: "No pudimos crear la publicación. Intentá de nuevo." };
  }

  const childrenError = await replacePostChildren(supabase, postId, childIds);
  if (!childrenError) {
    // Sin etiquetas no sirve el post: lo borra (cascade limpia lo insertado).
    await supabase.from("posts").delete().eq("id", postId);
    return { ok: false, error: "No pudimos crear la publicación. Intentá de nuevo." };
  }

  if (photoFiles.length > 0) {
    const upload = await uploadPhotos({
      supabase,
      daycareId,
      postId,
      photoFiles,
    });

    if (!upload.ok) {
      // Rollback: no queda ni el post ni filas ni archivos.
      await supabase.from("posts").delete().eq("id", postId);
      return upload;
    }

    const { error: photoRowsError } = await supabase.from("post_photos").insert(
      upload.paths.map((path, index) => ({
        post_id: postId,
        url: path,
        position: index,
      })),
    );

    if (photoRowsError) {
      await removePhotos(supabase, upload.paths);
      await supabase.from("posts").delete().eq("id", postId);
      return { ok: false, error: STORAGE_ERROR };
    }
  }

  return { ok: true, postId };
}

export async function updatePost(
  postId: string,
  input: PostInput,
  photoFiles: File[],
  keptPhotoIds: string[],
): Promise<ActionResult> {
  const inputError = validateInput(input);
  if (inputError) {
    return { ok: false, error: inputError };
  }

  const photoError = validatePhotos(photoFiles);
  if (photoError) {
    return { ok: false, error: photoError };
  }

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }
  if (!isStaffRole(session.role)) {
    return { ok: false, error: FORBIDDEN_ERROR };
  }

  // La RLS (posts_update_author) también lo exige; acá mejora el mensaje.
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("author_id", session.id)
    .maybeSingle();

  if (!existing) {
    return {
      ok: false,
      error: "No pudimos encontrar la publicación. Intentá de nuevo.",
    };
  }

  const childrenCheck = await checkChildren(
    supabase,
    input.childIds,
    photoFiles.length > 0,
  );
  if (!childrenCheck.ok) {
    return childrenCheck;
  }

  const daycareId = await fetchDaycareId(supabase, session.id);
  if (!daycareId) {
    return { ok: false, error: SESSION_ERROR };
  }

  // Sube primero: si falla, no se toca nada existente.
  const upload =
    photoFiles.length > 0
      ? await uploadPhotos({ supabase, daycareId, postId, photoFiles })
      : null;

  if (upload && !upload.ok) {
    return upload;
  }

  // Fotos previas antes de insertar las nuevas (para saber cuáles quitar).
  const { data: previousPhotos } = await supabase
    .from("post_photos")
    .select("id, url")
    .eq("post_id", postId);

  const removedPhotos = ((previousPhotos ?? []) as PhotoRow[]).filter(
    (photo) => !keptPhotoIds.includes(photo.id),
  );

  const { error: updateError } = await supabase
    .from("posts")
    .update({
      room_id: input.roomId,
      type: input.kind,
      body: input.body.trim(),
    })
    .eq("id", postId);

  if (updateError) {
    if (upload) await removePhotos(supabase, upload.paths);
    return { ok: false, error: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  const childrenOk = await replacePostChildren(supabase, postId, input.childIds);
  if (!childrenOk) {
    if (upload) await removePhotos(supabase, upload.paths);
    return { ok: false, error: "No pudimos guardar los cambios. Intentá de nuevo." };
  }

  if (upload) {
    // Las nuevas siguen a las conservadas en el orden de position.
    const { error: photoRowsError } = await supabase.from("post_photos").insert(
      upload.paths.map((path, index) => ({
        post_id: postId,
        url: path,
        position: keptPhotoIds.length + index,
      })),
    );

    if (photoRowsError) {
      await removePhotos(supabase, upload.paths);
      return { ok: false, error: STORAGE_ERROR };
    }
  }

  // Borra del storage (y sus filas) las fotos no conservadas.
  if (removedPhotos.length > 0) {
    await removePhotos(
      supabase,
      removedPhotos.map((photo) => photo.url),
    );
    await supabase
      .from("post_photos")
      .delete()
      .in("id", removedPhotos.map((photo) => photo.id));
  }

  return { ok: true, postId };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }
  if (!isStaffRole(session.role)) {
    return { ok: false, error: FORBIDDEN_ERROR };
  }

  // La RLS (posts_delete_author) también lo exige; acá mejora el mensaje.
  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .eq("author_id", session.id)
    .maybeSingle();

  if (!existing) {
    return {
      ok: false,
      error: "No pudimos encontrar la publicación. Intentá de nuevo.",
    };
  }

  const { data: photos } = await supabase
    .from("post_photos")
    .select("url")
    .eq("post_id", postId);

  const paths = ((photos ?? []) as { url: string }[]).map((photo) => photo.url);

  // Storage primero: si falla, el post queda y no quedan archivos huérfanos.
  const { error: removeError } =
    paths.length > 0
      ? await supabase.storage.from(BUCKET).remove(paths)
      : { error: null };

  if (removeError) {
    return { ok: false, error: "No pudimos borrar las fotos. Intentá de nuevo." };
  }

  // Cascade borra post_children y post_photos.
  const { error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", session.id);

  if (deleteError) {
    return { ok: false, error: "No pudimos borrar la publicación. Intentá de nuevo." };
  }

  return { ok: true, postId };
}
