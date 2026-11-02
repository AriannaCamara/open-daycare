"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PostCard } from "@/app/_components/post-card";
import { CreatePostModal } from "@/app/_components/create-post-modal";
import { setNewPostOpenListener } from "@/app/_components/new-post-trigger";
import { deletePost } from "@/app/_actions/posts";
import type { PillChild, Post, RoomOption, RoomSummary } from "@/app/_data/feed";
import type { SidebarUser } from "@/app/_data/session";

interface FeedViewProps {
  user: SidebarUser;
  room: RoomSummary;
  initialPosts: Post[];
  canPublish: boolean;
  childPills: PillChild[];
  rooms: RoomOption[];
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

export function FeedView({
  user,
  room,
  initialPosts,
  canPublish,
  childPills,
  rooms,
}: FeedViewProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null);

  useEffect(() => {
    setNewPostOpenListener(() => setOpen(true));
    return () => setNewPostOpenListener(null);
  }, []);

  // Sin optimistic UI: el server action guarda y router.refresh() trae el feed.
  function handleSaved() {
    setEditingPost(null);
    setOpen(false);
    router.refresh();
  }

  // Borrado en dos pasos: el card pide confirmación (paso 8) y acá se ejecuta.
  async function handleDelete(post: Post) {
    const result = await deletePost(post.id);
    setPendingDelete(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    router.refresh();
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

          {canPublish && (
            <button
              type="button"
              onClick={() => {
                setEditingPost(null);
                setOpen(true);
              }}
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
          )}

          <div className="mb-3.5 flex items-center gap-3.5">
            <span className="text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
              PUBLICADO HOY
            </span>
            <span className="h-px flex-1 bg-divider" />
          </div>

          <div className="flex flex-col gap-4">
            {initialPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user.id}
                onEdit={() => {
                  setEditingPost(post);
                  setOpen(true);
                }}
                onDelete={() => setPendingDelete(post)}
              />
            ))}
          </div>
        </div>
      </main>

      {open && (
        <CreatePostModal
          mode={editingPost ? "edit" : "create"}
          initialPost={editingPost ?? undefined}
          childPills={childPills}
          rooms={rooms}
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
