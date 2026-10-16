"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type LoginValues = { email: string; password: string };
type FieldErrors<K extends string> = Partial<Record<K, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SunIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState<LoginValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FieldErrors<keyof LoginValues>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors<keyof LoginValues> = {};
    if (!values.email.trim()) {
      nextErrors.email = "Ingresá tu email.";
    } else if (!emailPattern.test(values.email.trim())) {
      nextErrors.email = "El email no tiene un formato válido.";
    }
    if (!values.password) {
      nextErrors.password = "Ingresá tu contraseña.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      router.push("/");
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[#FBF4EC] md:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-[linear-gradient(155deg,#F6A98E_0%,#F2937A_45%,#EC7E62_100%)] p-14 text-white md:flex md:flex-col md:justify-between">
        <div className="absolute -top-[140px] -right-[120px] h-[420px] w-[420px] rounded-full bg-white/12" />
        <div className="absolute -bottom-[110px] -left-[80px] h-[300px] w-[300px] rounded-full bg-white/10" />

        <div className="relative flex items-center gap-[13px]">
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white/22">
            <SunIcon />
          </div>
          <span className="font-display text-[21px] font-semibold tracking-[.5px]">
            OpenDayCare
          </span>
        </div>

        <div className="relative">
          <h1 className="mb-[18px] font-display text-[42px] leading-[1.12] font-semibold">
            El día de cada niño,
            <br />
            compartido con su familia.
          </h1>
          <p className="m-0 max-w-[430px] text-[17px] leading-[1.6] text-white/92">
            Publicá momentos, gestioná las salas y mantené a las familias cerca,
            desde un solo lugar.
          </p>
        </div>

        <div className="relative text-[14px] text-white/90">
          🌿 Guardería Sala Soles
        </div>
      </div>

      <div className="flex items-center justify-center px-10 py-10">
        <form onSubmit={handleSubmit} className="w-full max-w-[392px]">
          <h2 className="mb-1.5 font-display text-[30px] font-semibold text-ink">
            Iniciar sesión
          </h2>
          <p className="mb-7 text-[15px] text-muted">
            Ingresá para ver el día de hoy.
          </p>

          <label className="mb-2 block text-[12px] font-bold tracking-[.7px] text-muted">
            EMAIL
          </label>
          <input
            type="email"
            value={values.email}
            onChange={(event) =>
              setValues((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="tu@email.com"
            className={`mb-1 w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A] ${
              errors.email ? "border-[#D9583C]" : "border-[#EADFD0]"
            }`}
          />
          {errors.email && (
            <p className="mb-2 text-[13px] font-semibold text-[#C5503A]">
              {errors.email}
            </p>
          )}

          <label className="mb-2 mt-4 block text-[12px] font-bold tracking-[.7px] text-muted">
            CONTRASEÑA
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
            placeholder="••••••••"
            className={`w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[14px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A] ${
              errors.password ? "border-[#D9583C]" : "border-[#EADFD0]"
            }`}
          />
          {errors.password && (
            <p className="mb-2 mt-2 text-[13px] font-semibold text-[#C5503A]">
              {errors.password}
            </p>
          )}
          <div className="mb-5 mt-2 text-right">
            <span className="cursor-pointer text-[13.5px] font-bold text-[#C5503A]">
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          <button
            type="submit"
            className="block w-full cursor-pointer rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[15px] text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
          >
            Iniciar sesión
          </button>

          <p className="mt-6 text-center text-[14.5px] text-muted">
            ¿Te invitó la guardería?{" "}
            <Link
              href="/activate-account"
              className="font-extrabold text-[#C5503A]"
            >
              Activá tu cuenta
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
