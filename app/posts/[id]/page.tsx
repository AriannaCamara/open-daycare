import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { PanelSidebar } from "@/app/_components/panel-sidebar";
import { PostDetailView } from "@/app/_components/post-detail-view";
import { room } from "@/app/_data/feed";
import { fetchPostById } from "@/app/_data/posts";
import {
  fetchSessionUser,
  isStaffRole,
} from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";

// Shell del detalle: la ruta vive fuera de /staff y /family, así que la
// página arma su propio layout (sidebar + main) según el rol de la sesión.
function DetailFallback() {
  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 h-14 border-b border-border bg-surface lg:hidden" />
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none border-r border-border bg-surface lg:block" />
      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-[680px] px-10 pb-20 pt-[34px]">
          <div className="mb-[18px] h-[18px] w-[150px] animate-pulse rounded-[8px] bg-[#EFE3D5]" />
          <div className="h-[320px] animate-pulse rounded-[22px] bg-[#EFE3D5]" />
        </div>
      </main>
    </>
  );
}

// Post inexistente o no visible por RLS (fetchPostById → null): estado
// amigable con link de vuelta, sin error 500.
function PostNotFound({ backHref }: { backHref: string }) {
  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[680px] px-10 pb-20 pt-[34px]">
        <p className="m-0 text-[15.5px] text-muted">
          No se encontró la publicación.
        </p>
        <Link
          href={backHref}
          className="mt-3 inline-flex items-center gap-[7px] text-[14px] font-bold text-muted"
        >
          Volver al feed
        </Link>
      </div>
    </main>
  );
}

async function PostDetail({ params }: Pick<PageProps<"/posts/[id]">, "params">) {
  const { id } = await params;

  // Excluye el fetch de sesión del prerender estático (cacheComponents).
  await connection();

  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);
  const panel = isStaffRole(session?.role ?? null) ? "staff" : "family";
  const backHref = panel === "staff" ? "/staff" : "/family";
  const post = await fetchPostById(supabase, id, session?.id ?? "");

  return (
    <>
      <PanelSidebar panel={panel} room={panel === "staff" ? room : undefined} />
      {post ? (
        <PostDetailView
          post={post}
          currentUserId={session?.id ?? ""}
          backHref={backHref}
        />
      ) : (
        <PostNotFound backHref={backHref} />
      )}
    </>
  );
}

export default function PostDetailPage({ params }: PageProps<"/posts/[id]">) {
  return (
    <div className="flex min-h-screen bg-cream">
      <Suspense fallback={<DetailFallback />}>
        <PostDetail params={params} />
      </Suspense>
    </div>
  );
}
