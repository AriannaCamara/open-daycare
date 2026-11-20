"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "@/app/_components/avatar";
import { PostCard } from "@/app/_components/post-card";
import {
  addComment,
  deleteComment,
  toggleLike,
  updateComment,
  type ActionResult,
} from "@/app/_actions/engagement";
import type { Post } from "@/app/_data/feed";
import type { FamilyChild } from "@/app/_data/family-children";
import type { SidebarUser } from "@/app/_data/session";

interface FamilyFeedViewProps {
  user: SidebarUser;
  dateLabel: string; // "martes 17 jun" (fetchFeedSummary)
  initialPosts: Post[];
  familyChildren: FamilyChild[];
}

// Pestañas pill: activa oscura, inactiva borde claro (mismos estilos que las
// pestañas del resumen del día, SPEC 23).
const activeTabClassName = "border-[#3F362E] bg-[#3F362E] text-white";
const inactiveTabClassName = "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]";

// "Mateo Fernández" → "Mateo" (mismo given name que el card del feed).
function toGivenName(fullName: string): string {
  return fullName.trim().split(" ")[0];
}

// "HH:MM · autor · sala": la sala se omite en los anuncios sin room_id.
function buildSubtitle(post: Post): string {
  return [post.time, post.authorName, post.roomName]
    .filter(Boolean)
    .join(" · ");
}

export function FamilyFeedView({
  user,
  dateLabel,
  initialPosts,
  familyChildren,
}: FamilyFeedViewProps) {
  const router = useRouter();
  const [selectedChildId, setSelectedChildId] = useState<string | "all">("all");

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

  // Filtro por hijo client-side: los posts ya vienen con childIds (SPEC 24).
  // Los anuncios sin post_children solo se ven en "Todos".
  const visiblePosts =
    selectedChildId === "all"
      ? initialPosts
      : initialPosts.filter((post) => post.childIds.includes(selectedChildId));

  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-[34px]">
        <div className="mb-5">
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
  );
}
