import type { Post, PostKind } from "@/app/_data/feed";
import { postKindLabels, postKindStyles } from "@/app/_data/feed";
import type { ActionResult } from "@/app/_actions/engagement";
import { CommentSection } from "@/app/_components/comment-section";
import { useState } from "react";

interface PostCardProps {
  post: Post;
  currentUserId: string;
  // Acciones reales; el card las muestra solo si es su propio post.
  onEdit?: () => void;
  onDelete?: () => void;
  // Like y comentarios (SPEC 17): los maneja FeedView.
  onToggleLike?: () => void;
  onAddComment?: (body: string) => Promise<ActionResult | null>;
  onUpdateComment?: (
    commentId: string,
    body: string,
  ) => Promise<ActionResult | null>;
  onDeleteComment?: (commentId: string) => Promise<void>;
}

interface KindVisual {
  dot: string;
  avatar: string;
}

const kindVisuals: Record<PostKind, KindVisual> = {
  meal: {
    dot: "bg-[#9A7B1E]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  nap: {
    dot: "bg-[#7B5FC0]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  activity: {
    dot: "bg-[#2E89A6]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  achievement: {
    dot: "bg-[#3E9B6C]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  mood: {
    dot: "bg-[#C56486]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  photo: {
    dot: "bg-[#D9684A]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  announcement: {
    dot: "bg-[#4E72C8]",
    avatar: "bg-[#CCD8F4] text-[#4E72C8]",
  },
};

// Relleno solo si el usuario actual ya reaccionó (likedByMe); si no, contorno.
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill={filled ? "#E0654A" : "none"}
      stroke={filled ? "#E0654A" : "currentColor"}
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

export function PostCard({
  post,
  currentUserId,
  onEdit,
  onDelete,
  onToggleLike,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: PostCardProps) {
  const visual = kindVisuals[post.kind];
  const kindStyle = postKindStyles[post.kind];
  const isAnnouncement = post.kind === "announcement";
  const isAuthor = post.authorId === currentUserId;
  const hasNames = post.givenNames.length > 0;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const headerName = hasNames
    ? post.givenNames.join(", ")
    : isAnnouncement
      ? "Anuncio general"
      : post.roomId
        ? "Toda la sala"
        : "Toda la guardería";

  return (
    <article className="rounded-[20px] border border-border bg-surface px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,0.5)]">
      <div className="mb-3.5 flex items-center gap-3">
        <div
          className={`flex size-11 flex-none items-center justify-center rounded-full font-display text-[17px] font-semibold ${visual.avatar}`}
        >
          {hasNames ? post.givenNames[0].charAt(0) : <MegaphoneIcon />}
        </div>
        <div className="flex-1">
          <div className="font-display text-[16.5px] font-semibold text-ink">
            {headerName}
          </div>
          <div className="text-[12.5px] text-muted-strong">
            {post.time} · publicado por vos
          </div>
        </div>
        <div
          className="flex items-center gap-[7px] rounded-full px-3 py-1.5"
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

      <div className="mb-2.5 text-[12.5px] text-muted-strong">
        Para: {post.audience}
      </div>

      <p className="m-0 text-[15.5px] leading-[1.55] text-ink-soft">
        {post.body}
      </p>

      {post.photos[0] && (
        <img
          src={post.photos[0].url}
          alt="Foto de la publicación"
          className="mt-3.5 h-[200px] w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-4 flex items-center gap-[18px] border-t border-line pt-3.5">
        <button
          type="button"
          onClick={onToggleLike}
          aria-label="Me gusta"
          className="flex cursor-pointer items-center gap-[7px] border-none bg-transparent p-0 text-[14px] font-bold text-accent-soft"
        >
          <HeartIcon filled={post.likedByMe} />
          {post.likes}
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen((open) => !open)}
          aria-label="Comentarios"
          className="flex cursor-pointer items-center gap-[7px] border-none bg-transparent p-0 text-[14px] font-bold text-muted"
        >
          <CommentIcon />
          {post.commentsCount}
        </button>
        <span className="flex-1" />
        {isAuthor && (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="cursor-pointer border-none bg-transparent p-0 text-[14px] font-extrabold text-[#B3452E]"
            >
              Editar
            </button>
            <span className="w-[18px]" />
            <button
              type="button"
              onClick={onDelete}
              className="cursor-pointer border-none bg-transparent p-0 text-[14px] font-extrabold text-[#B3452E]"
            >
              Borrar
            </button>
          </>
        )}
      </div>

      {commentsOpen && (
        <CommentSection
          comments={post.comments}
          currentUserId={currentUserId}
          onAddComment={onAddComment}
          onUpdateComment={onUpdateComment}
          onDeleteComment={onDeleteComment}
        />
      )}
    </article>
  );
}
