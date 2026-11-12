import type { ReactNode } from "react";
import { formatNoteDate } from "@/app/_data/child-mapper";
import type { ChildCare, ChildNote } from "@/app/_data/family-children";

const careFields: Array<{
  label: string;
  value: (care: ChildCare) => string | null;
}> = [
  { label: "Contacto de emergencia", value: (care) => care.emergencyContact },
  {
    label: "Persona autorizada a retirar",
    value: (care) => care.pickupAuthorization,
  },
  { label: "Dieta / restricciones", value: (care) => care.diet },
  { label: "Medicación", value: (care) => care.medication },
  { label: "Siesta / rutinas", value: (care) => care.napSchedule },
  { label: "Notas médicas", value: (care) => care.medicalNotes },
  {
    label: "Alergias",
    value: (care) => (care.allergyTags.length ? care.allergyTags.join(", ") : null),
  },
];

function BlockCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-line px-[18px] py-[15px]">
        <span className="text-[14.5px] font-extrabold text-ink">{title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 px-[18px] py-[15px] ${divider ? "border-t border-line" : ""}`}
    >
      <span className="text-[14.5px] text-muted">{label}</span>
      <span className="text-right text-[14.5px] font-extrabold text-ink">
        {value}
      </span>
    </div>
  );
}

// Bloque CUIDADOS (solo lectura). `action` deja insertar el botón "Editar"
// de la vista familiar; la ficha staff no lo pasa.
export function CareBlock({
  care,
  action,
}: {
  care: ChildCare;
  action?: ReactNode;
}) {
  return (
    <BlockCard title="CUIDADOS" action={action}>
      {careFields.map((field, index) => (
        <Row
          key={field.label}
          label={field.label}
          value={field.value(care) ?? "—"}
          divider={index > 0}
        />
      ))}
      <Row
        label="Consentimiento de fotos"
        value={care.photoConsent ? "Sí" : "No"}
        divider
      />
    </BlockCard>
  );
}

// Bloque ACLARACIONES: lista de notas con fecha. `renderNoteBody` permite
// reemplazar el cuerpo (editor inline en la vista familiar); `renderNoteActions`
// agrega Editar/Borrar por nota; `children` deja un slot para el formulario
// "Agregar aclaración". La ficha staff solo pasa `notes`.
export function NotesBlock({
  notes,
  renderNoteBody,
  renderNoteActions,
  children,
}: {
  notes: ChildNote[];
  renderNoteBody?: (note: ChildNote, defaultBody: ReactNode) => ReactNode;
  renderNoteActions?: (note: ChildNote) => ReactNode;
  children?: ReactNode;
}) {
  return (
    <BlockCard title="ACLARACIONES">
      {notes.length === 0 ? (
        <p className="m-0 px-[18px] py-[15px] text-[14.5px] text-muted">
          Sin aclaraciones todavía.
        </p>
      ) : (
        notes.map((note, index) => {
          const defaultBody = (
            <>
              <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.5] text-ink">
                {note.body}
              </p>
              <p className="mt-[5px] mb-0 text-[13px] text-muted">
                {formatNoteDate(note.createdAt)}
              </p>
            </>
          );

          return (
            <div
              key={note.id}
              className={`flex items-start justify-between gap-4 px-[18px] py-[15px] ${index > 0 ? "border-t border-line" : ""}`}
            >
              <div className="min-w-0 flex-1">
                {renderNoteBody ? renderNoteBody(note, defaultBody) : defaultBody}
              </div>
              {renderNoteActions?.(note)}
            </div>
          );
        }))}
      {children}
    </BlockCard>
  );
}
