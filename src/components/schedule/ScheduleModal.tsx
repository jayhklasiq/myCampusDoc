import { CalendarCheck, Phone, Video } from "lucide-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { AppointmentCard } from "./AppointmentCard";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { availableTimeSlots, professionals } from "../../data";
import { formatDayLabel } from "../../lib/format";
import type { Appointment, ConsultationType } from "../../types";

interface ScheduleModalProps {
  open: boolean;
  date: string | null;
  existingAppointments: Appointment[];
  initialConsultationType?: ConsultationType | null;
  initialProfessionalId?: string | null;
  sourceLabel?: string | null;
  onClose: () => void;
  onConfirm: (input: {
    time: string;
    consultationType: ConsultationType;
    professionalId: string;
    needToKnow: string;
  }) => Appointment;
}

function getUnavailableSlots(dateStr: string): Set<string> {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  const count = 1 + (hash % 2);
  const indices = new Set<number>();
  for (let i = 0; i < count; i++) {
    indices.add((hash + i * 3) % availableTimeSlots.length);
  }
  return new Set([...indices].map((i) => availableTimeSlots[i]));
}

export function ScheduleModal({
  open,
  date,
  existingAppointments,
  initialConsultationType,
  initialProfessionalId,
  sourceLabel,
  onClose,
  onConfirm,
}: ScheduleModalProps) {
  const [step, setStep] = useState<"form" | "success">("form");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [consultationType, setConsultationType] = useState<ConsultationType>("audio");
  const [needToKnow, setNeedToKnow] = useState("");
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("form");
      setSelectedTime(null);
      setConsultationType(initialConsultationType ?? "audio");
      setNeedToKnow("");
      setConfirmed(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  if (!date) return null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPastDate = date < todayStr;
  const unavailable = getUnavailableSlots(date);
  const bookedTimes = new Set(existingAppointments.map((a) => a.time));
  const assignedProfessional =
    professionals.find((p) => p.id === initialProfessionalId) ?? professionals[0];

  const upcomingOnDate = existingAppointments.filter((a) => a.status === "upcoming");
  const pastOnDate = existingAppointments.filter((a) => a.status !== "upcoming");

  function handleConfirm() {
    if (!selectedTime) {
      setError("Select an available time to continue.");
      return;
    }
    const appointment = onConfirm({
      time: selectedTime,
      consultationType,
      professionalId: assignedProfessional.id,
      needToKnow: needToKnow.trim(),
    });
    setConfirmed(appointment);
    setStep("success");
  }

  return (
    <Modal open={open} onClose={onClose} title={sourceLabel ?? "Schedule Consultation"}>
      {step === "success" && confirmed ? (
        <div className="flex flex-col items-center px-1 py-2 text-center">
          <div className="animate-scale-in mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-500">
            <CalendarCheck className="h-9 w-9" strokeWidth={1.75} />
          </div>
          <h3 className="text-lg font-semibold text-ink-900">Appointment confirmed</h3>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-500">
            Your {confirmed.consultationType} consultation with {assignedProfessional.name} is set
            for {formatDayLabel(confirmed.date)} at {confirmed.time}.
          </p>
          <Button size="lg" fullWidth className="mt-6" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium tracking-wide text-ink-400 uppercase">
              Selected Date
            </p>
            <p className="text-base font-semibold text-ink-900">{formatDayLabel(date)}</p>
          </div>

          {(upcomingOnDate.length > 0 || pastOnDate.length > 0) && (
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-ink-400 uppercase">
                Existing Appointments
              </p>
              <div className="flex flex-col gap-2">
                {[...upcomingOnDate, ...pastOnDate].map((appt) => (
                  <AppointmentCard key={appt.id} appointment={appt} />
                ))}
              </div>
            </div>
          )}

          {isPastDate ? (
            <p className="rounded-xl bg-ink-50 px-3.5 py-3 text-sm text-ink-500">
              This date has already passed, so a new appointment can't be booked here.
            </p>
          ) : (
            <>
              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-ink-400 uppercase">
                  Available Times
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {availableTimeSlots.map((slot) => {
                    const isBooked = bookedTimes.has(slot) || unavailable.has(slot);
                    const isSelected = selectedTime === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => {
                          setSelectedTime(slot);
                          setError(null);
                        }}
                        className={clsx(
                          "rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors",
                          isBooked && "cursor-not-allowed border-ink-100 bg-ink-50 text-ink-300 line-through",
                          !isBooked &&
                            !isSelected &&
                            "border-ink-200 text-ink-700 hover:border-brand-300",
                          isSelected && "border-brand-600 bg-brand-600 text-white",
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {error && <p className="mt-2 text-xs font-medium text-danger-600">{error}</p>}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-ink-400 uppercase">
                  Consultation Type
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConsultationType("audio")}
                    className={clsx(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                      consultationType === "audio"
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-ink-200 text-ink-700 hover:border-brand-300",
                    )}
                  >
                    <Phone className="h-4 w-4" />
                    Audio
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultationType("video")}
                    className={clsx(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors",
                      consultationType === "video"
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-ink-200 text-ink-700 hover:border-brand-300",
                    )}
                  >
                    <Video className="h-4 w-4" />
                    Video
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-xl bg-ink-50 px-3.5 py-2.5">
                <Avatar
                  initials={assignedProfessional.avatar}
                  seed={assignedProfessional.id}
                  size="sm"
                />
                <p className="text-xs text-ink-600">
                  You'll be matched with{" "}
                  <span className="font-semibold text-ink-800">{assignedProfessional.name}</span>
                </p>
              </div>

              <div>
                <label
                  htmlFor="need-to-know"
                  className="mb-1.5 block text-xs font-medium tracking-wide text-ink-400 uppercase"
                >
                  What does your health professional need to know?
                </label>
                <textarea
                  id="need-to-know"
                  rows={3}
                  value={needToKnow}
                  onChange={(e) => setNeedToKnow(e.target.value)}
                  placeholder="Tell your health professional anything they should know before your consultation..."
                  className="w-full resize-none rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <Button size="lg" fullWidth onClick={handleConfirm}>
                Confirm Appointment
              </Button>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
