import { HeartPulse, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { useApp } from "../context/AppContext";
import { validateSignUp, type SignUpErrors, type SignUpValues } from "../lib/validation";

const EMPTY_VALUES: SignUpValues = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

export function SignUpPage() {
  const { signUp } = useApp();
  const navigate = useNavigate();
  const [values, setValues] = useState<SignUpValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof SignUpValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors = validateSignUp(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    window.setTimeout(() => {
      signUp({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
      });
      navigate("/payment");
    }, 500);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-ink-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card">
            <HeartPulse className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-ink-900">MyCampusCare</h1>
          <p className="mt-1.5 text-sm text-ink-500">
            Talk to health professionals, anytime, from campus.
          </p>
        </div>

        <div className="animate-slide-up rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink-900">Create your student account</h2>
          <p className="mt-1 text-sm text-ink-500">
            Sign up to get started with a consultation plan.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Full name"
              placeholder="Jordan Adeyemi"
              autoComplete="name"
              value={values.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              error={errors.fullName}
            />
            <TextField
              label="Email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              error={errors.email}
            />
            <TextField
              label="Phone number"
              type="tel"
              placeholder="(555) 123-4567"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => update("phone", e.target.value)}
              error={errors.phone}
            />
            <TextField
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => update("password", e.target.value)}
              error={errors.password}
            />
            <TextField
              label="Confirm password"
              type="password"
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
            />

            <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
              {submitting ? "Creating account..." : "Continue to Payment"}
            </Button>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Demo product — please don't enter real personal information.
        </p>
      </div>
    </div>
  );
}
