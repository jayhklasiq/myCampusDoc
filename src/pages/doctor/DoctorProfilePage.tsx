import { Lock, Mail, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useApp } from "../../context/AppContext";
import { findProfessionalById } from "../../data";

export function DoctorProfilePage() {
  const { doctorSession, professionals, updatePractitionerContact } = useApp();
  const practitionerId = doctorSession!.practitionerId;
  const practitioner = findProfessionalById(professionals, practitionerId);

  const [phone, setPhone] = useState(practitioner?.phone ?? "");
  const [address, setAddress] = useState(practitioner?.address ?? "");
  const [saved, setSaved] = useState(false);

  if (!practitioner) return null;

  function handleSave() {
    updatePractitionerContact(practitionerId, phone.trim(), address.trim());
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="animate-fade-in flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Profile</h1>
        <p className="text-sm text-ink-500">Your practitioner profile.</p>
      </div>

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-800">
          <User className="h-4 w-4 text-accent-500" />
          {practitioner.name}
        </h2>
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-ink-500">
              <Mail className="h-3.5 w-3.5" /> Email
            </dt>
            <dd className="truncate font-medium text-ink-800">{practitioner.email}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-800">
          <ShieldCheck className="h-4 w-4 text-ink-400" />
          Managed by HiveCare
        </h2>
        <p className="mb-3 text-xs text-ink-400">
          These fields were set during onboarding and can only be changed by HiveCare.
        </p>
        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-500">Professional level</dt>
            <dd className="font-medium text-ink-800">{practitioner.professionalLevel}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-500">Specialty</dt>
            <dd className="font-medium text-ink-800">{practitioner.specialty}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-ink-500">Onboarding status</dt>
            <dd className="font-medium text-ink-800 capitalize">{practitioner.status.replace("_", " ")}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-800">
          <Lock className="h-4 w-4 text-accent-500" />
          Editable by you
        </h2>
        <p className="mb-3 text-xs text-ink-400">Keep your contact information up to date.</p>
        <div className="flex flex-col gap-3">
          <TextField label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          {saved ? (
            <div className="rounded-xl bg-success-50 px-3.5 py-2.5 text-center text-sm font-medium text-success-600">
              Saved
            </div>
          ) : (
            <Button onClick={handleSave}>Save changes</Button>
          )}
        </div>
      </section>
    </div>
  );
}
