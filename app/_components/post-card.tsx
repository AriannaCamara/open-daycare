import type { Post, PostKind } from "@/app/_data/feed";
import { postKindLabels } from "@/app/_data/feed";
import Link from "next/link";

interface PostCardProps {
  post: Post;
}

interface KindStyle {
  pill: string;
  dot: string;
  avatar: string;
}

const kindStyles: Record<PostKind, KindStyle> = {
  achievement: {
    pill: "bg-[#CFEBD8] text-[#3E9B6C]",
    dot: "bg-[#3E9B6C]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  activity: {
    pill: "bg-[#C7E7F1] text-[#2E89A6]",
    dot: "bg-[#2E89A6]",
    avatar: "bg-[#A9D9E8] text-[#1F7A93]",
  },
  announcement: {
    pill: "bg-[#CCD8F4] text-[#4E72C8]",
    dot: "bg-[#4E72C8]",
    avatar: "bg-[#CCD8F4] text-[#4E72C8]",
  },
};

function HeartIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="#E0654A"
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

function ImageIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
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

export function PostCard({ post }: PostCardProps) {
  const style = kindStyles[post.kind];
  const isAnnouncement = post.kind === "announcement";

  return (
    <article className="rounded-[20px] border border-border bg-surface px-[22px] py-5 shadow-[0_4px_16px_-12px_rgba(120,90,60,0.5)]">
      <div className="mb-3.5 flex items-center gap-3">
        <div
          className={`flex size-11 flex-none items-center justify-center rounded-full font-display text-[17px] font-semibold ${style.avatar}`}
        >
          {isAnnouncement ? <MegaphoneIcon /> : post.childName?.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="font-display text-[16.5px] font-semibold text-ink">
            {isAnnouncement ? "Anuncio general" : post.childName}
          </div>
          <div className="text-[12.5px] text-muted-strong">
            {post.time} · publicado por vos
          </div>
        </div>
        <div
          className={`flex items-center gap-[7px] rounded-full px-3 py-1.5 ${style.pill}`}
        >
          <span className={`size-2 rounded-full ${style.dot}`} />
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

      {post.photoLabel && (
        <Link
          href="/foto"
          className="mt-3.5 flex h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1] text-[#B0A290]"
        >
          <ImageIcon />
          <span className="text-[13.5px]">{post.photoLabel}</span>
        </Link>
      )}

      <div className="mt-4 flex items-center gap-[18px] border-t border-line pt-3.5">
        <span className="flex items-center gap-[7px] text-[14px] font-bold text-accent-soft">
          <HeartIcon />
          {post.likes}
        </span>
        <Link
          href="/detalle-publicacion"
          className="flex items-center gap-[7px] text-[14px] font-bold text-muted"
        >
          <CommentIcon />
          {post.comments}
        </Link>
        <span className="flex-1" />
        <Link
          href="/create-post"
          className="text-[14px] font-extrabold text-[#C5503A]"
        >
          Editar
        </Link>
      </div>
    </article>
  );
}
