import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ActivateAccountForm } from "@/app/_components/activate-account-form";

export type ActivationInvitation = {
  id: string;
  email: string;
  full_name: string;
  relationship: "father" | "mother" | "guardian";
  child_full_name: string;
  room_name: string;
  daycare_id: string;
  expires_at: string;
};

function ActivationSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF4EC] px-10 py-10">
      <div className="w-full max-w-[440px] animate-pulse">
        <div className="mb-[22px] h-[58px] w-[58px] rounded-[18px] bg-border" />
        <div className="mb-2 h-8 w-2/3 rounded-lg bg-border" />
        <div className="mb-[26px] h-4 w-full rounded bg-border" />
        <div className="h-[110px] rounded-[16px] bg-border" />
      </div>
    </div>
  );
}

async function ActivateAccount({ code }: { code: string }) {
  await connection();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_invitation_by_code", {
    p_code: code,
  });

  const invitation = (data?.[0] ?? null) as ActivationInvitation | null;

  return <ActivateAccountForm invitation={invitation} />;
}

export default function ActivateAccountPage({
  searchParams,
}: PageProps<"/activate-account">) {
  return (
    <Suspense fallback={<ActivationSkeleton />}>
      <ActivateAccountParams searchParams={searchParams} />
    </Suspense>
  );
}

async function ActivateAccountParams({
  searchParams,
}: {
  searchParams: PageProps<"/activate-account">["searchParams"];
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : "";

  return <ActivateAccount code={code} />;
}
