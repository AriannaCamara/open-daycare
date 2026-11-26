import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PhotoViewer } from "@/app/_components/photo-viewer";
import { fetchPostById } from "@/app/_data/posts";
import { fetchSessionUser } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

// Fallback de Suspense en tono del visor (fondo oscuro) para no parpadear claro.
function ViewerFallback() {
  return (
    <div className="flex h-screen flex-col bg-[#1A1714]">
      <div className="flex items-center justify-between px-[26px] py-[22px]">
        <div className="size-[42px] animate-pulse rounded-full bg-white/[0.14]" />
        <div className="h-9 w-40 animate-pulse rounded-[8px] bg-white/[0.08]" />
        <div className="size-[42px] animate-pulse rounded-full bg-white/[0.14]" />
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-[26px]">
        <div className="h-full max-h-[480px] w-full max-w-[760px] animate-pulse rounded-[20px] bg-white/[0.06]" />
      </div>
      <div className="px-[26px] pb-[34px] pt-6">
        <div className="mx-auto h-4 w-2/3 max-w-[560px] animate-pulse rounded-[8px] bg-white/[0.08]" />
      </div>
    </div>
  );
}

// Post y foto ausentes (RLS, id inventado): mismo estado, sin 500.
function PhotoNotFound({ postId }: { postId: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#1A1714] px-6 text-center text-white">
      <p className="m-0 text-[15px] text-white/85">
        No se encontró la foto.
      </p>
      <Link
        href={`/posts/${postId}`}
        className="text-[14px] font-bold text-white/70 hover:text-white"
      >
        Volver a la publicación
      </Link>
    </div>
  );
}

async function PhotoDetail({
  params,
}: Pick<PageProps<"/posts/[id]/photos/[photoId]">, "params">) {
  const { id, photoId } = await params;

  // Excluye el fetch de sesión del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const post = await fetchPostById(supabase, id, session?.id ?? "");
  const photo = post?.photos.find((p) => p.id === photoId);

  if (!post || !photo) return <PhotoNotFound postId={id} />;

  return <PhotoViewer post={post} photo={photo} />;
}

// Ruta del visor (SPEC 28): fuera de /staff y /family, el guard del proxy
// solo exige sesión y la visibilidad la define RLS vía fetchPostById.
export default function PhotoViewerPage({
  params,
}: PageProps<"/posts/[id]/photos/[photoId]">) {
  return (
    <Suspense fallback={<ViewerFallback />}>
      <PhotoDetail params={params} />
    </Suspense>
  );
}
