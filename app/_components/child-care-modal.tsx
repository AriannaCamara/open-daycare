"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { updateChildProfile } from "@/app/_actions/child-profile";
import type { ChildCare } from "@/app/_data/family-children";

interface ChildCareFormValues {
  emergencyContact: string;
  pickupAuthorization: string;
  diet: string;
  medication: string;
  napSchedule: string;
  medicalNotes: string;
  allergyTags: string; // "Maní, Lactosa" → la action lo parte en tags
  photoConsent: boolean;
}

interface ChildCareModalProps {
  open: boolean;
  childId: string;
  initial: ChildCare;
  onClose: () => void;
}

const labelClassName =
  "mb-2 block text-[12px] font-bold tracking-[0.7px] text-muted";
const inputClassName =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#7E7264] focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]";

function toFormValues(care: ChildCare): ChildCareFormValues {
  return {
    emergencyContact: care.emergencyContact ?? "",
    pickupAuthorization: care.pickupAuthorization ?? "",
    diet: care.diet ?? "",
    medication: care.medication ?? "",
    napSchedule: care.napSchedule ?? "",
    medicalNotes: care.medicalNotes ?? "",
    allergyTags: care.allergyTags.join(", "),
    photoConsent: care.photoConsent,
  };
}

// Solo texto (vacío = null en la action): la validación de guardado vive en
// updateChildProfile. No hay campos administrativos (nombre, nacimiento, sala).
function TextField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="mb-[18px]">
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={inputClassName}
      />
    </div>
  );
}

export function ChildCareModal({
  open,
  childId,
  initial,
  onClose,
}: ChildCareModalProps) {
  const router = useRouter();
  const [values, setValues] = useState<ChildCareFormValues>(() =>
    toFormValues(initial),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialRef = useRef(initial);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  // Al abrir, precarga con los valores actuales del niño.
  useEffect(() => {
    if (open) {
      setValues(toFormValues(initialRef.current));
      setSaveError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function updateField(field: keyof ChildCareFormValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setSaveError(null);
    const result = await updateChildProfile(childId, {
      emergencyContact: values.emergencyContact,
      pickupAuthorization: values.pickupAuthorization,
      diet: values.diet,
      medication: values.medication,
      napSchedule: values.napSchedule,
      medicalNotes: values.medicalNotes,
      allergyTags: values.allergyTags ? [values.allergyTags] : [],
      photoConsent: values.photoConsent,
    });
    setSaving(false);

    if (!result.ok) {
      setSaveError(result.error);
      return;
    }

    router.refresh();
    onClose();
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
        className="w-full max-w-[520px] overflow-hidden rounded-[24px] border border-[#ECE0D0] bg-[#FBF4EC] shadow-[0_20px_50px_-24px_rgba(63,54,46,0.35)]"
      >
        <div className="flex items-center justify-between border-b border-[#ECE0D0] px-[26px] py-5">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer text-[15px] font-bold text-muted-strong"
          >
            Cancelar
          </button>
          <span className="font-display text-[18px] font-semibold text-ink">
            Editar cuidados
          </span>
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer text-[15px] font-extrabold text-[#D9583C] disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>

        <div className="px-[26px] py-6">
          {saveError && (
            <p className="mb-4 rounded-[12px] border border-[#F0B4A4] bg-[#F9D2DE] px-4 py-3 text-[13.5px] font-semibold text-[#B3452E]">
              {saveError}
            </p>
          )}

          <TextField
            id="care-emergency-contact"
            label="CONTACTO DE EMERGENCIA"
            value={values.emergencyContact}
            placeholder="Ej. Ana López — 11 5555 1234"
            onChange={(event) =>
              updateField("emergencyContact", event.target.value)
            }
          />
          <TextField
            id="care-pickup-authorization"
            label="PERSONA AUTORIZADA A RETIRAR"
            value={values.pickupAuthorization}
            placeholder="Ej. Abuelo Carlos"
            onChange={(event) =>
              updateField("pickupAuthorization", event.target.value)
            }
          />
          <TextField
            id="care-diet"
            label="DIETA / RESTRICCIONES"
            value={values.diet}
            placeholder="Ej. Sin frutos secos"
            onChange={(event) => updateField("diet", event.target.value)}
          />
          <TextField
            id="care-medication"
            label="MEDICACIÓN"
            value={values.medication}
            placeholder="Ej. Inhalador en la mochila"
            onChange={(event) => updateField("medication", event.target.value)}
          />
          <TextField
            id="care-nap-schedule"
            label="SIESTA / RUTINAS"
            value={values.napSchedule}
            placeholder="Ej. Siesta de 13 a 15"
            onChange={(event) => updateField("napSchedule", event.target.value)}
          />

          <div className="mb-[18px]">
            <label className={labelClassName} htmlFor="care-medical-notes">
              NOTAS MÉDICAS
            </label>
            <textarea
              id="care-medical-notes"
              value={values.medicalNotes}
              placeholder="Indicaciones, contactos…"
              onChange={(event) =>
                updateField("medicalNotes", event.target.value)
              }
              className={`${inputClassName} min-h-[80px] resize-y leading-[1.5]`}
            />
          </div>

          <TextField
            id="care-allergy-tags"
            label="ALERGIAS (ETIQUETAS)"
            value={values.allergyTags}
            placeholder="Ej. Maní, Lactosa"
            onChange={(event) => updateField("allergyTags", event.target.value)}
          />

          <label
            className="flex cursor-pointer items-center gap-3"
            htmlFor="care-photo-consent"
          >
            <input
              id="care-photo-consent"
              type="checkbox"
              checked={values.photoConsent}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  photoConsent: event.target.checked,
                }))
              }
              className="size-[18px] flex-none accent-[#D9583C]"
            />
            <span className="text-[12px] font-bold tracking-[0.7px] text-muted">
              CONSENTIMIENTO DE FOTOS
            </span>
          </label>
        </div>
      </form>
    </div>
  );
}

// Wrapper cliente: botón "Editar" del bloque CUIDADOS + el modal.
export function ChildCareEditor({
  childId,
  care,
}: {
  childId: string;
  care: ChildCare;
}) {
  const [open, setOpen] = useState(false);
  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-[12px] border-[1.5px] border-border bg-surface px-4 py-[7px] text-[14px] font-bold text-[#6E6359] transition-colors hover:border-[#F2A78E]"
      >
        Editar
      </button>
      <ChildCareModal
        open={open}
        childId={childId}
        initial={care}
        onClose={handleClose}
      />
    </>
  );
}
