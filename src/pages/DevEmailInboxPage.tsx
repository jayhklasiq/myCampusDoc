import { AlertTriangle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { useApp } from "../context/AppContext";
import { formatRelativeTimestamp } from "../lib/format";

/**
 * Development-only simulated email inbox (PART 19). No real email is ever
 * sent by this demo — every "invitation" and "verification code" is a
 * DemoEmail record in shared state, and this page is the one place a demo
 * operator can inspect them (including verification codes, which are
 * deliberately NOT shown on the Doctor Portal login screen itself).
 */
export function DevEmailInboxPage() {
  const { demoEmails } = useApp();
  const sorted = [...demoEmails].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="mx-auto min-h-dvh max-w-2xl bg-ink-50 px-4 py-6">
      <div className="mb-4 flex items-start gap-2 rounded-2xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Development only</p>
          <p>
            This inbox simulates outbound email for the demo. No real email is sent — nothing here
            would exist in a production build.
          </p>
        </div>
      </div>

      <h1 className="mb-1 text-xl font-bold text-ink-900">Simulated Email Inbox</h1>
      <p className="mb-5 text-sm text-ink-500">
        Onboarding invitations and Doctor Portal verification codes appear here as they're
        generated.
      </p>

      {sorted.length === 0 ? (
        <EmptyState icon={Mail} title="No simulated emails yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((email) => (
            <div key={email.id} className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink-900">{email.subject}</p>
                  <p className="truncate text-xs text-ink-500">To: {email.recipient}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge tone={email.type === "verification" ? "accent" : "brand"}>
                    {email.type === "verification" ? "Verification" : "Onboarding"}
                  </Badge>
                  <span className="text-[11px] text-ink-400">
                    {formatRelativeTimestamp(email.createdAt)}
                  </span>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-xl bg-ink-50 p-3 text-xs leading-relaxed text-ink-700">
                {email.body}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-ink-400">
        <Link to="/doctor/login" className="hover:text-ink-600">
          Doctor Portal
        </Link>
        {" · "}
        <Link to="/hivecare/login" className="hover:text-ink-600">
          HiveCare Admin
        </Link>
        {" · "}
        <Link to="/login" className="hover:text-ink-600">
          Student Login
        </Link>
      </p>
    </div>
  );
}
