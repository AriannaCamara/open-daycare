import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/app/_components/sidebar";
import { Avatar } from "@/app/_components/avatar";
import { ParentsPanel } from "@/app/_components/parents-panel";
import { children, getChildById } from "@/app/_data/children";
import { room, sessionUser } from "@/app/_data/feed";

export async function generateStaticParams() {
  return children.map((child) => ({ id: child.id }));
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

function AlertTriangleIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-[18px]">
      <div className="flex items-center gap-[18px]">
        <div className="size-[84px] flex-none rounded-full bg-border" />
        <div className="flex-1">
          <div className="h-8 w-2/3 rounded-lg bg-border" />
          <div className="mt-2 h-4 w-1/3 rounded bg-border" />
        </div>
      </div>
      <div className="h-[110px] rounded-[16px] bg-border" />
      <div className="h-[170px] rounded-[16px] bg-border" />
    </div>
  );
}

async function KidProfile({ params }: Pick<PageProps<"/kids/[id]">, "params">) {
  const { id } = await params;
  const child = getChildById(id);

  if (!child) {
    notFound();
  }

  return (
    <div className="flex flex-wrap items-start gap-[26px]">
      <div className="flex min-w-[300px] flex-1 flex-col gap-[18px]">
        <div className="flex items-center gap-[18px]">
          <Avatar
            initial={child.initial}
            tone={child.tone}
            variant="child"
            className="size-[84px] text-[34px]"
          />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 font-display text-[28px] font-semibold text-ink">
              {child.fullName}
            </h1>
            <p className="mt-[3px] text-[15px] text-muted">
              {child.ageYears} años · Sala {child.roomName}
            </p>
          </div>
          <Link
            href="/add-child"
            className="flex-none rounded-[12px] border-[1.5px] border-border bg-surface px-4 py-[9px] text-[14px] font-bold text-[#6E6359]"
          >
            Editar
          </Link>
        </div>

        {child.allergiesNote && (
          <div className="flex gap-3.5 rounded-[16px] bg-[#FBDAD6] px-[18px] py-4">
            <div className="flex size-10 flex-none items-center justify-center rounded-[11px] bg-[#F4A8A0]">
              <AlertTriangleIcon />
            </div>
            <div>
              <div className="mb-[2px] text-[15px] font-extrabold text-[#C5413A]">
                Alergias y notas
              </div>
              <div className="text-[14.5px] leading-[1.5] text-[#B25249]">
                {child.allergiesNote}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
          <div className="flex justify-between border-b border-line px-[18px] py-[15px]">
            <span className="text-[14.5px] text-muted">
              Fecha de nacimiento
            </span>
            <span className="text-[14.5px] font-extrabold text-ink">
              {child.birthDateLabel}
            </span>
          </div>
          <div className="flex justify-between border-b border-line px-[18px] py-[15px]">
            <span className="text-[14.5px] text-muted">Sala</span>
            <span className="text-[14.5px] font-extrabold text-ink">
              {child.roomName}
            </span>
          </div>
          <div className="flex justify-between px-[18px] py-[15px]">
            <span className="text-[14.5px] text-muted">Ingreso</span>
            <span className="text-[14.5px] font-extrabold text-ink">
              {child.admissionLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex w-[300px] max-w-full flex-none flex-col gap-3.5">
        <ParentsPanel parents={child.parents} />
      </div>
    </div>
  );
}

export default function KidProfilePage({
  params,
}: PageProps<"/kids/[id]">) {
  return (
    <div className="flex min-h-screen bg-cream">
      <Sidebar user={sessionUser} room={room} activeHref="/kids" />

      <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto w-full max-w-[820px] px-10 pb-20 pt-[34px]">
          <Link
            href="/kids"
            className="mb-5 inline-flex items-center gap-[7px] text-[14px] font-bold text-muted"
          >
            <ArrowLeftIcon />
            Volver a Niños
          </Link>

          <Suspense fallback={<ProfileSkeleton />}>
            <KidProfile params={params} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
