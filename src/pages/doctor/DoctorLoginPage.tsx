import { AlertCircle, KeyRound, Stethoscope } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useApp } from "../../context/AppContext";

/**
 * Doctor login is intentionally passwordless (PART 5): email -> a simulated
 * verification code is "emailed" (see AppContext requestDoctorCode, which
 * writes a DemoEmail into shared state) -> the doctor enters the code here.
 * The code itself is never shown on this screen — it's only visible via the
 * dev-only /dev/emails inbox, so the flow is demoable without a real
 * email provider while still not leaking the code directly on the login form.
 */
export function DoctorLoginPage() {
  const { requestDoctorCode, verifyDoctorCode, resendDoctorCode, cancelDoctorVerification, pendingDoctorVerification } =
    useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resent, setResent] = useState(false);

  function handleEmailSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      const result = requestDoctorCode(email);
      setSubmitting(false);
      if (!result.success) setError(result.error ?? "Something went wrong. Please try again.");
    }, 400);
  }

  function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!code.trim()) {
      setError("Enter the verification code.");
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      const result = verifyDoctorCode(code);
      setSubmitting(false);
      if (!result.success) {
        setError(result.error ?? "Incorrect code. Please try again.");
        return;
      }
      navigate("/doctor/dashboard");
    }, 400);
  }

  function handleResend() {
    resendDoctorCode();
    setResent(true);
    setError(null);
    window.setTimeout(() => setResent(false), 3000);
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-ink-950 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-500 text-white shadow-card">
            <Stethoscope className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-white">Doctor Portal</h1>
          <p className="mt-1.5 text-sm text-ink-300">MyCampusDoc practitioner sign-in</p>
        </div>

        <div className="animate-slide-up rounded-3xl bg-white p-6 shadow-card">
          {!pendingDoctorVerification ? (
            <>
              <h2 className="text-lg font-semibold text-ink-900">Sign in with email</h2>
              <p className="mt-1 text-sm text-ink-500">
                We'll send a one-time verification code — no password needed.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleEmailSubmit} noValidate>
                <TextField
                  label="Email"
                  type="email"
                  placeholder="you@hivecare.health"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                />
                <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
                  {submitting ? "Sending code..." : "Continue"}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-900">
                <KeyRound className="h-4.5 w-4.5 text-accent-500" />
                Enter verification code
              </h2>
              <p className="mt-1 text-sm text-ink-500">
                A code was sent to <span className="font-medium text-ink-700">{pendingDoctorVerification.email}</span>.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-xl bg-danger-50 px-3.5 py-3 text-sm text-danger-600"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {resent && (
                <div className="mt-4 rounded-xl bg-success-50 px-3.5 py-3 text-sm text-success-600">
                  A new code was sent.
                </div>
              )}

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleCodeSubmit} noValidate>
                <TextField
                  label="Verification code"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (error) setError(null);
                  }}
                />
                <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-2">
                  {submitting ? "Verifying..." : "Verify & Sign In"}
                </Button>
              </form>

              <div className="mt-4 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-semibold text-accent-600 hover:text-accent-700"
                >
                  Resend code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelDoctorVerification();
                    setCode("");
                    setError(null);
                  }}
                  className="text-ink-400 hover:text-ink-600"
                >
                  Use a different email
                </button>
              </div>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-xs text-ink-500">
          Demo only — view simulated emails (including verification codes) in the{" "}
          <Link to="/dev/emails" className="font-semibold text-accent-400 hover:text-accent-300">
            development email inbox
          </Link>
          .
        </p>
        <p className="mt-3 text-center text-xs text-ink-500">
          <Link to="/login" className="hover:text-ink-300">
            Back to student login
          </Link>
        </p>
      </div>
    </div>
  );
}
