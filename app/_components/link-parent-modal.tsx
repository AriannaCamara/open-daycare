"use client";

import { useState, type FormEvent } from "react";
import type { ParentRelation } from "@/app/_data/children";

export type LinkParentValues = {
  fullName: string;
  email: string;
  relation: ParentRelation;
};

interface LinkParentModalProps {
  open: boolean;
  onClose: () => void;
  onInvite: (values: LinkParentValues) => void;
  childName: string;
}

const initialValues: LinkParentValues = {
  fullName: "",
  email: "",
  relation: "mother",
};

const relationOptions: { value: ParentRelation; label: string }[] = [
  { value: "mother", label: "Mamá" },
  { value: "father", label: "Papá" },
  { value: "tutor", label: "Tutor/a" },
];

const inviteCode = "7K4P9";

const labelClassName =
  "mb-2 block text-[12px] font-bold tracking-[0.7px] text-muted";
const baseInputClassName =
  "w-full rounded-[14px] border-[1.5px] border-[#EADFD0] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A]";

function XIcon() {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#4E72C8"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-px flex-none"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function PlaneIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m22 2-7 20-4-9-9-4z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function LinkParentModal({
  open,
  onClose,
  onInvite,
  childName,
}: LinkParentModalProps) {
  const [values, setValues] = useState<LinkParentValues>(initialValues);

  if (!open) {
    return null;
  }

  function updateText(field: "fullName" | "email", value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function selectRelation(relation: ParentRelation) {
    setValues((current) => ({ ...current, relation }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onInvite(values);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(63,54,46,0.45)] px-6 py-10"
      onClick={onClose}
    >
      <form
        noValidate
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[480px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <div>
            <div className="font-display text-[18px] font-semibold text-ink">
              Vincular padre
            </div>
            <div className="text-[13px] text-[#A89A8B]">a {childName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-[10px] bg-[#F0E6D8] text-[#94887B]"
          >
            <XIcon />
          </button>
        </div>

        <div className="px-[26px] py-[22px]">
          <div className="mb-5 flex gap-[11px] rounded-[14px] bg-[#E3ECFB] px-4 py-[13px]">
            <InfoIcon />
            <span className="text-[13.5px] leading-[1.45] text-[#3F5694]">
              Le enviaremos un correo con un código para que active su cuenta.
              Solo verá el feed de {childName.split(" ")[0]}.
            </span>
          </div>

          <label className={labelClassName} htmlFor="link-parent-name">
            NOMBRE DEL PADRE/MADRE
          </label>
          <input
            id="link-parent-name"
            type="text"
            value={values.fullName}
            onChange={(event) => updateText("fullName", event.target.value)}
            placeholder="Ej. Diego Fernández"
            className={`${baseInputClassName} mb-[18px]`}
          />

          <label className={labelClassName} htmlFor="link-parent-email">
            EMAIL
          </label>
          <input
            id="link-parent-email"
            type="email"
            value={values.email}
            onChange={(event) => updateText("email", event.target.value)}
            placeholder="correo@ejemplo.com"
            className={`${baseInputClassName} mb-[18px]`}
          />

          <div className="mb-[10px] text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]">
            PARENTESCO
          </div>
          <div className="mb-5 flex gap-[9px]">
            {relationOptions.map((option) => {
              const selected = values.relation === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectRelation(option.value)}
                  className={`flex-1 cursor-pointer rounded-full border-[1.5px] px-[11px] py-[11px] text-[14px] font-extrabold ${
                    selected
                      ? "border-[#9FB8EC] bg-[#CCD8F4] text-[#4E72C8]"
                      : "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mb-5 rounded-[16px] border-[1.5px] border-dashed border-[#E6D08A] bg-[#FBF1D6] px-[18px] py-[18px] text-center">
            <div className="mb-2 text-[12px] font-extrabold tracking-[0.7px] text-[#A88526]">
              CÓDIGO DE INVITACIÓN
            </div>
            <div className="font-display text-[34px] font-semibold tracking-[7px] text-[#8A7234]">
              {inviteCode}
            </div>
            <div className="mt-1.5 text-[13px] text-[#A88526]">
              Vence en 7 días
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-[14px] bg-gradient-to-b from-[#F4977E] to-[#EE8164] px-[14px] py-[14px] text-[15.5px] font-extrabold text-white shadow-[0_10px_22px_-8px_rgba(238,129,100,0.7)]"
          >
            <PlaneIcon />
            Enviar invitación
          </button>
        </div>
      </form>
    </div>
  );
}
