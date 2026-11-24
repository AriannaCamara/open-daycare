"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  changePassword,
  setChildPhotoConsent,
  updateNotificationSettings,
  updateProfileName,
} from "@/app/_actions/account";
import { Avatar } from "@/app/_components/avatar";
import type { FamilyChild } from "@/app/_data/family-children";
import { createClient } from "@/utils/supabase/client";

interface AccountViewProps {
  panel: "staff" | "family";
  name: string;
  email: string | null;
  subtitle: string;
  notifyOnPost: boolean;
  dailySummaryEnabled: boolean;
  familyChildren: FamilyChild[];
}

const NAME_EMPTY_ERROR = "Escribí tu nombre.";
const PASSWORD_MISMATCH_ERROR = "Las contraseñas no coinciden.";
const PASSWORD_SHORT_ERROR = "La contraseña debe tener al menos 6 caracteres.";
const MIN_PASSWORD_LENGTH = 6;

const cardClassName =
  "mb-[18px] rounded-[18px] border border-border bg-surface px-[22px] py-[18px]";
const sectionLabelClassName =
  "mb-[14px] text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]";

// Copy por panel (referencias mi-cuenta / familia-cuenta), mismas columnas.
const notificationLabels: Record<AccountViewProps["panel"], [string, string]> = {
  staff: ["Nuevos comentarios de familias", "Recordatorio de resumen (17:00)"],
  family: ["Avisos cuando se publica algo", "Resumen diario (19:00)"],
};

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#CBB89F"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function Toggle({
  checked,
  label,
  disabled,
  onToggle,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onToggle(!checked)}
      className={`relative h-6 w-[42px] flex-none rounded-full border-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5FB97E] ${
        checked ? "bg-[#5FB97E]" : "bg-[#D8CBB8]"
      } cursor-pointer`}
    >
      <span
        className={`absolute top-[3px] size-[18px] rounded-full bg-white transition-all ${
          checked ? "right-[3px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="mt-3 rounded-[12px] border border-[#F0B4A4] bg-[#F9D2DE] px-4 py-3 text-[13.5px] font-semibold text-[#B3452E]">
      {message}
    </p>
  );
}

export function AccountView({
  panel,
  name,
  email,
  subtitle,
  notifyOnPost: initialNotifyOnPost,
  dailySummaryEnabled: initialDailySummaryEnabled,
  familyChildren: initialChildren,
}: AccountViewProps) {
  const router = useRouter();

  // Tarjeta de perfil.
  const [currentName, setCurrentName] = useState(name);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Notificaciones.
  const [notifyOnPost, setNotifyOnPost] = useState(initialNotifyOnPost);
  const [dailySummaryEnabled, setDailySummaryEnabled] = useState(
    initialDailySummaryEnabled,
  );
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSaving, setNotifSaving] = useState(false);

  // Fotos de los hijos.
  const [childrenState, setChildrenState] = useState(initialChildren);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSavingId, setPhotoSavingId] = useState<string | null>(null);

  // Contraseña.
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError(NAME_EMPTY_ERROR);
      return;
    }

    setNameSaving(true);
    setNameError(null);
    const result = await updateProfileName(trimmed);
    setNameSaving(false);

    if (!result.ok) {
      setNameError(result.error);
      return;
    }

    setCurrentName(trimmed);
    setDraftName(trimmed);
    setEditingName(false);
    setNameSaved(true);
    router.refresh();
  }

  async function persistNotifications(next: {
    notifyOnPost?: boolean;
    dailySummaryEnabled?: boolean;
  }) {
    const nextNotify = next.notifyOnPost ?? notifyOnPost;
    const nextSummary = next.dailySummaryEnabled ?? dailySummaryEnabled;

    setNotifError(null);
    setNotifSaving(true);
    setNotifyOnPost(nextNotify);
    setDailySummaryEnabled(nextSummary);

    const result = await updateNotificationSettings(nextNotify, nextSummary);
    setNotifSaving(false);

    if (!result.ok) {
      // Revert al estado anterior si la persistencia falló.
      setNotifyOnPost(notifyOnPost);
      setDailySummaryEnabled(dailySummaryEnabled);
      setNotifError(result.error);
    }
  }

  async function handlePhotoToggle(childId: string, enabled: boolean) {
    setPhotoError(null);
    setPhotoSavingId(childId);
    setChildrenState((current) =>
      current.map((child) =>
        child.id === childId ? { ...child, photoConsent: enabled } : child,
      ),
    );

    const result = await setChildPhotoConsent(childId, enabled);
    setPhotoSavingId(null);

    if (!result.ok) {
      setChildrenState((current) =>
        current.map((child) =>
          child.id === childId ? { ...child, photoConsent: !enabled } : child,
        ),
      );
      setPhotoError(result.error);
      return;
    }

    // El feed (SPEC 16) decide qué fotos mostrar según photo_consent.
    router.refresh();
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setPasswordError(PASSWORD_MISMATCH_ERROR);
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(PASSWORD_SHORT_ERROR);
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSaved(false);

    const result = await changePassword(newPassword, confirmPassword);
    setPasswordSaving(false);

    if (!result.ok) {
      setPasswordError(result.error);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
  }

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const [notifyLabel, summaryLabel] = notificationLabels[panel];

  return (
    <main className="h-screen min-w-0 flex-1 overflow-y-auto pt-14 lg:pt-0">
      <div className="mx-auto w-full max-w-[680px] px-10 pb-20 pt-[34px]">
        <div className="mb-[22px]">
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
            AJUSTES
          </div>
          <h1 className="m-0 font-display text-[30px] font-semibold text-ink">
            Mi cuenta
          </h1>
        </div>

        {/* Tarjeta de perfil */}
        <div className="mb-[18px] flex items-center gap-[18px] rounded-[18px] border border-border bg-surface px-[22px] py-5">
          <div className="flex size-16 flex-none items-center justify-center rounded-full bg-[#F2937A] font-display text-[26px] font-semibold text-white">
            {currentName.trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            {editingName ? (
              <form noValidate onSubmit={handleNameSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  aria-label="Nombre"
                  onChange={(event) => {
                    setDraftName(event.target.value);
                    setNameError(null);
                  }}
                  autoFocus
                  className="min-w-0 flex-1 rounded-[12px] border-[1.5px] border-border bg-white px-3 py-2 text-[16px] text-ink focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]"
                />
                <button
                  type="submit"
                  disabled={nameSaving}
                  className="cursor-pointer rounded-[12px] border-none bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-4 py-2 text-[14px] font-extrabold text-white disabled:opacity-60"
                >
                  {nameSaving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(currentName);
                    setEditingName(false);
                    setNameError(null);
                  }}
                  className="cursor-pointer rounded-[12px] border-[1.5px] border-border bg-white px-3 py-2 text-[14px] font-bold text-[#6E6359]"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="font-display text-[20px] font-semibold text-ink">
                  {currentName}
                </div>
                {nameSaved && (
                  <span className="text-[13px] font-bold text-[#3E8B62]">
                    Guardado ✓
                  </span>
                )}
              </div>
            )}
            {email && (
              <div className="truncate text-[14px] text-[#94887B]">{email}</div>
            )}
            {subtitle && (
              <div className="mt-0.5 text-[13px] text-muted-strong">
                {subtitle}
              </div>
            )}
            {nameError && (
              <div className="mt-1 text-[13px] font-semibold text-[#B3452E]">
                {nameError}
              </div>
            )}
          </div>
          {!editingName && (
            <button
              type="button"
              onClick={() => {
                setEditingName(true);
                setNameSaved(false);
                setNameError(null);
              }}
              className="flex-none cursor-pointer rounded-[12px] border-[1.5px] border-border bg-white px-4 py-[9px] text-[14px] font-bold text-[#6E6359] transition-colors hover:border-[#F2A78E]"
            >
              Editar
            </button>
          )}
        </div>

        {/* Notificaciones */}
        <section className={cardClassName}>
          <h2 className={sectionLabelClassName}>NOTIFICACIONES</h2>
          <div className="flex items-center justify-between border-b border-line py-2">
            <span className="text-[15px] text-ink-soft">{notifyLabel}</span>
            <Toggle
              checked={notifyOnPost}
              label={notifyLabel}
              disabled={notifSaving}
              onToggle={(next) => persistNotifications({ notifyOnPost: next })}
            />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[15px] text-ink-soft">{summaryLabel}</span>
            <Toggle
              checked={dailySummaryEnabled}
              label={summaryLabel}
              disabled={notifSaving}
              onToggle={(next) =>
                persistNotifications({ dailySummaryEnabled: next })
              }
            />
          </div>
          <InlineError message={notifError} />
        </section>

        {/* Mis hijos (solo familia, sin hijos → no se renderiza) */}
        {panel === "family" && childrenState.length > 0 && (
          <section className={cardClassName}>
            <h2 className={sectionLabelClassName}>MIS HIJOS</h2>
            <div className="flex flex-col gap-3.5">
              {childrenState.map((child) => (
                <div key={child.id} className="flex items-center gap-[13px]">
                  <Avatar
                    initial={child.initial}
                    tone={child.tone}
                    variant="child"
                    className="size-[42px] text-[16px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-extrabold text-ink">
                      {child.fullName}
                    </div>
                    <div className="text-[13px] text-muted-strong">
                      {child.ageYears} años · Sala {child.roomName}
                    </div>
                  </div>
                  <span className="text-[13px] text-[#94887B]">Fotos</span>
                  <Toggle
                    checked={child.photoConsent}
                    label={`Fotos de ${child.fullName}`}
                    disabled={photoSavingId === child.id}
                    onToggle={(next) => handlePhotoToggle(child.id, next)}
                  />
                </div>
              ))}
            </div>
            <InlineError message={photoError} />
          </section>
        )}

        {/* Cambiar contraseña */}
        <section className="mb-[18px] overflow-hidden rounded-[18px] border border-border bg-surface">
          <button
            type="button"
            aria-expanded={passwordOpen}
            onClick={() => {
              setPasswordOpen((open) => !open);
              setPasswordError(null);
              setPasswordSaved(false);
            }}
            className="flex w-full cursor-pointer items-center justify-between border-b border-line bg-transparent px-[22px] py-4 text-left"
          >
            <span className="text-[15px] font-semibold text-ink-soft">
              Cambiar contraseña
            </span>
            <ChevronIcon />
          </button>

          {passwordOpen && (
            <form
              noValidate
              onSubmit={handlePasswordSubmit}
              className="px-[22px] py-5"
            >
              <div className="mb-[14px]">
                <label
                  htmlFor="account-new-password"
                  className="mb-2 block text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]"
                >
                  NUEVA CONTRASEÑA
                </label>
                <input
                  id="account-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value);
                    setPasswordError(null);
                    setPasswordSaved(false);
                  }}
                  className="w-full rounded-[14px] border-[1.5px] border-border bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]"
                />
              </div>
              <div className="mb-[14px]">
                <label
                  htmlFor="account-confirm-password"
                  className="mb-2 block text-[12px] font-extrabold tracking-[0.7px] text-[#94887B]"
                >
                  CONFIRMAR CONTRASEÑA
                </label>
                <input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setPasswordError(null);
                    setPasswordSaved(false);
                  }}
                  className="w-full rounded-[14px] border-[1.5px] border-border bg-white px-4 py-[13px] text-[15px] text-ink placeholder:text-[#B6A99B] focus:border-[#F2937A] focus:outline-2 focus:outline-offset-2 focus:outline-[#B3452E]"
                />
              </div>

              {passwordSaved && (
                <p className="mb-[14px] rounded-[12px] border border-[#B9DEC4] bg-[#E4F3E9] px-4 py-3 text-[13.5px] font-semibold text-[#3E8B62]">
                  Contraseña actualizada.
                </p>
              )}
              <InlineError message={passwordError} />

              <button
                type="submit"
                disabled={passwordSaving}
                className="cursor-pointer rounded-[12px] border-none bg-[linear-gradient(180deg,#F4977E,#EE8164)] px-5 py-[10px] text-[14.5px] font-extrabold text-white shadow-[0_8px_18px_-8px_rgba(238,129,100,0.75)] disabled:opacity-60"
              >
                {passwordSaving ? "Guardando…" : "Cambiar contraseña"}
              </button>
            </form>
          )}
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="block w-full cursor-pointer rounded-[14px] border-[1.5px] border-[#F2C4B6] bg-[#FBEAE3] px-[14px] py-[14px] text-[15px] font-extrabold text-accent"
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  );
}
