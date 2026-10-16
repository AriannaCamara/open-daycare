"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

export type AddChildValues = {
  fullName: string;
  birthDate: string;
  roomName: string;
  allergies: string;
  medicalNotes: string;
};

type FieldErrors = Partial<Record<keyof AddChildValues, string>>;

interface AddChildModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: AddChildValues) => void;
}

const initialValues: AddChildValues = {
  fullName: "",
  birthDate: "",
  roomName: "Soles",
  allergies: "",
  medicalNotes: "",
};

const rooms = ["Soles"];

const labelClassName =
  "mb-2 block text-[12px] font-extrabold tracking-[0.7px] text-accent";
const baseInputClassName =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink outline-none placeholder:text-[#B6A99B] focus:border-[#F2937A]";
const errorTextClassName =
  "mb-2 mt-1 text-[13px] font-semibold text-[#C5503A]";

function inputClassName(hasError: boolean): string {
  return `${baseInputClassName} ${hasError ? "border-[#D9583C]" : "border-[#EADFD0]"}`;
}

function validate(values: AddChildValues): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullName.trim()) {
    errors.fullName = "Ingresá el nombre completo.";
  }

  if (!values.birthDate) {
    errors.birthDate = "Ingresá la fecha de nacimiento.";
  } else if (values.birthDate > new Date().toISOString().slice(0, 10)) {
    errors.birthDate = "La fecha no puede ser futura.";
  }

  if (!values.roomName) {
    errors.roomName = "Elegí una sala.";
  }

  return errors;
}

export function AddChildModal({ open, onClose, onSave }: AddChildModalProps) {
  const [values, setValues] = useState<AddChildValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open) {
      setValues(initialValues);
      setErrors({});
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

  function updateField(
    field: keyof AddChildValues,
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      onSave(values);
    }
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
            Agregar niño
          </span>
          <button
            type="submit"
            className="cursor-pointer text-[15px] font-extrabold text-[#D9583C]"
          >
            Guardar
          </button>
        </div>

        <div className="px-[26px] py-6">
          <label className={labelClassName} htmlFor="add-child-name">
            NOMBRE COMPLETO
          </label>
          <input
            id="add-child-name"
            type="text"
            value={values.fullName}
            onChange={(event) => updateField("fullName", event)}
            placeholder="Ej. Martina López"
            className={`${inputClassName(Boolean(errors.fullName))} mb-[18px]`}
          />
          {errors.fullName && (
            <p className={errorTextClassName}>{errors.fullName}</p>
          )}

          <div className="mb-[18px] flex gap-[14px]">
            <div className="min-w-0 flex-1">
              <label className={labelClassName} htmlFor="add-child-birthdate">
                FECHA DE NACIMIENTO
              </label>
              <input
                id="add-child-birthdate"
                type="date"
                value={values.birthDate}
                onChange={(event) => updateField("birthDate", event)}
                className={inputClassName(Boolean(errors.birthDate))}
              />
              {errors.birthDate && (
                <p className={errorTextClassName}>{errors.birthDate}</p>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <label className={labelClassName} htmlFor="add-child-room">
                SALA
              </label>
              <select
                id="add-child-room"
                value={values.roomName}
                onChange={(event) => updateField("roomName", event)}
                className={`${inputClassName(Boolean(errors.roomName))} font-bold appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23B0A290%22%20stroke-width%3D%222.2%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[right_16px_center] bg-no-repeat pr-10`}
              >
                {rooms.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
              {errors.roomName && (
                <p className={errorTextClassName}>{errors.roomName}</p>
              )}
            </div>
          </div>

          <label className={labelClassName} htmlFor="add-child-allergies">
            ALERGIAS (ETIQUETAS)
          </label>
          <input
            id="add-child-allergies"
            type="text"
            value={values.allergies}
            onChange={(event) => updateField("allergies", event)}
            placeholder="Ej. Maní, Lactosa"
            className={`${inputClassName(false)} mb-[18px]`}
          />

          <label className={labelClassName} htmlFor="add-child-notes">
            NOTAS MÉDICAS
          </label>
          <textarea
            id="add-child-notes"
            value={values.medicalNotes}
            onChange={(event) => updateField("medicalNotes", event)}
            placeholder="Indicaciones, medicación, contactos…"
            className={`${inputClassName(false)} min-h-[90px] resize-y leading-[1.5]`}
          />
        </div>
      </form>
    </div>
  );
}
