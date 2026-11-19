"use client";

import { useState, type ReactNode } from "react";
import { Avatar } from "@/app/_components/avatar";
import {
  formatSleepMinutes,
  type DailyMoment,
  type DailySummary,
} from "@/app/_data/daily-summary";
import { postKindLabels, postKindStyles } from "@/app/_data/feed";
import type { FamilyChild } from "@/app/_data/family-children";

export interface DailySummaryEntry {
  child: FamilyChild;
  summary: DailySummary | null; // null = sin registro hoy
  moments: DailyMoment[];
}

interface DailySummaryViewProps {
  entries: DailySummaryEntry[];
  dateLabel: string; // "martes 17 de junio"
}

// Pestañas pill: activa oscura, inactiva borde claro (ref. resumen-dia).
const activeTabClassName = "border-[#3F362E] bg-[#3F362E] text-white";
const inactiveTabClassName = "border-[#ECE0D0] bg-[#FFFDF9] text-[#6E6359]";

// "Mateo Fernández" → "Mateo" (mismo given name que el pill del feed).
function toGivenName(fullName: string): string {
  return fullName.trim().split(" ")[0];
}

function MetricCard({
  icon,
  value,
  label,
  background,
  color,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  background: string;
  color: string;
}) {
  return (
    <div
      className="rounded-[18px] px-2 py-5 text-center sm:px-5"
      style={{ background }}
    >
      <div className="mb-2 flex justify-center">{icon}</div>
      <div
        className="font-display text-[26px] font-semibold whitespace-nowrap"
        style={{ color }}
      >
        {value}
      </div>
      <div className="text-[13px] font-semibold" style={{ color }}>
        {label}
      </div>
    </div>
  );
}

function BowlIcon({ color }: { color: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11h18a8 8 0 0 1-16 0M12 3v3" />
    </svg>
  );
}

function MoonIcon({ color }: { color: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  );
}

function StarIcon({ color }: { color: string }) {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.1 1-5.8-4.3-4.1 5.9-.9z" />
    </svg>
  );
}

function SmileIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#C56486"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </svg>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3.5 text-[12.5px] font-extrabold tracking-[0.8px] text-[#8A7C6D]">
      {children}
    </div>
  );
}

function NoKidsState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1]/60 px-6 py-12 text-center">
      <p className="m-0 font-display text-[18px] font-semibold text-ink">
        Todavía no tenés hijos vinculados…
      </p>
      <p className="m-0 text-[14px] text-muted">
        Cuando la guardería te vincule con tu hijo, vas a ver su resumen acá.
      </p>
    </div>
  );
}

function NoSummaryState() {
  return (
    <div className="mb-6 flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-[#DBCDBA] bg-[#F4ECE1]/60 px-6 py-12 text-center">
      <p className="m-0 font-display text-[18px] font-semibold text-ink">
        Todavía no hay resumen para hoy
      </p>
      <p className="m-0 text-[14px] text-muted">
        Cuando el staff lo cargue, vas a verlo acá.
      </p>
    </div>
  );
}

export function DailySummaryView({ entries, dateLabel }: DailySummaryViewProps) {
  const [selectedId, setSelectedId] = useState(entries[0]?.child.id ?? "");
  const selected =
    entries.find((entry) => entry.child.id === selectedId) ?? entries[0];

  if (!selected) {
    return <NoKidsState />;
  }

  const { child, summary, moments } = selected;
  const givenName = toGivenName(child.fullName);

  return (
    <>
      <div className="mb-[22px] flex flex-wrap gap-[10px]">
        {entries.map((entry) => {
          const isActive = entry.child.id === selected.child.id;
          return (
            <button
              key={entry.child.id}
              type="button"
              onClick={() => setSelectedId(entry.child.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-[15px] py-[7px] text-[14px] font-bold ${isActive ? activeTabClassName : inactiveTabClassName}`}
            >
              <Avatar
                initial={entry.child.initial}
                tone={entry.child.tone}
                variant="child"
                className="size-[26px] text-[13px]"
              />
              {toGivenName(entry.child.fullName)}
            </button>
          );
        })}
      </div>

      <div className="mb-[22px] rounded-[22px] bg-[linear-gradient(160deg,#FBE0D2,#F9D2DE)] px-[30px] py-[28px]">
        <div className="mb-1.5 text-[12.5px] font-extrabold tracking-[0.8px] text-accent">
          RESUMEN DEL DÍA
        </div>
        <h1 className="m-0 font-display text-[32px] font-semibold text-ink">
          El día de {givenName}
        </h1>
        <p className="mt-1.5 mb-0 text-[15px] text-[#9A6A6A]">{dateLabel}</p>
      </div>

      {summary === null ? (
        <NoSummaryState />
      ) : (
        <>
          <div className="mb-[18px] grid grid-cols-3 gap-[14px]">
            <MetricCard
              icon={<BowlIcon color="#9A7B1E" />}
              value={String(summary.mealsCount)}
              label="comidas"
              background="#F7E7A6"
              color="#9A7B1E"
            />
            <MetricCard
              icon={<MoonIcon color="#7B5FC0" />}
              value={formatSleepMinutes(summary.sleepMinutes)}
              label="de siesta"
              background="#E7DCF6"
              color="#7B5FC0"
            />
            <MetricCard
              icon={<StarIcon color="#2E89A6" />}
              value={String(summary.activitiesCount)}
              label="momentos"
              background="#C7E7F1"
              color="#2E89A6"
            />
          </div>

          <div className="mb-6 flex items-center gap-[14px] rounded-[16px] border border-border bg-surface px-[18px] py-4">
            <div className="flex size-11 flex-none items-center justify-center rounded-full bg-[#F9D2DE]">
              <SmileIcon />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-muted-strong">
                Ánimo del día
              </div>
              <div className="font-display text-[18px] font-semibold text-ink">
                {summary.mood}
              </div>
            </div>
          </div>

          <SectionLabel>LO MÁS LINDO DE HOY</SectionLabel>
          <p className="mt-0 mb-6 rounded-[16px] border border-border bg-surface px-[18px] py-4 text-[15px] leading-[1.5] text-ink">
            {summary.highlight}
          </p>
        </>
      )}

      <SectionLabel>MOMENTOS DEL DÍA</SectionLabel>
      {moments.length === 0 ? (
        <p className="m-0 text-[14.5px] text-muted">
          Todavía no hay momentos hoy.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
          {moments.map((moment) => {
            const style = postKindStyles[moment.kind];
            return (
              <li key={moment.id} className="flex items-start gap-[14px]">
                <span
                  className="flex size-[38px] flex-none items-center justify-center rounded-full"
                  style={{ background: style.pill.bg }}
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ background: style.pill.text }}
                  />
                </span>
                <div className="min-w-0">
                  <div
                    className="font-display text-[16px] font-semibold"
                    style={{ color: style.pill.text }}
                  >
                    {moment.body}
                  </div>
                  <div className="mt-0.5 text-[14px] text-muted">
                    {moment.time} · {postKindLabels[moment.kind]}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
