"use server";

import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";

type RelationInput = "mother" | "father" | "tutor" | "guardian";

export type ParentInvitationInput = {
  childId: string;
  fullName: string;
  email: string;
  relation: RelationInput;
};

export type ParentInvitationResult =
  | { ok: true }
  | { ok: false; error: string };

const SEND_ERROR = "No pudimos enviar el correo. Intentá de nuevo.";
const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 5;
const CODE_MAX_ATTEMPTS = 5;
const INVITATION_TTL_DAYS = 7;

// El UI usa "tutor"; el enum de la DB usa "guardian".
const relationshipByInput: Record<RelationInput, string> = {
  mother: "mother",
  father: "father",
  tutor: "guardian",
  guardian: "guardian",
};

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(
    bytes,
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  ).join("");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateInput(input: ParentInvitationInput): string | null {
  if (!input.fullName.trim()) {
    return "Ingresá el nombre completo.";
  }
  if (!input.email) {
    return "Ingresá el email.";
  }
  if (!isValidEmail(input.email)) {
    return "El email no tiene un formato válido.";
  }
  if (!input.relation) {
    return "Elegí un parentesco.";
  }
  return null;
}

function buildInvitationEmail(params: {
  parentName: string;
  childName: string;
  code: string;
}): string {
  const activateUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/activate-account?code=${params.code}`;

  return `
    <p>Hola ${params.parentName},</p>
    <p>${params.childName} te invitó a formar parte de su guardería.</p>
    <p>Tu código de activación es: <strong>${params.code}</strong></p>
    <p><a href="${activateUrl}">Activá tu cuenta con este código</a></p>
    <p>Vence en ${INVITATION_TTL_DAYS} días.</p>
  `;
}

async function sendInvitationEmail(params: {
  resend: Resend;
  email: string;
  parentName: string;
  childName: string;
  code: string;
}): Promise<void> {
  const { error } = await params.resend.emails.send({
    from: "onboarding@resend.dev",
    to: params.email,
    subject: `Invitación para ${params.childName}`,
    html: buildInvitationEmail({
      parentName: params.parentName,
      childName: params.childName,
      code: params.code,
    }),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createParentInvitation(
  input: ParentInvitationInput,
): Promise<ParentInvitationResult> {
  const validationError = validateInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { ok: false, error: SEND_ERROR };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Tu sesión expiró. Iniciá sesión de nuevo." };
  }

  const { data: child } = await supabase
    .from("children")
    .select("id, full_name")
    .eq("id", input.childId)
    .eq("status", "active")
    .maybeSingle();

  if (!child) {
    return {
      ok: false,
      error: "No pudimos encontrar el niño. Intentá de nuevo.",
    };
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim();
  const relationship = relationshipByInput[input.relation];
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const resend = new Resend(resendKey);
  let invitationId: string;
  let code: string;

  // Inserta con reintento si el código choca con uno existente.
  for (let attempt = 1; attempt <= CODE_MAX_ATTEMPTS; attempt += 1) {
    code = generateCode();

    const { data, error } = await supabase
      .from("invitations")
      .insert({
        child_id: child.id,
        invited_by: user.id,
        full_name: fullName,
        email,
        relationship,
        code,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (!error) {
      invitationId = data.id as string;
      break;
    }

    if (error.code !== "23505" || attempt === CODE_MAX_ATTEMPTS) {
      return {
        ok: false,
        error: "No pudimos crear la invitación. Intentá de nuevo.",
      };
    }
  }

  try {
    await sendInvitationEmail({
      resend,
      email,
      parentName: fullName,
      childName: child.full_name,
      code: code!,
    });
  } catch {
    // Si falla el envío no queda ninguna invitación creada.
    await supabase.from("invitations").delete().eq("id", invitationId!);
    return { ok: false, error: SEND_ERROR };
  }

  // Con el correo enviado, cancela las pendientes previas del mismo email+niño.
  await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("child_id", child.id)
    .eq("status", "pending")
    .neq("id", invitationId!)
    .ilike("email", email);

  return { ok: true };
}
