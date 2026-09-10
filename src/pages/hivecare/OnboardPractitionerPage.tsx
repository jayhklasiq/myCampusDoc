import { CheckCircle2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useApp } from "../../context/AppContext";
import { PROFESSIONAL_LEVELS } from "../../lib/practitionerOptions";
import { CLINICIAN_TYPE_LABELS } from "../../lib/triage";
import type { ClinicianType, ProfessionalLevel } from "../../types";

const CLINICIAN_TYPE_OPTIONS = Object.entries(CLINICIAN_TYPE_LABELS) as [ClinicianType, string][];

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  professionalLevel: ProfessionalLevel;
  clinicianType: ClinicianType;
}

const EMPTY_FORM: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  professionalLevel: PROFESSIONAL_LEVELS[0],
  clinicianType: "general_practitioner",
};

export function OnboardPractitionerPage() {
  const { onboardPractitioner } = useApp();
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [onboardedEmail, setOnboardedEmail] = useState<string | null>(null);

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!values.firstName.trim() || !values.lastName.trim()) {
      setError("Enter the practitioner's first and last name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!values.phone.trim()) {
      setError("Enter a phone number.");
      return;
    }
    if (!values.address.trim()) {
      setError("Enter an address.");
      return;
    }

    const result = onboardPractitioner(values);
    if (!result.success) {
      setError(result.error ?? "Couldn't onboard this practitioner.");
      return;
    }
    setOnboardedEmail(result.professional!.email);
  }

  if (onboardedEmail) {
    return (
      <div className="animate-fade-in mx-auto flex max-w-md flex-col items-center py-10 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-500">
          <CheckCircle2 className="h-9 w-9" strokeWidth={1.75} />
        </div>
        <h1 className="text-lg font-semibold text-ink-900">Practitioner Onboarded</h1>
        <p className="mt-3 text-sm text-ink-600">
          Invitation sent to:
          <br />
          <span className="font-semibold text-ink-900">{onboardedEmail}</span>
        </p>
        <p className="mt-2 text-sm text-ink-500">
          Status: <span className="font-semibold text-warning-600">Invitation Sent</span>
        </p>
        <p className="mt-4 text-xs text-ink-400">
          This practitioner can now sign in at the Doctor Portal using this email address.{" "}
          <Link to="/dev/emails" className="font-semibold text-brand-600 hover:text-brand-700">
            View the simulated invitation email
          </Link>
          .
        </p>
        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setValues(EMPTY_FORM);
              setOnboardedEmail(null);
            }}
          >
            Onboard another
          </Button>
          <Button onClick={() => navigate("/hivecare/practitioners")}>View practitioners</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in mx-auto flex max-w-xl flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Onboard Practitioner</h1>
        <p className="text-sm text-ink-500">
          Add a new practitioner to the network. They'll be sent an invitation to sign in.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-card">
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="First name"
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
          <TextField
            label="Last name"
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
        <TextField
          label="Email"
          type="email"
          placeholder="doctor@example.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <TextField
          label="Phone number"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        <TextField
          label="Address"
          value={values.address}
          onChange={(e) => set("address", e.target.value)}
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">
            Medical level / professional level
          </label>
          <select
            value={values.professionalLevel}
            onChange={(e) => set("professionalLevel", e.target.value as ProfessionalLevel)}
            className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {PROFESSIONAL_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700">
            Medical field / practitioner type
          </label>
          <select
            value={values.clinicianType}
            onChange={(e) => set("clinicianType", e.target.value as ClinicianType)}
            className="w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            {CLINICIAN_TYPE_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-400">
            This determines which student AI-triage categories this practitioner can be matched to.
          </p>
        </div>

        <Button type="submit" size="lg" fullWidth className="mt-2">
          Onboard Practitioner
        </Button>
      </form>
    </div>
  );
}
