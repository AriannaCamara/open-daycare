"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/app/_components/avatar";
import { CreatePostModal } from "@/app/_components/create-post-modal";
import { PostCard } from "@/app/_components/post-card";
import { deletePost } from "@/app/_actions/posts";
import {
  addComment,
  deleteComment,
  toggleLike,
  updateComment,
  type ActionResult,
} from "@/app/_actions/engagement";
import type { Post } from "@/app/_data/feed";
import { buildSubtitle } from "@/app/_data/feed";
import type { FamilyChild } from "@/app/_data/family-children";
import type { SidebarUser } from "@/app/_data/session";

interface FamilyFeedViewProps {
  user: SidebarUser;
  dateLabel: string; // "martes 17 jun" (fetchFeedSummary)
  initialPosts: Post[];
  familyChildren: FamilyChild[];
}

// Botón "Crear publicación" del header familiar (SPEC 29).
function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// Pestañas pill: activa oscura, inactiva borde claro (mismos estilos que las
// pestañas del resumen del día, SPEC 23).
const activeTabClassName = "border-[#3F362E] bg-[#3F362E] text-white";
const inactiveTabClassName = "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]";

// "Mateo Fernández" �  "Mateo" (mismo given name que el card del feed).
function toGivenName(fullName: string): string {
  return fullName.trim().split(" ")[0];
}

export function FamilyFeedView({
  user,
  dateLabel,
  initialPosts,
  familyChildren,
}: FamilyFeedViewProps) {
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string | "all">("all");

  // Modal de publicación (SPEC 29): variante "family" y flujo de edición /
  // borrado igual que FeedView (SPEC 16), sin optimistic UI.
  const [open, setOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null);

  // Mismo patrón que FeedView (SPEC 16/17): sin optimistic UI, la action
  // guarda y router.refresh() trae el feed. El flag descarta dobles clics.
  const engagementPending = useRef(false);

  async function runEngagement(
    action: () => Promise<ActionResult>,
  ): Promise<ActionResult | null> {
    if (engagementPending.current) return null;
    engagementPending.current = true;
    try {
      const result = await action();
      if (result.ok) router.refresh();
      return result;
    } finally {
      engagementPending.current = false;
    }
  }

  async function handleToggleLike(postId: string): Promise<void> {
    const result = await runEngagement(() => toggleLike(postId));
    if (result && !result.ok) window.alert(result.error);
  }

  function handleAddComment(postId: string, body: string) {
    return runEngagement(() => addComment(postId, body));
  }

  function handleUpdateComment(commentId: string, body: string) {
    return runEngagement(() => updateComment(commentId, body));
  }

  async function handleDeleteComment(commentId: string): Promise<void> {
    const result = await runEngagement(() => deleteComment(commentId));
    if (result && !result.ok) window.alert(result.error);
  }

  // Sin optimistic UI (mismo patrón que FeedView): la action guarda y
  // router.refresh() trae el feed.
  function handleSaved() {
    setEditingPost(null);
    setOpen(false);
    router.refresh();
  }

  // Borrado en dos pasos: el card pide confirmación y acá se ejecuta.
  async function handleDelete(post: Post) {
    const result = await deletePost(post.id);
    setPendingDelete(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
  }

  // Filtro por hijo client-side: los posts ya vienen con childIds (SPEC 24).
  // Los anuncios sin post_children solo se ven en "Todos".
  const visiblePosts =
    selectedChildId === "all"
      ? initialPosts
      : initialPosts.filter((post) => post.childIds.includes(selectedChildId));

  return (
    <>
      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-[34px]">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
                TU FAMILIA
              </div>
              <h1 className="m-0 font-display text-[30px] font-semibold text-ink">
                Hola, {toGivenName(user.name)}
              </h1>
              <p className="mt-[5px] text-[14.5px] text-muted">
                Así va el día de hoy
              </p>
            </div>

            {/* Se oculta sin hijos: no hay audiencia posible (SPEC 29). */}
            {familyChildren.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setEditingPost(null);
                  setOpen(true);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-[14px] border-none bg-accent-ghost px-4 py-2.5 text-[14px] font-extrabold text-[#E0654A] shadow-[0_4px_14px_-10px_rgba(120,90,60,0.4)]"
              >
                <PlusIcon />
                Crear publicación
              </button>
            )}
          </div>

          <div className="mb-[22px] flex flex-wrap gap-[10px]">
            {familyChildren.map((child) => {
              const isActive = child.id === selectedChildId;
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setSelectedChildId(child.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-[15px] py-[7px] text-[14px] font-bold ${isActive ? activeTabClassName : inactiveTabClassName}`}
                >
                  <Avatar
                    initial={child.initial}
                    tone={child.tone}
                    variant="child"
                    className="size-[26px] text-[13px]"
                  />
                  {toGivenName(child.fullName)}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setSelectedChildId("all")}
              className={`cursor-pointer rounded-full border-[1.5px] px-[16px] py-[7px] text-[14px] font-bold ${
                selectedChildId === "all"
                  ? activeTabClassName
                  : inactiveTabClassName
              }`}
            >
              Todos
            </button>
          </div>

          <div className="mb-3.5 flex items-center gap-3.5">
            <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
              HOY · {dateLabel.toUpperCase()}
            </span>
            <span className="h-px flex-1 bg-divider" />
          </div>

          {visiblePosts.length === 0 ? (
            <p className="m-0 text-[14.5px] text-muted">
              Todavía no hay publicaciones.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user.id}
                  subtitle={buildSubtitle(post)}
                  showAudience={false}
                  onOpen={() => router.push(`/posts/${post.id}`)}
                  onEdit={() => {
                    setEditingPost(post);
                    setOpen(true);
                  }}
                  onDelete={() => setPendingDelete(post)}
                  onToggleLike={() => handleToggleLike(post.id)}
                  onAddComment={(body) => handleAddComment(post.id, body)}
                  onUpdateComment={(commentId, body) =>
                    handleUpdateComment(commentId, body)
                  }
                  onDeleteComment={handleDeleteComment}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {open && (
        <CreatePostModal
          mode={editingPost ? "edit" : "create"}
          initialPost={editingPost ?? undefined}
          variant="family"
          // En variante family no se usan: la audiencia la resuelve el servidor.
          childPills={[]}
          rooms={[]}
          onClose={() => {
            setEditingPost(null);
            setOpen(false);
          }}
          onSaved={handleSaved}
        />
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(63,54,46,0.45)] px-6"
          onClick={() => setPendingDelete(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] p-[26px] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="m-0 font-display text-[19px] font-semibold text-ink">
              ¿Borrar la publicación?
            </h2>
            <p className="mb-[22px] mt-2 text-[14.5px] leading-[1.5] text-muted-strong">
              Se eliminarán sus fotos y no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="cursor-pointer rounded-[12px] border border-[#ECE0D0] bg-white px-4 py-2.5 text-[14px] font-bold text-muted-strong"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(pendingDelete)}
                className="cursor-pointer rounded-[12px] border-none bg-[#B3452E] px-4 py-2.5 text-[14px] font-extrabold text-white"
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
