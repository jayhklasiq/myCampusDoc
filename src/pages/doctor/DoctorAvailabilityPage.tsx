import { AlertCircle, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import {
  DAY_NAMES,
  END_TIME_OPTIONS,
  START_TIME_OPTIONS,
  WEEK_DISPLAY_ORDER,
  timeToMinutes,
} from "../../lib/availability";

export function DoctorAvailabilityPage() {
  const { doctorSession, availabilityRanges, addAvailabilityRange, removeAvailabilityRange } = useApp();
  const practitionerId = doctorSession!.practitionerId;
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState(START_TIME_OPTIONS[0]);
  const [endTime, setEndTime] = useState(END_TIME_OPTIONS[END_TIME_OPTIONS.length - 1]);
  const [error, setError] = useState<string | null>(null);

  const rangesByDay = useMemo(() => {
    const map = new Map<number, typeof availabilityRanges>();
    for (const day of WEEK_DISPLAY_ORDER) map.set(day, []);
    for (const range of availabilityRanges) {
      if (range.practitionerId !== practitionerId) continue;
      map.get(range.dayOfWeek)?.push(range);
    }
    for (const list of map.values()) list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    return map;
  }, [availabilityRanges, practitionerId]);

  function openAddForm(day: number) {
    setAddingDay(day);
    setStartTime(START_TIME_OPTIONS[0]);
    setEndTime(END_TIME_OPTIONS[END_TIME_OPTIONS.length - 1]);
    setError(null);
  }

  function handleAdd(day: number) {
    const result = addAvailabilityRange(practitionerId, day, startTime, endTime);
    if (!result.success) {
      setError(result.error ?? "Couldn't add that block.");
      return;
    }
    setAddingDay(null);
    setError(null);
  }

  function handleRemove(rangeId: string) {
    const result = removeAvailabilityRange(rangeId);
    if (!result.success) setError(result.error ?? "Couldn't remove that block.");
  }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Availability</h1>
        <p className="text-sm text-ink-500">
          Set your weekly hours — students only see and book what you set here.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {WEEK_DISPLAY_ORDER.map((day) => {
          const ranges = rangesByDay.get(day) ?? [];
          return (
            <section key={day} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-ink-900">{DAY_NAMES[day]}</h2>
                <button
                  type="button"
                  onClick={() => openAddForm(day)}
                  className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>

              {ranges.length === 0 ? (
                <p className="text-sm text-ink-400 italic">Unavailable</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {ranges.map((range) => (
                    <span
                      key={range.id}
                      className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-700"
                    >
                      {range.startTime} - {range.endTime}
                      <button
                        type="button"
                        onClick={() => handleRemove(range.id)}
                        className="text-ink-400 hover:text-danger-500"
                        aria-label={`Remove ${DAY_NAMES[day]} ${range.startTime} to ${range.endTime}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {addingDay === day && (
                <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-ink-100 pt-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium tracking-wide text-ink-400 uppercase">
                      Start
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm"
                    >
                      {START_TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium tracking-wide text-ink-400 uppercase">
                      End
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-sm"
                    >
                      {END_TIME_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" size="sm" onClick={() => handleAdd(day)}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAddingDay(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
