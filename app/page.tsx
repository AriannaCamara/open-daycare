import { Sidebar } from "@/app/_components/sidebar";
import { PostCard } from "@/app/_components/post-card";
import { posts, room, sessionUser } from "@/app/_data/feed";

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

export default function Home() {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar user={sessionUser} room={room} activeHref="/" />

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[760px] px-10 pb-20 pt-[34px]">
          <div className="mb-6">
            <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
              GUARDERÍA · {room.roomName.toUpperCase()}
            </div>
            <h1 className="m-0 font-display text-[30px] font-semibold text-ink">
              Buenas, {room.greetingName}
            </h1>
            <p className="mt-[5px] text-[14.5px] text-muted">
              {room.childCount} niños · {room.dateLabel}
            </p>
          </div>

          <a
            href="/crear-publicacion"
            className="mb-6 flex items-center gap-3.5 rounded-[18px] border border-border bg-surface px-[18px] py-3.5 shadow-[0_4px_14px_-10px_rgba(120,90,60,0.4)]"
          >
            <div className="flex size-10 flex-none items-center justify-center rounded-full bg-[#F2937A] font-display text-[16px] font-semibold text-white">
              {sessionUser.initial}
            </div>
            <span className="flex-1 text-[15px] text-muted-strong">
              Compartí un momento…
            </span>
            <span className="flex size-[38px] items-center justify-center rounded-xl bg-accent-ghost text-[#E0654A]">
              <CameraIcon />
            </span>
          </a>

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
    </div>
  );
}
