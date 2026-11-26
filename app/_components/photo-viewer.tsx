import Link from "next/link";
import {
  buildSubtitle,
  type Post,
  type PostPhoto,
} from "@/app/_data/feed";

interface PhotoViewerProps {
  post: Post;
  photo: PostPhoto;
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon() {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

const circleButtonClassName =
  "flex size-[42px] flex-none items-center justify-center rounded-full bg-white/[0.14] text-white";

// Visor de fotos a pantalla completa (SPEC 28): componente puro, sin fetch.
// El nombre usa el primer given name (como el pill del feed); si el post no
// tiene niños se muestra el tipo de audiencia, igual que en el detalle.
export function PhotoViewer({ post, photo }: PhotoViewerProps) {
  const headerName =
    post.givenNames[0] ??
    (post.kind === "announcement"
      ? "Anuncio general"
      : post.roomId
        ? "Toda la sala"
        : "Toda la guardería");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#1A1714] text-white">
      <header className="flex items-center justify-between gap-3 px-[26px] py-[22px]">
        <Link
          href={`/posts/${post.id}`}
          aria-label="Cerrar visor"
          className={circleButtonClassName}
        >
          <CloseIcon />
        </Link>

        <div className="min-w-0 text-center">
          <div className="truncate font-display text-[16px] font-semibold">
            {headerName}
          </div>
          <div className="truncate text-[13px] text-white/60">
            {buildSubtitle(post)}
          </div>
        </div>

        <a
          href={photo.url}
          download
          title="Descargar"
          className={circleButtonClassName}
        >
          <DownloadIcon />
        </a>
      </header>

      <main className="flex min-h-0 flex-1 items-center justify-center px-[26px]">
        <img
          src={photo.url}
          alt="Foto de la publicación"
          className="max-h-full max-w-[760px] rounded-[20px] object-contain"
        />
      </main>

      <footer className="px-[26px] pb-[34px] pt-6 text-center">
        <p className="mx-auto m-0 max-w-[560px] text-[15px] leading-[1.55] text-white/85">
          {post.body}
        </p>
      </footer>
    </div>
  );
}
