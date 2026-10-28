"use client";

import { useEffect, useState } from "react";
import { PostCard } from "@/app/_components/post-card";
import { CreatePostModal, type NewPostValues } from "@/app/_components/create-post-modal";
import { setNewPostOpenListener } from "@/app/_components/new-post-trigger";
import type { Post, RoomSummary } from "@/app/_data/feed";
import type { SidebarUser } from "@/app/_data/session";

interface FeedViewProps {
  user: SidebarUser;
  room: RoomSummary;
  initialPosts: Post[];
}

function CameraIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function currentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function FeedView({ user, room, initialPosts }: FeedViewProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setNewPostOpenListener(() => setOpen(true));
    return () => setNewPostOpenListener(null);
  }, []);

  function handlePublish(values: NewPostValues) {
    const post: Post = {
      id: `post-${Date.now()}`,
      kind: values.kind,
      givenNames: values.givenNames,
      time: currentTime(),
      audience:
        values.givenNames.length > 0
          ? `familia de ${values.givenNames.join(", ")}`
          : "toda la sala",
      body: values.body,
      likes: 0,
      comments: 0,
      photoUrl: values.photoUrls[0],
    };
    setPosts((current) => [post, ...current]);
    setOpen(false);
  }

  return (
    <>
      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-[34px]">
          <div className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
              GUARDERÍA · {room.roomName.toUpperCase()}
            </div>
            <h1 className="m-0 font-display text-[30px] font-semibold text-ink">
              Buenas, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-[5px] text-[14.5px] text-muted">
              {room.childCount} {room.childCount === 1 ? "niño" : "niños"} ·{" "}
              {room.dateLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mb-6 flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border border-border bg-surface px-[18px] py-3.5 text-left shadow-[0_4px_14px_-10px_rgba(120,90,60,0.4)]"
          >
            <div className="flex size-10 flex-none items-center justify-center rounded-full bg-[#F2937A] font-display text-[16px] font-semibold text-white">
              {user.initial}
            </div>
            <span className="flex-1 text-[15px] text-muted-strong">
              Compartí un momento…
            </span>
            <span className="flex size-[38px] items-center justify-center rounded-xl bg-accent-ghost text-[#E0654A]">
              <CameraIcon />
            </span>
          </button>

          <div className="mb-3.5 flex items-center gap-3.5">
            <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
              PUBLICADO HOY
            </span>
            <span className="h-px flex-1 bg-divider" />
          </div>

          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </main>

      <CreatePostModal
        open={open}
        onClose={() => setOpen(false)}
        onPublish={handlePublish}
      />
    </>
  );
}
