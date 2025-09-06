"use client";

import React, { useEffect, useMemo, useState } from "react";

export type StepScheduleProps = {
  /** ISO sélectionné, ex: "2025-04-12T09:00:00.000Z" */
  selectedISO: string | null;
  /** Remonte l’ISO au parent (à persister dans ton state/devis) */
  onChange: (iso: string | null) => void;

  /** ISO "YYYY-MM-DD" à bloquer (fériés, indispos, congés, fully booked, …) */
  blockedDates?: string[];

  /** Pré-sélectionner automatiquement le prochain samedi libre */
  autoSelectNextSaturday?: boolean;

  /** Si true, la prise de RDV à domicile est interdite (ex. châssis/face arrière iPhone) */
  forbiddenAtHome?: boolean;
  /** Message affiché si interdit (expliquant pourquoi) */
  forbiddenReason?: string | null;
};

/* ────────────────────────────────────────────────────────────────────────── */
/* Config métier                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Samedi uniquement, itinérance 9h→17h, 6 créneaux ~45 min
const WORK_START_H = 9;
const WORK_END_H = 17;
const SLOT_LABELS = ["09:00", "10:15", "11:30", "13:00", "14:15", "15:30"] as const;
/** minutes depuis minuit pour chaque créneau (09:00, 10:15, …) */
const SLOT_MINUTES = [540, 615, 690, 780, 855, 930]; // 9*60, 10*60+15, etc.
const SLOT_DURATION_MIN = 45;

/* ────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const addMonths    = (d: Date, m: number) => new Date(d.getFullYear(), d.getMonth() + m, 1);
const isSameDay    = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dateKey      = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const formatDate   = (d: Date) => new Intl.DateTimeFormat("fr-BE", { weekday: "long", day: "2-digit", month: "long" }).format(d);
const formatTime   = (minFromMidnight: number) => {
  const h = Math.floor(minFromMidnight / 60);
  const m = minFromMidnight % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
};

const toISOAtMinutes = (date: Date, minFromMidnight: number) => {
  const h = Math.floor(minFromMidnight / 60);
  const m = minFromMidnight % 60;
  // Crée un ISO UTC depuis le fuseau local (aligné avec le reste de l’app)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0).toISOString();
};

/* ────────────────────────────────────────────────────────────────────────── */

const StepSchedule: React.FC<StepScheduleProps> = ({
  selectedISO,
  onChange,
  blockedDates = [],
  autoSelectNextSaturday = true,
  forbiddenAtHome = false,
  forbiddenReason = "Cette intervention n’est pas disponible à domicile.",
}) => {
  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);
  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);

  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(today));
  const selectedDate = selectedISO ? new Date(selectedISO) : null;
  const selectedDay  = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) : null;
  const selectedMin  = selectedDate ? selectedDate.getHours() * 60 + selectedDate.getMinutes() : null;

  // Grille de jours (Lundi→Dim)
  const daysGrid = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    const days: Date[] = [];
    const startWeekday = (start.getDay() + 6) % 7; // 0 = lundi
    for (let i = 0; i < startWeekday; i++) { const d = new Date(start); d.setDate(d.getDate() - (startWeekday - i)); days.push(d); }
    for (let d = 1; d <= end.getDate(); d++) days.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
    while (days.length % 7 !== 0) { const last = days[days.length - 1]; const next = new Date(last); next.setDate(next.getDate() + 1); days.push(next); }
    return days;
  }, [viewMonth]);

  const canPickDay = (d: Date) => {
    const isSaturday = d.getDay() === 6; // Saturday = 6
    const isInView   = d.getMonth() === viewMonth.getMonth();
    const isPast     = d < today;
    const isBlocked  = blocked.has(dateKey(d));
    return isSaturday && isInView && !isPast && !isBlocked && !forbiddenAtHome;
  };

  const onPickDay = (d: Date) => {
    if (!canPickDay(d)) return;
    // Par défaut on propose le 1er créneau (09:00)
    onChange(toISOAtMinutes(d, SLOT_MINUTES[0]));
  };

  const isDisabledSlot = (day: Date, startMin: number) => {
    // Désactive si passé ou si l’intervention finirait après 17:00
    const now = new Date();
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(startMin/60), startMin%60, 0);
    const end = new Date(start.getTime() + SLOT_DURATION_MIN * 60000);
    const endsAfterWork = end.getHours() + end.getMinutes()/60 > WORK_END_H + 1e-9;
    return start < now || endsAfterWork || forbiddenAtHome;
  };

  const onPickSlot = (minFromMidnight: number) => {
    if (!selectedDay) return;
    if (isDisabledSlot(selectedDay, minFromMidnight)) return;
    onChange(toISOAtMinutes(selectedDay, minFromMidnight));
  };

  // Si aucun samedi futur dans le mois affiché, on avance automatiquement
  useEffect(() => {
    const anySat = daysGrid.some(d => (d.getDay() === 6) && d >= today);
    if (!anySat) setViewMonth(addMonths(viewMonth, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pré-sélectionner le prochain samedi libre
  useEffect(() => {
    if (!autoSelectNextSaturday || selectedISO || forbiddenAtHome) return;

    const next = (() => {
      const d = new Date(today);
      while ((d.getDay() !== 6 || blocked.has(dateKey(d)))) {
        d.setDate(d.getDate() + 1);
        if (d.getFullYear() - today.getFullYear() > 1) break;
      }
      return d >= today && d.getDay() === 6 && !blocked.has(dateKey(d)) ? d : null;
    })();

    if (next) {
      onChange(toISOAtMinutes(next, SLOT_MINUTES[0]));
      setViewMonth(startOfMonth(next));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSelectNextSaturday, blockedDates.join("|"), forbiddenAtHome]);

  /* ───────────────── UI ──────────────── */

  if (forbiddenAtHome) {
    return (
      <section className="w-full rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <h2 className="text-base font-semibold text-amber-900">Intervention en atelier requise</h2>
        <p className="mt-1 text-sm text-amber-800">
          {forbiddenReason || "Cette intervention n’est pas disponible à domicile."}
          {" "}Veuillez sélectionner <strong>“En atelier”</strong> pour poursuivre.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="step-schedule-title" className="w-full">
      <header className="mb-3">
        <h2 id="step-schedule-title" className="text-xl font-semibold text-[#222]">4) Choisissez votre créneau</h2>
        <p className="text-sm text-gray-600">
          Domicile uniquement — <strong>samedi</strong>, de <strong>{String(WORK_START_H).padStart(2,"0")}:00</strong> à <strong>{WORK_END_H}:00</strong> — interventions ~<strong>{SLOT_DURATION_MIN} min</strong>.
        </p>
      </header>

      {/* Calendrier */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-[#edfbe2]">
          <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, -1))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm bg-white hover:bg-gray-50">←</button>
          <div className="text-sm font-semibold text-[#222]">
            {new Intl.DateTimeFormat("fr-BE", { month: "long", year: "numeric" }).format(viewMonth)}
          </div>
          <button type="button" onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm bg-white hover:bg-gray-50">→</button>
        </div>

        <div className="px-3 py-3">
          <div className="grid grid-cols-7 text-center text-[11px] text-gray-500 mb-2">
            {WEEKDAYS.map((w) => (<div key={w} className="py-1">{w}</div>))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((d, i) => {
              const out = d.getMonth() !== viewMonth.getMonth();
              const selectable = canPickDay(d);
              const selected = selectedDay && isSameDay(d, selectedDay);
              const blockedDay = blocked.has(dateKey(d));
              return (
                <button
                  key={`${d.toDateString()}-${i}`}
                  type="button"
                  disabled={!selectable}
                  onClick={() => onPickDay(d)}
                  className={[
                    "aspect-square rounded-lg text-sm",
                    selectable ? (selected ? "bg-[#54b435] text-white" : "bg-white border border-gray-300 hover:border-[#54b435] hover:shadow-sm")
                               : "bg-gray-100 text-gray-400",
                    out && "opacity-50",
                    blockedDay && "line-through"
                  ].join(" ")}
                  title={blockedDay ? "Indisponible" : undefined}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slots horaires (exactement 6) */}
      <div className="mt-4">
        <div className="mb-2 text-sm text-gray-700">
          {selectedDay
            ? <>Samedi sélectionné : <strong>{formatDate(selectedDay)}</strong></>
            : <>Choisissez un <strong>samedi</strong> dans le calendrier.</>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {SLOT_MINUTES.map((min, idx) => {
            const active = selectedDay && selectedMin === min;
            const disabled = !selectedDay || isDisabledSlot(selectedDay!, min);
            return (
              <button
                key={min}
                type="button"
                disabled={disabled}
                onClick={() => onPickSlot(min)}
                className={[
                  "rounded-xl px-3 py-2 text-sm border transition",
                  active ? "border-[#54b435] bg-[#edfbe2] text-[#222]" : "border-gray-300 bg-white hover:border-[#54b435]",
                  disabled && "opacity-50 cursor-not-allowed"
                ].join(" ")}
                aria-label={`Créneau ${SLOT_LABELS[idx]}`}
                title={SLOT_LABELS[idx]}
              >
                {SLOT_LABELS[idx]}
              </button>
            );
          })}
        </div>

        {!selectedISO && <p className="mt-2 text-[11px] text-gray-500">Sélectionnez une date (samedi) puis un créneau.</p>}
      </div>
    </section>
  );
};

export default StepSchedule;
