import { getDay, parseISO } from "date-fns";
import { availableTimeSlots } from "../data/appointments";
import type { Appointment, AvailabilityRange } from "../types";

/**
 * Service layer for practitioner availability — kept out of UI components
 * (PART 27) so the doctor's weekly hours, the student's bookable slots, and
 * conflict prevention are all computed in exactly one place. Nothing here
 * invents availability; it only reads AvailabilityRange records the doctor
 * actually set and Appointment records that actually exist.
 */

export type SlotStatus = "available" | "booked" | "unavailable";

export const DAY_NAMES: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

/** Monday-first display order, matching how the spec's own examples list days. */
export const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** End-time options extend past the bookable slot grid (e.g. a block can end
 * at noon or 5pm even though those aren't themselves bookable start times). */
export const START_TIME_OPTIONS = availableTimeSlots;
export const END_TIME_OPTIONS = [...availableTimeSlots, "12:00 PM", "5:00 PM", "6:00 PM"];

export function timeToMinutes(label: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim());
  if (!match) return 0;
  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  if (match[3].toUpperCase() === "PM") hours += 12;
  return hours * 60 + minutes;
}

function isTimeWithinRange(time: string, startTime: string, endTime: string): boolean {
  const t = timeToMinutes(time);
  return t >= timeToMinutes(startTime) && t < timeToMinutes(endTime);
}

export function isValidRange(startTime: string, endTime: string): boolean {
  return timeToMinutes(startTime) < timeToMinutes(endTime);
}

/** Two ranges on the same day overlapping in time (used to reject a
 * duplicate/overlapping block before it's even a conflict-with-a-booking
 * problem). */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

function dayOfWeekForDate(dateStr: string): number {
  return getDay(parseISO(dateStr));
}

function isBooked(
  practitionerId: string,
  dateStr: string,
  time: string,
  appointments: Appointment[],
): boolean {
  return appointments.some(
    (a) =>
      a.professionalId === practitionerId &&
      a.date === dateStr &&
      a.time === time &&
      a.status === "upcoming",
  );
}

function isWithinAnyRange(
  practitionerId: string,
  dayOfWeek: number,
  time: string,
  availabilityRanges: AvailabilityRange[],
): boolean {
  return availabilityRanges.some(
    (r) =>
      r.practitionerId === practitionerId &&
      r.dayOfWeek === dayOfWeek &&
      isTimeWithinRange(time, r.startTime, r.endTime),
  );
}

/**
 * Status for one specific bookable slot. A confirmed appointment always wins
 * over the weekly template — the template describes intent going forward, but
 * an existing booking is a fact that must never be hidden or contradicted.
 */
export function getSlotStatus(
  practitionerId: string,
  dateStr: string,
  time: string,
  appointments: Appointment[],
  availabilityRanges: AvailabilityRange[],
): SlotStatus {
  if (isBooked(practitionerId, dateStr, time, appointments)) return "booked";
  const dayOfWeek = dayOfWeekForDate(dateStr);
  return isWithinAnyRange(practitionerId, dayOfWeek, time, availabilityRanges)
    ? "available"
    : "unavailable";
}

export function getBookableSlotsForDate(
  practitionerId: string,
  dateStr: string,
  appointments: Appointment[],
  availabilityRanges: AvailabilityRange[],
): { time: string; status: SlotStatus }[] {
  return availableTimeSlots.map((time) => ({
    time,
    status: getSlotStatus(practitionerId, dateStr, time, appointments, availabilityRanges),
  }));
}

/** Soonest open (not booked, within the weekly template) slot at or after `fromDate`,
 * searched up to `lookaheadDays` out. Returns null if the practitioner has nothing open —
 * used to show a real "Unavailable" state rather than ever inventing one. */
export function findNextAvailableSlot(
  practitionerId: string,
  appointments: Appointment[],
  availabilityRanges: AvailabilityRange[],
  fromDate: Date = new Date(),
  lookaheadDays = 21,
): { date: string; time: string } | null {
  for (let offset = 0; offset < lookaheadDays; offset++) {
    const date = new Date(fromDate);
    date.setDate(date.getDate() + offset);
    const dateStr = date.toISOString().slice(0, 10);
    const slots = getBookableSlotsForDate(practitionerId, dateStr, appointments, availabilityRanges);
    const open = slots.find((s) => s.status === "available");
    if (open) return { date: dateStr, time: open.time };
  }
  return null;
}

/** Would removing/shrinking this weekly block strand a confirmed upcoming
 * consultation? Used to block the doctor from deleting or overwriting an
 * availability slot that already has a booking (the demo must prevent this). */
export function rangeHasConflict(
  practitionerId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  appointments: Appointment[],
): boolean {
  return appointments.some((a) => {
    if (a.professionalId !== practitionerId || a.status !== "upcoming") return false;
    if (dayOfWeekForDate(a.date) !== dayOfWeek) return false;
    return isTimeWithinRange(a.time, startTime, endTime);
  });
}
