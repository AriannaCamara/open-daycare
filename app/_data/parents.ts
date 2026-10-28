import { createClient } from "@/utils/supabase/server";
import {
  avatarToneStyles,
  type AvatarTone,
  type Parent,
  type ParentRelation,
} from "./children";

const toneKeys = Object.keys(avatarToneStyles) as AvatarTone[];

interface LinkedParentRow {
  id: string;
  relationship: string;
  users: { id: string; full_name: string; status: string } | null;
}

interface InvitationRow {
  id: string;
  full_name: string;
  relationship: string;
}

// DB relationship → UI relation (el enum "guardian" se muestra como Tutor/a).
function toUiRelation(relationship: string): ParentRelation {
  if (relationship === "father") return "father";
  if (relationship === "guardian") return "tutor";
  return "mother";
}

// Padres activos (parent_children → users) + invitaciones pending del niño.
export async function fetchChildParents(childId: string): Promise<Parent[]> {
  const supabase = await createClient();

  const [{ data: linkedRows }, { data: invitationRows }] = await Promise.all([
    supabase
      .from("parent_children")
      .select("id, relationship, users(id, full_name, status)")
      .eq("child_id", childId),
    supabase
      .from("invitations")
      .select("id, full_name, relationship")
      .eq("child_id", childId)
      .eq("status", "pending"),
  ]);

  const active: Parent[] = (linkedRows ?? [])
    .map((row) => row as unknown as LinkedParentRow)
    .filter((row) => row.users?.status === "active")
    .map((row, index) => ({
      id: row.id,
      fullName: row.users!.full_name,
      relation: toUiRelation(row.relationship),
      initial: row.users!.full_name.charAt(0).toUpperCase(),
      tone: toneKeys[index % toneKeys.length],
      status: "active" as const,
    }));

  const pending: Parent[] = (invitationRows ?? [])
    .map((row) => row as unknown as InvitationRow)
    .map((row, index) => ({
      id: row.id,
      fullName: row.full_name,
      relation: toUiRelation(row.relationship),
      initial: row.full_name.charAt(0).toUpperCase(),
      tone: toneKeys[(active.length + index) % toneKeys.length],
      status: "pending" as const,
    }));

  return [...active, ...pending];
}

interface ParentsCountRow {
  child_id: string;
  users: { status: string } | null;
}

// Conteo batch de padres activos por niño (una query, sin N+1).
export async function fetchParentsCountByChild(
  childIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (childIds.length === 0) return counts;

  const supabase = await createClient();
  const { data } = await supabase
    .from("parent_children")
    .select("child_id, users(status)")
    .in("child_id", childIds);

  for (const row of (data ?? []) as unknown as ParentsCountRow[]) {
    if (row.users?.status !== "active") continue;
    counts.set(row.child_id, (counts.get(row.child_id) ?? 0) + 1);
  }

  return counts;
}
