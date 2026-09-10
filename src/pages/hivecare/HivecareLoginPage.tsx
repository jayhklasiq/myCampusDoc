import { Building2, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { TextField } from "../../components/ui/TextField";
import { useApp } from "../../context/AppContext";

/**
 * HiveCare admin sign-in is a deliberately minimal demo gate — no password,
 * matching the spec's "full production authentication is not required" for
 * this prototype. It exists to keep /hivecare/* behind a real route guard
 * (see routes/guards.tsx RequireHivecareAuth) rather than leaving it open.
 */
export function HivecareLoginPage() {
  const { hivecareLogIn } = useApp();
  const navigate = useNavigate();
  const [adminName, setAdminName] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    hivecareLogIn(adminName.trim() || "HiveCare Admin");
    navigate("/hivecare/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-ink-50 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-card">
            <Building2 className="h-7 w-7" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-ink-900">HiveCare Admin</h1>
          <p className="mt-1.5 text-sm text-ink-500">Practitioner onboarding &amp; oversight</p>
        </div>

        <div className="animate-slide-up rounded-3xl bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink-900">Sign in</h2>
          <p className="mt-1 text-sm text-ink-500">
            Demo admin access — no password required for this prototype.
          </p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <TextField
              label="Admin name"
              placeholder="e.g. Jordan Lee"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
            />
            <Button type="submit" size="lg" fullWidth className="mt-2">
              Continue as HiveCare Admin
            </Button>
          </form>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          Demo product — no real credentials are checked.
        </p>
        <p className="mt-3 text-center text-xs text-ink-500">
          <Link to="/login" className="hover:text-ink-700">
            Back to student login
          </Link>
        </p>
      </div>
    </div>
  );
}
