import { AlertCircle, HeartPulse, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { TextField } from "../components/ui/TextField";
import { useApp } from "../context/AppContext";

export function LoginPage() {
  const { logIn, hasActiveSubscription } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    let hasError = false;
    if (!email.trim()) {
      setEmailError("Enter your email address.");
      hasError = true;
    } else {
      setEmailError(undefined);
    }
    if (!password) {
      setPasswordError("Enter your password.");
      hasError = true;
    } else {
      setPasswordError(undefined);
    }
    if (hasError) return;

    setSubmitting(true);
    window.setTimeout(() => {
      const result = logIn(email.trim(), password);
      setSubmitting(false);
      if (!result.success) {
        setFormError(result.error ?? "We couldn't log you in. Please try again.");
        return;
      }
      navigate(hasActiveSubscription ? "/profile" : "/payment");
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
          <h2 className="text-lg font-semibold text-ink-900">Welcome back</h2>
          <p className="mt-1 text-sm text-ink-500">Log in to continue to your account.</p>

          {formError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              placeholder="you@university.edu"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(undefined);
                if (formError) setFormError(null);
              }}
              error={emailError}
            />
            <TextField
              label="Password"
              type="password"
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(undefined);
                if (formError) setFormError(null);
              }}
              error={passwordError}
            />

            <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
              {submitting ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          Don't have an account?{" "}
          <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
            Sign up
          </Link>
        </p>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Demo product — use the email and password you signed up with.
        </p>
      </div>
    </div>
  );
}
