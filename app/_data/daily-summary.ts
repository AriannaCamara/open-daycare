import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostKind } from "./feed";
import { formatPostTime } from "./posts";

// Fecha de hoy en UTC: misma convención que current_date del servidor
// Supabase. Se usa en lectura y escritura para que ambos lados coincidan
// (SPEC 23 — riesgo de desfase de fecha).
export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// "1h 30" (90 min) / "2h" (120 min): formato de la tarjeta de siesta.
export function formatSleepMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}` : `${hours}h`;
}

export interface DailySummary {
  mealsCount: number;
  sleepMinutes: number;
  activitiesCount: number;
  mood: string;
  highlight: string;
}

// Post de hoy etiquetado con el niño (post_children): entrada de la línea
// de tiempo. "Momentos" de la línea NO viene de daily_summaries.
export interface DailyMoment {
  id: string;
  kind: PostKind;
  body: string;
  time: string; // "14:20" — published_at en America/Argentina/Buenos_Aires
}

interface DailySummaryRow {
  meals_count: number | null;
  sleep_minutes: number | null;
  activities_count: number | null;
  mood: string | null;
  highlight: string | null;
}

interface DailyMomentRow {
  id: string;
  type: PostKind;
  body: string;
  published_at: string;
}

// Columnas nullables en la tabla: el formateo defensivo evita NaN en la UI.
function toSummary(row: DailySummaryRow): DailySummary {
  return {
    mealsCount: row.meals_count ?? 0,
    sleepMinutes: row.sleep_minutes ?? 0,
    activitiesCount: row.activities_count ?? 0,
    mood: row.mood ?? "",
    highlight: row.highlight ?? "",
  };
}

// Resumen del día de hoy del niño; null si el staff aún no lo guardó.
export async function getDailySummary(
  supabase: SupabaseClient,
  childId: string,
): Promise<DailySummary | null> {
  const { data, error } = await supabase
    .from("daily_summaries")
    .select("meals_count, sleep_minutes, activities_count, mood, highlight")
    .eq("child_id", childId)
    .eq("date", todayUtcDate())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toSummary(data as DailySummaryRow);
}

// Posts de hoy etiquetados con el niño, más antiguos primero. El filtro de
// fecha usa el día UTC; la hora se formatea en la zona de la guardería
// (mismo criterio que el feed). RLS can_read_post acota la lectura.
export async function getDailyMoments(
  supabase: SupabaseClient,
  childId: string,
): Promise<DailyMoment[]> {
  const dayStart = new Date(`${todayUtcDate()}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("posts")
    .select("id, type, body, published_at, post_children!inner(child_id)")
    .eq("post_children.child_id", childId)
    .gte("published_at", dayStart.toISOString())
    .lt("published_at", dayEnd.toISOString())
    .order("published_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as DailyMomentRow[]).map((row) => ({
    id: row.id,
    kind: row.type,
    body: row.body,
    time: formatPostTime(row.published_at),
  }));
}
