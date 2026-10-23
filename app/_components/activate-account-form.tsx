"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";
import { Avatar } from "@/app/_components/avatar";
import type { ActivationInvitation } from "@/app/activate-account/page";

type ActivateValues = {
  password: string;
  photoConsent: boolean;
};

type FieldErrors = Partial<Record<keyof ActivateValues | "form", string>>;

const GENERIC_SIGNUP_ERROR = "No pudimos crear la cuenta. Intentá de nuevo.";

function mapAuthError(error: AuthError): string {
  if (error.code === "email_exists") {
    return "Este email ya tiene una cuenta. Iniciá sesión.";
  }
  if (error.code === "email_not_confirmed") {
    return "Tu email aún no está confirmado.";
  }
  return GENERIC_SIGNUP_ERROR;
}

function SunIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M17.7 6.3l1.4-1.4M6.3 17.7l-1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M4.9 4.9l1.4 1.4" />
    </svg>
  );
}

function InvalidCodeState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF4EC] px-10 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-[22px] flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
          <SunIcon />
        </div>
        <h1 className="mb-2 font-display text-[32px] leading-[1.15] font-semibold text-ink">
          Código no válido
        </h1>
        <p className="mb-[26px] text-[15.5px] leading-[1.55] text-muted">
          El código de invitación no es válido o está vencido. Pedile a la
          guardería que te envíe una nueva invitación.
        </p>
        <p className="text-[14.5px] text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-extrabold text-[#C5503A]">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export function ActivateAccountForm({
  invitation,
}: {
  invitation: ActivationInvitation | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ActivateValues>({
    password: "",
    photoConsent: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  if (!invitation) {
    return <InvalidCodeState />;
  }

  const invite = invitation;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {};
    if (values.password.length < 8) {
      nextErrors.password = "Usá al menos 8 caracteres.";
    }
    if (!values.photoConsent) {
      nextErrors.photoConsent = "Necesitamos tu autorización para continuar.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password: values.password,
      options: {
        data: {
          daycare_id: invite.daycare_id,
          role: "parent",
          full_name: invite.full_name,
        },
      },
    });

    if (signUpError) {
      setErrors({ form: mapAuthError(signUpError) });
      setSubmitting(false);
      return;
    }

    // Sin sesión (p. ej. "Confirm email" activo en Supabase): la cuenta
    // existe pero no se puede aceptar la invitación todavía.
    if (!signUpData.session) {
      setErrors({
        form: "Tu cuenta está creada. Revisá tu email para confirmarla y luego iniciá sesión.",
      });
      setSubmitting(false);
      return;
    }

    const { error: acceptError } = await supabase.rpc(
      "accept_parent_invitation",
      { p_invitation_id: invite.id },
    );

    if (acceptError) {
      setErrors({ form: GENERIC_SIGNUP_ERROR });
      setSubmitting(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF4EC] px-10 py-10">
      <form noValidate onSubmit={handleSubmit} className="w-full max-w-[440px]">
        <div className="mb-[22px] flex h-[58px] w-[58px] items-center justify-center rounded-[18px] bg-[linear-gradient(155deg,#F8C3A8,#F2937A)] shadow-[0_12px_26px_-10px_rgba(238,129,100,.65)]">
          <SunIcon />
        </div>
        <h1 className="mb-2 font-display text-[32px] leading-[1.15] font-semibold text-ink">
          Bienvenida a OpenDayCare
        </h1>
        <p className="mb-[26px] text-[15.5px] leading-[1.55] text-muted">
          Te invitaron a seguir el día de tu hijo. Creá tu contraseña para
          activar la cuenta.
        </p>

        <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px]">
          <Avatar
            initial={invitation.child_full_name.charAt(0).toUpperCase()}
            tone="sky"
            variant="child"
            className="h-[44px] w-[44px] text-[19px]"
          />
          <div>
            <div className="text-[13px] text-muted">
              Te invitaron a seguir a
            </div>
            <div className="font-display text-[17px] font-semibold text-ink">
              {invitation.child_full_name.split(" ")[0]} · Sala{" "}
              {invitation.room_name}
            </div>
          </div>
        </div>

        <label className="mb-2 block text-[12px] font-bold tracking-[.7px] text-muted">
          EMAIL
        </label>
        <input
          type="email"
          value={invitation.email}
          readOnly
          className="mb-1 w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-[#F5EFE6] px-4 py-[14px] text-[15px] text-[#8A7C6D] outline-none"
        />

        <label className="mb-2 mt-4 block text-[12px] font-bold tracking-[.7px] text-muted">
          CREAR CONTRASEÑA
        </label>
        <input
          type="password"
          value={values.password}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          className={`mb-1 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A] ${
            errors.password ? "border-[#D9583C]" : "border-[#EADFD0]"
          }`}
          placeholder="••••••••"
        />
        {errors.password && (
          <p className="mb-2 text-[13px] font-semibold text-[#C5503A]">
            {errors.password}
          </p>
        )}

        <label className="mb-1 mt-4 flex cursor-pointer items-start gap-3 rounded-[14px] bg-[#FBF1D6] px-4 py-[14px]">
          <input
            type="checkbox"
            checked={values.photoConsent}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                photoConsent: event.target.checked,
              }))
            }
            className="peer sr-only"
          />
          <span
            className={`mt-px flex h-6 w-6 flex-none items-center justify-center rounded-[8px] border-[1.5px] bg-white peer-checked:bg-[#5FB97E] peer-focus-visible:ring-2 peer-focus-visible:ring-[#5FB97E]/50 ${
              errors.photoConsent ? "border-[#D9583C]" : "border-[#D9C88A]"
            }`}
          >
            {values.photoConsent && (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
          <span className="text-[14px] leading-[1.45] text-[#8A7234]">
            Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro
            de la app.
          </span>
        </label>
        {errors.photoConsent && (
          <p className="mb-2 text-[13px] font-semibold text-[#C5503A]">
            {errors.photoConsent}
          </p>
        )}

        {errors.form && (
          <p className="mb-3 text-[13.5px] font-semibold text-[#C5503A]">
            {errors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-4 block w-full cursor-pointer rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[15px] text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? "Activando…" : "Activar mi cuenta"}
        </button>

        <p className="mt-[22px] text-center text-[14.5px] text-muted">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-extrabold text-[#C5503A]">
            Iniciar sesión
          </Link>
        </p>
      </form>
    </div>
  );
}
