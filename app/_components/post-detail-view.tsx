"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addComment,
  deleteComment,
  toggleLike,
  updateComment,
  type ActionResult,
} from "@/app/_actions/engagement";
import { CommentSection } from "@/app/_components/comment-section";
import { kindVisuals } from "@/app/_components/post-card";
import {
  buildSubtitle,
  postKindLabels,
  postKindStyles,
  type Post,
} from "@/app/_data/feed";

interface PostDetailViewProps {
  post: Post;
  currentUserId: string;
  // "/family" para parent, "/staff" para staff (resuelto desde el rol).
  backHref: string;
}

function ArrowLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

// Relleno solo si el usuario ya reaccionó (mismo criterio que el card).
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  );
}

const neutralButtonClassName =
  "flex flex-1 cursor-pointer items-center justify-center gap-[9px] rounded-[14px] border-[1.5px] border-border bg-surface p-[13px] text-[15px] font-extrabold text-[#6E6359]";

const likedButtonClassName =
  "flex flex-1 cursor-pointer items-center justify-center gap-[9px] rounded-[14px] border-[1.5px] border-[#F2A78E] bg-[#FBD8CC] p-[13px] text-[15px] font-extrabold text-accent";

// Detalle de una publicación (SPEC 25): cabecera, cuerpo, fotos, contador de
// likes y comentarios. Reutiliza las actions de engagement de la SPEC 17
// (mismo patrón sin optimistic UI: la action guarda y router.refresh() trae
// el post actualizado).
export function PostDetailView({
  post,
  currentUserId,
  backHref,
}: PostDetailViewProps) {
  const router = useRouter();
  const commentInputRef = useRef<HTMLInputElement>(null);

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

  async function handleToggleLike(): Promise<void> {
    const result = await runEngagement(() => toggleLike(post.id));
    if (result && !result.ok) window.alert(result.error);
  }

  function handleAddComment(body: string) {
    return runEngagement(() => addComment(post.id, body));
  }

  function handleUpdateComment(commentId: string, body: string) {
    return runEngagement(() => updateComment(commentId, body));
  }

  async function handleDeleteComment(commentId: string): Promise<void> {
    const result = await runEngagement(() => deleteComment(commentId));
    if (result && !result.ok) window.alert(result.error);
  }

  const visual = kindVisuals[post.kind];
  const kindStyle = postKindStyles[post.kind];
  const isAnnouncement = post.kind === "announcement";
  const hasNames = post.givenNames.length > 0;
  const headerName = hasNames
    ? post.givenNames.join(", ")
    : isAnnouncement
      ? "Anuncio general"
      : post.roomId
        ? "Toda la sala"
        : "Toda la guardería";

  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[680px] px-10 pb-20 pt-[34px]">
        <Link
          href={backHref}
          className="mb-[18px] inline-flex items-center gap-[7px] text-[14px] font-bold text-muted"
        >
          <ArrowLeftIcon />
          Volver al feed
        </Link>

        <article className="rounded-[22px] border border-border bg-surface px-[26px] py-6 shadow-[0_6px_22px_-14px_rgba(120,90,60,0.5)]">
          {/* flex-wrap + min-w: en pantallas angostas el pill baja de línea
              en vez de comprimir el nombre y el subtítulo (SPEC 25). */}
          <div className="mb-4 flex flex-wrap items-center gap-[13px]">
            <div
              className={`flex size-12 flex-none items-center justify-center rounded-full font-display text-[18px] font-semibold ${visual.avatar}`}
            >
              {hasNames ? post.givenNames[0].charAt(0) : <MegaphoneIcon />}
            </div>
            <div className="min-w-[150px] flex-1">
              <div className="font-display text-[17px] font-semibold text-ink">
                {headerName}
              </div>
              <div className="text-[13px] text-muted-strong">
                {buildSubtitle(post)}
              </div>
            </div>
            <div
              className="flex flex-none items-center gap-[7px] rounded-full px-3 py-1.5"
              style={{
                backgroundColor: kindStyle.pill.bg,
                color: kindStyle.pill.text,
              }}
            >
              <span className={`size-2 rounded-full ${visual.dot}`} />
              <span className="text-[12px] font-extrabold tracking-[0.5px]">
                {postKindLabels[post.kind]}
              </span>
            </div>
          </div>

          <p className="m-0 text-[16px] leading-[1.6] text-ink-soft">
            {post.body}
          </p>

          {post.photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.url}
              alt="Foto de la publicación"
              className="mt-4 h-[280px] w-full rounded-[16px] object-cover"
            />
          ))}

          <div className="mt-[18px] flex items-center gap-2.5 text-[14px] text-muted">
            A {post.likes} personas les gusta
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={handleToggleLike}
              aria-pressed={post.likedByMe}
              className={post.likedByMe ? likedButtonClassName : neutralButtonClassName}
            >
              <HeartIcon filled={post.likedByMe} />
              Me encanta
            </button>
            <button
              type="button"
              onClick={() => commentInputRef.current?.focus()}
              className={neutralButtonClassName}
            >
              <CommentIcon />
              Comentar
            </button>
          </div>
        </article>

        <div className="mt-6">
          <CommentSection
            comments={post.comments}
            currentUserId={currentUserId}
            inputRef={commentInputRef}
            onAddComment={handleAddComment}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
          />
        </div>
      </div>
    </main>
  );
}
