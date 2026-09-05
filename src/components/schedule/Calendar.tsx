import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useMemo, useState } from "react";
import type { Appointment } from "../../types";

interface CalendarProps {
  appointments: Appointment[];
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
}

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function Calendar({ appointments, selectedDate, onSelectDate }: CalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    selectedDate ? parseISO(selectedDate) : new Date(),
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(visibleMonth));
    const end = endOfWeek(endOfMonth(visibleMonth));
    return eachDayOfInterval({ start, end });
  }, [visibleMonth]);

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const appt of appointments) {
      const list = map.get(appt.date) ?? [];
      list.push(appt);
      map.set(appt.date, list);
    }
    return map;
  }, [appointments]);

  const today = new Date();

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => subMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-ink-900">{format(visibleMonth, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="pb-1.5 text-[11px] font-semibold text-ink-400">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, visibleMonth);
          const dayAppointments = appointmentsByDate.get(dateStr) ?? [];
          const hasUpcoming = dayAppointments.some((a) => a.status === "upcoming");
          const hasPast = dayAppointments.some((a) => a.status !== "upcoming");
          const isSelected = selectedDate === dateStr;
          const isCurrentDay = isToday(day);
          const isPastDay = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={clsx(
                "relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm transition-colors",
                !inMonth && "text-ink-300",
                inMonth && !isSelected && "text-ink-700 hover:bg-ink-100",
                isSelected && "bg-brand-600 font-semibold text-white",
                isCurrentDay && !isSelected && "font-semibold text-brand-600 ring-1 ring-brand-300",
                isPastDay && inMonth && !isSelected && "text-ink-400",
              )}
            >
              {day.getDate()}
              {(hasUpcoming || hasPast) && (
                <span
                  className={clsx(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-white" : hasUpcoming ? "bg-accent-500" : "bg-ink-300",
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 border-t border-ink-100 pt-3 text-[11px] text-ink-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-500" /> Upcoming
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-ink-300" /> Past
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full ring-1 ring-brand-300" /> Today
        </span>
      </div>
    </div>
  );
}
