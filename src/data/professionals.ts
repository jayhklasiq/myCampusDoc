import type { HealthProfessional } from "../types";

export const professionals: HealthProfessional[] = [
  {
    id: "prof_mensah",
    name: "Dr. Sarah Mensah",
    title: "MD",
    specialty: "General Practice",
    avatar: "SM",
    online: true,
    availabilityNote: "Available today until 6:00 PM",
  },
  {
    id: "prof_okafor",
    name: "Dr. Chidi Okafor",
    title: "MD",
    specialty: "Psychiatry & Mental Health",
    avatar: "CO",
    online: false,
    availabilityNote: "Next available tomorrow, 9:00 AM",
  },
  {
    id: "prof_reyes",
    name: "Dr. Maria Reyes",
    title: "MD",
    specialty: "Dermatology",
    avatar: "MR",
    online: true,
    availabilityNote: "Available today until 4:00 PM",
  },
  {
    id: "prof_kim",
    name: "Dr. Daniel Kim",
    title: "NP",
    specialty: "Nutrition & Wellness",
    avatar: "DK",
    online: false,
    availabilityNote: "Available Monday, 10:00 AM",
  },
];

export function getProfessional(id: string): HealthProfessional | undefined {
  return professionals.find((p) => p.id === id);
}
