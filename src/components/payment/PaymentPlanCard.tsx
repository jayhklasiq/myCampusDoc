import { Check } from "lucide-react";
import clsx from "clsx";
import { Badge } from "../ui/Badge";
import { formatCurrency } from "../../lib/format";
import type { PaymentPlan } from "../../types";

interface PaymentPlanCardProps {
  plan: PaymentPlan;
  selected: boolean;
  onSelect: () => void;
}

export function PaymentPlanCard({ plan, selected, onSelect }: PaymentPlanCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={clsx(
        "relative w-full rounded-2xl border-2 p-4 text-left transition-all",
        selected
          ? "border-brand-500 bg-brand-50/60 shadow-card"
          : "border-ink-200 bg-white hover:border-brand-300",
      )}
    >
      {plan.recommended && (
        <Badge tone="accent" className="absolute -top-3 left-4">
          Recommended
        </Badge>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">{plan.name}</p>
          <p className="text-xs text-ink-500">{plan.billingFrequency}</p>
        </div>
        <div
          className={clsx(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300",
          )}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </div>
      </div>

      <p className="mt-3">
        <span className="text-2xl font-bold text-ink-900">{formatCurrency(plan.price)}</span>
        <span className="text-sm text-ink-500">{plan.priceSuffix}</span>
      </p>

      <ul className="mt-3 flex flex-col gap-1.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-ink-600">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
            {feature}
          </li>
        ))}
      </ul>
    </button>
  );
}
