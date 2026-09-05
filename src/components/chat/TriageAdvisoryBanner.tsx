import { AlertTriangle, Siren } from "lucide-react";
import { Button } from "../ui/Button";

interface TriageAdvisoryBannerProps {
  level: "urgent" | "emergency";
  /** Only offered for "urgent" — emergency never continues into scheduling from here. */
  onFindClinician?: () => void;
}

const COPY = {
  urgent: {
    icon: AlertTriangle,
    title: "Seek prompt medical attention",
    body: "Based on what you've described, this may need attention sooner than a routine consultation — consider an urgent care clinic or contacting a doctor today. This is AI-guided triage, not a diagnosis.",
    container: "border-warning-200 bg-warning-50 text-warning-700",
    iconWrap: "bg-warning-500/15 text-warning-600",
  },
  emergency: {
    icon: Siren,
    title: "This may be a medical emergency",
    body: "Please seek immediate emergency care — call your local emergency number or go to the nearest emergency room now rather than waiting for a MyCampusDoc consultation.",
    container: "border-danger-200 bg-danger-50 text-danger-700",
    iconWrap: "bg-danger-500/15 text-danger-600",
  },
} as const;

export function TriageAdvisoryBanner({ level, onFindClinician }: TriageAdvisoryBannerProps) {
  const copy = COPY[level];
  const Icon = copy.icon;

  return (
    <div className={`animate-slide-up flex flex-col gap-3 rounded-2xl border p-4 ${copy.container}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${copy.iconWrap}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">{copy.title}</p>
          <p className="mt-1 text-sm leading-relaxed">{copy.body}</p>
        </div>
      </div>
      {level === "urgent" && onFindClinician && (
        <Button type="button" size="sm" variant="secondary" className="self-start" onClick={onFindClinician}>
          Still want a MyCampusDoc consultation? Find a clinician
        </Button>
      )}
    </div>
  );
}
