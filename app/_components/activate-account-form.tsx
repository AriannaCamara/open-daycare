"use client";

import { useState } from "react";
import { Avatar } from "@/app/_components/avatar";
import { getChildById } from "@/app/_data/children";

const invite = {
  code: "7K4P9",
  email: "lucia.fernandez@gmail.com",
  childId: "mateo-fernandez",
};

const child = getChildById(invite.childId);

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
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export function ActivateAccountForm() {
  const [photoConsent, setPhotoConsent] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FBF4EC] px-10 py-10">
      <div className="w-full max-w-[440px]">
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

        {child && (
          <div className="mb-[22px] flex items-center gap-[14px] rounded-[16px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px]">
            <Avatar
              initial={child.initial}
              tone={child.tone}
              variant="child"
              className="h-[44px] w-[44px] text-[19px]"
            />
            <div>
              <div className="text-[13px] text-muted">
                Te invitaron a seguir a
              </div>
              <div className="font-display text-[17px] font-semibold text-ink">
                {child.fullName.split(" ")[0]} · Sala {child.roomName}
              </div>
            </div>
          </div>
        )}

        <label className="mb-2 block text-[12px] font-bold tracking-[.7px] text-muted">
          CÓDIGO DE INVITACIÓN
        </label>
        <input
          type="text"
          defaultValue={invite.code}
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] font-display text-[18px] font-bold tracking-[3px] text-ink outline-none focus:border-[#F2937A]"
        />

        <label className="mb-2 block text-[12px] font-bold tracking-[.7px] text-muted">
          EMAIL
        </label>
        <input
          type="email"
          defaultValue={invite.email}
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink outline-none focus:border-[#F2937A]"
        />

        <label className="mb-2 block text-[12px] font-bold tracking-[.7px] text-muted">
          CREAR CONTRASEÑA
        </label>
        <input
          type="password"
          className="mb-[18px] w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[14px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A]"
          placeholder="••••••••"
        />

        <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-[14px] bg-[#FBF1D6] px-4 py-[14px]">
          <input
            type="checkbox"
            checked={photoConsent}
            onChange={(event) => setPhotoConsent(event.target.checked)}
            className="peer sr-only"
          />
          <span className="mt-px flex h-6 w-6 flex-none items-center justify-center rounded-[8px] peer-checked:bg-[#5FB97E] peer-focus-visible:ring-2 peer-focus-visible:ring-[#5FB97E]/50 border-[1.5px] border-[#D9C88A] bg-white">
            {photoConsent && (
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

        <button
          type="submit"
          className="block w-full cursor-pointer rounded-[15px] bg-[linear-gradient(180deg,#F4977E,#EE8164)] py-[15px] text-[16px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,.7)]"
        >
          Activar mi cuenta
        </button>

        <p className="mt-[22px] text-center text-[14.5px] text-muted">
          ¿Ya tenés cuenta?{" "}
          <a href="/login" className="font-extrabold text-[#C5503A]">
            Iniciar sesión
          </a>
        </p>
      </div>
    </div>
  );
}
