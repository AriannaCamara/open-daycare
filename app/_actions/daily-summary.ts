"use server";

import { todayUtcDate } from "@/app/_data/daily-summary";
import { fetchSessionUser, isStaffRole } from "@/app/_data/session";
import { createClient } from "@/utils/supabase/server";
import { SESSION_ERROR } from "./errors";

export type DailySummaryResult = { ok: true } | { ok: false; error: string };

export interface DailySummaryInput {
  mealsCount: number; // entero >= 0 (NaN si el campo vino vacío)
  sleepMinutes: number;
  activitiesCount: number;
  mood: string;
  highlight: string;
}

const FORBIDDEN_ERROR =
  "Solo el personal de la guardería puede guardar el resumen.";
const SAVE_ERROR = "No se pudo guardar el resumen. Intentá de nuevo.";
const COUNT_ERROR = "Ingresá un número entero mayor o igual a 0.";
const MOOD_ERROR = "Escribí el ánimo del día.";
const HIGHLIGHT_ERROR = "Escribí lo más lindo de hoy.";

function isValidCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function optionalTrimmed(value: string): string {
  return typeof value === "string" ? value.trim() : "";
}

// Guarda (o actualiza) el resumen de hoy del niño. upsert por la UNIQUE
// (child_id, date): re-ejecutar la acción el mismo día sobreescribe la fila.
export async function upsertDailySummary(
  childId: string,
  input: DailySummaryInput,
): Promise<DailySummaryResult> {
  const supabase = await createClient();
  const session = await fetchSessionUser(supabase);

  if (!session) {
    return { ok: false, error: SESSION_ERROR };
  }
  if (!isStaffRole(session.role)) {
    return { ok: false, error: FORBIDDEN_ERROR };
  }

  if (
    !isValidCount(input.mealsCount) ||
    !isValidCount(input.sleepMinutes) ||
    !isValidCount(input.activitiesCount)
  ) {
    return { ok: false, error: COUNT_ERROR };
  }

  const mood = optionalTrimmed(input.mood);
  if (!mood) {
    return { ok: false, error: MOOD_ERROR };
  }

  const highlight = optionalTrimmed(input.highlight);
  if (!highlight) {
    return { ok: false, error: HIGHLIGHT_ERROR };
  }

  const { error } = await supabase.from("daily_summaries").upsert(
    {
      child_id: childId,
      date: todayUtcDate(),
      meals_count: input.mealsCount,
      sleep_minutes: input.sleepMinutes,
      activities_count: input.activitiesCount,
      mood,
      highlight,
    },
    { onConflict: "child_id,date" },
  );

  // 42501 = RLS rechazó la fila (no debería pasar tras la guarda de rol).
  if (error) {
    return { ok: false, error: SAVE_ERROR };
  }

  return { ok: true };
}
