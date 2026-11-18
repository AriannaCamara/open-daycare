"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { upsertDailySummary } from "@/app/_actions/daily-summary";
import type { DailySummary } from "@/app/_data/daily-summary";

interface DailySummaryFormValues {
  mealsCount: string;
  sleepMinutes: string;
  activitiesCount: string;
  mood: string;
  highlight: string;
}

interface DailySummaryModalProps {
  open: boolean;
  childId: string;
  initial: DailySummary | null; // null = sin registro hoy (form vacío)
  onClose: () => void;
}

const labelClassName =
  "mb-2 block text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]";
const inputClassName =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]";

function toFormValues(summary: DailySummary | null): DailySummaryFormValues {
  return {
    mealsCount: summary ? String(summary.mealsCount) : "",
    sleepMinutes: summary ? String(summary.sleepMinutes) : "",
    activitiesCount: summary ? String(summary.activitiesCount) : "",
    mood: summary?.mood ?? "",
    highlight: summary?.highlight ?? "",
  };
}

// "" → NaN: la action lo rechaza con el mensaje de conteo (no lo convierte
// en 0, que sería un valor distinto del que escribió el usuario).
function toCount(value: string): number {
  const trimmed = value.trim();
  return trimmed === "" ? Number.NaN : Number(trimmed);
}

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
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={inputClassName}
      />
    </div>
  );
}

export function DailySummaryModal({
  open,
  childId,
  initial,
  onClose,
}: DailySummaryModalProps) {
  const router = useRouter();
  const [values, setValues] = useState<DailySummaryFormValues>(() =>
    toFormValues(initial),
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initialRef = useRef(initial);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  // Al abrir, precarga con el registro de hoy (o vacío si no existe).
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

  function updateField(
    field: keyof DailySummaryFormValues,
    value: string,
  ): void {
    setValues((current) => ({ ...current, [field]: value }));
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    setSaving(true);
    setSaveError(null);
    const result = await upsertDailySummary(childId, {
      mealsCount: toCount(values.mealsCount),
      sleepMinutes: toCount(values.sleepMinutes),
      activitiesCount: toCount(values.activitiesCount),
      mood: values.mood,
      highlight: values.highlight,
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
            className="cursor-pointer text-[15px] font-bold text-[#94887B]"
          >
            Cancelar
          </button>
          <span className="font-display text-[18px] font-semibold text-ink">
            Resumen del día
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
            id="summary-meals-count"
            label="COMIDAS"
            value={values.mealsCount}
            placeholder="Ej. 3"
            onChange={(event) => updateField("mealsCount", event.target.value)}
          />
          <TextField
            id="summary-sleep-minutes"
            label="SIESTA EN MINUTOS"
            value={values.sleepMinutes}
            placeholder="Ej. 90 (se muestra como 1h 30)"
            onChange={(event) =>
              updateField("sleepMinutes", event.target.value)
            }
          />
          <TextField
            id="summary-activities-count"
            label="MOMENTOS"
            value={values.activitiesCount}
            placeholder="Ej. 4"
            onChange={(event) =>
              updateField("activitiesCount", event.target.value)
            }
          />

          <div className="mb-[18px]">
            <label className={labelClassName} htmlFor="summary-mood">
              ÁNIMO DEL DÍA
            </label>
            <input
              id="summary-mood"
              type="text"
              value={values.mood}
              placeholder="Ej. Contento y participativo"
              onChange={(event) => updateField("mood", event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="mb-[18px]">
            <label className={labelClassName} htmlFor="summary-highlight">
              LO MÁS LINDO DE HOY
            </label>
            <textarea
              id="summary-highlight"
              value={values.highlight}
              placeholder="Ej. Usó el orinal solito"
              onChange={(event) =>
                updateField("highlight", event.target.value)
              }
              className={`${inputClassName} min-h-[80px] resize-y leading-[1.5]`}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
