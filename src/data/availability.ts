import type { AvailabilityRange } from "../types";

// Weekly-recurring availability HiveCare/doctors have set for each seeded
// practitioner (see Doctor Portal > Availability). Dr. James Wilson has no
// ranges at all — he was onboarded but has never logged in yet, so (as
// intended) he shows up as wholly "Unavailable" to student matching, exactly
// like the multi-role spec's own worked example.
let seq = 0;
const nextId = () => `avail_${++seq}`;

function ranges(practitionerId: string, days: number[], startTime: string, endTime: string) {
  return days.map((dayOfWeek) => ({
    id: nextId(),
    practitionerId,
    dayOfWeek,
    startTime,
    endTime,
  }));
}

export const initialAvailabilityRanges: AvailabilityRange[] = [
  // Dr. Sarah Mensah (GP) — broad Mon-Fri availability, two blocks per day.
  ...ranges("prof_mensah", [1, 2, 3, 4, 5], "9:00 AM", "12:00 PM"),
  ...ranges("prof_mensah", [1, 2, 3, 4, 5], "2:00 PM", "5:00 PM"),

  // Dr. Chidi Okafor (Mental Health) — Tuesday/Thursday mornings only.
  ...ranges("prof_okafor", [2, 4], "9:00 AM", "1:00 PM"),

  // Dr. Maria Reyes (Dermatology) — Mon/Wed/Fri, one broad block.
  ...ranges("prof_reyes", [1, 3, 5], "9:00 AM", "4:00 PM"),

  // Dr. Daniel Kim (Nutrition) — Monday mornings only.
  ...ranges("prof_kim", [1], "10:00 AM", "1:00 PM"),

  // Dr. Sarah Johnson (GP) — newly onboarded, broad Mon-Fri availability.
  ...ranges("prof_johnson", [1, 2, 3, 4, 5], "9:00 AM", "12:00 PM"),
  ...ranges("prof_johnson", [1, 2, 3, 4, 5], "2:00 PM", "5:00 PM"),

  // Dr. Michael Brown (Cardiology) — one narrow weekly block, deliberately
  // limited to demonstrate a mostly-unavailable specialist.
  ...ranges("prof_brown", [3], "2:00 PM", "4:00 PM"),

  // Dr. James Wilson — none (see note above).
];
