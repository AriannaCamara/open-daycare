import type { ReactNode } from "react";
import type {
  DaycareContact,
  DaycareInfo,
  TeamMember,
} from "@/app/_data/daycare";
import { roleLabel } from "@/app/_data/session";
import { BlockCard } from "./child-profile-blocks";

// Botón secundario del proyecto (mismo estilo que ChildNotes).
const secondaryButtonClassName =
  "cursor-pointer rounded-[10px] border border-border bg-surface px-3 py-1.5 text-[12.5px] font-bold text-[#6E6359] transition-colors hover:border-[#F2A78E]";

const avatarClassName =
  "flex size-[38px] flex-none items-center justify-center rounded-full";

// Llamar (tel:) y WhatsApp (wa.me) solo existen si hay teléfono.
function phoneActions(contact: DaycareContact): ReactNode {
  if (!contact.phone) return null;

  return (
    <>
      <a
        href={`tel:${contact.phone.replace(/[\s-]/g, "")}`}
        className={secondaryButtonClassName}
      >
        Llamar
      </a>
      <a
        href={`https://wa.me/${contact.phone.replace(/\D/g, "")}`}
        className={secondaryButtonClassName}
      >
        WhatsApp
      </a>
    </>
  );
}

// Escribir (mailto:) solo existe si hay email.
function emailActions(contact: DaycareContact): ReactNode {
  if (!contact.email) return null;

  return (
    <a
      href={`mailto:${contact.email}`}
      className={secondaryButtonClassName}
    >
      Escribir
    </a>
  );
}

const contactFields: Array<{
  label: string;
  value: (contact: DaycareContact) => string | null;
  actions?: (contact: DaycareContact) => ReactNode;
}> = [
  { label: "Nombre", value: (contact) => contact.name },
  {
    label: "Teléfono",
    value: (contact) => contact.phone,
    actions: phoneActions,
  },
  { label: "Dirección", value: (contact) => contact.address },
  { label: "Horario", value: (contact) => contact.hours },
  { label: "Email", value: (contact) => contact.email, actions: emailActions },
];

// Fila label/valor del bloque CONTACTO: el valor puede llevar botones,
// por eso no reutiliza Row (que es solo label + valor).
function ContactRow({
  label,
  value,
  actions,
  divider,
}: {
  label: string;
  value: string | null;
  actions?: ReactNode;
  divider: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-[18px] py-[15px] ${divider ? "border-t border-line" : ""}`}
    >
      <span className="text-[14.5px] text-muted">{label}</span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-right text-[14.5px] font-extrabold text-ink">
          {value ?? "—"}
        </span>
        {actions}
      </div>
    </div>
  );
}

function TeamRow({ member, divider }: { member: TeamMember; divider: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 px-[18px] py-[15px] ${divider ? "border-t border-line" : ""}`}
    >
      {member.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.fullName}
          className={`${avatarClassName} object-cover`}
        />
      ) : (
        <div
          className={`${avatarClassName} bg-[#F2937A] font-display text-[16px] font-semibold text-white`}
        >
          {member.initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-extrabold text-ink">
          {member.fullName}
        </div>
        <div className="text-[12px] text-muted-strong">
          {roleLabel(member.role)}
        </div>
      </div>
    </div>
  );
}

// Pantalla Guardería (/family/daycare): contacto de la guardería con
// enlaces nativos y el equipo staff/admin activo. Solo lectura.
export function DaycareInfo({ info }: { info: DaycareInfo }) {
  const { contact, team } = info;

  return (
    <div className="flex flex-col gap-[18px]">
      <BlockCard title="CONTACTO">
        {contactFields.map((field, index) => (
          <ContactRow
            key={field.label}
            label={field.label}
            value={field.value(contact)}
            actions={field.actions?.(contact)}
            divider={index > 0}
          />
        ))}
      </BlockCard>

      <BlockCard title="EQUIPO">
        {team.length === 0 ? (
          <p className="m-0 px-[18px] py-[15px] text-[14.5px] text-muted">
            Sin integrantes del equipo todavía.
          </p>
        ) : (
          team.map((member, index) => (
            <TeamRow
              key={member.id}
              member={member}
              divider={index > 0}
            />
          ))
        )}
      </BlockCard>
    </div>
  );
}
