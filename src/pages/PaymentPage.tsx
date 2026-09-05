import { AlertTriangle, ChevronLeft, Lock, PartyPopper } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { PaymentPlanCard } from "../components/payment/PaymentPlanCard";
import { Button } from "../components/ui/Button";
import { ConfirmationModal } from "../components/ui/ConfirmationModal";
import { LoadingState } from "../components/ui/LoadingState";
import { TextField } from "../components/ui/TextField";
import { useApp } from "../context/AppContext";
import { paymentPlans } from "../data";
import { formatCurrency } from "../lib/format";
import type { PlanId } from "../types";

type Step = "plan" | "checkout" | "processing" | "failed" | "success";

const DECLINE_TEST_NUMBER = "4000000000000002";

export function PaymentPage() {
  const { subscribe, user } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    paymentPlans.find((p) => p.recommended)?.id ?? paymentPlans[0].id,
  );

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const plan = paymentPlans.find((p) => p.id === selectedPlan)!;

  function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const digits = cardNumber.replace(/\s/g, "");

    if (!cardName.trim()) errors.cardName = "Enter the name on your card.";
    if (!/^\d{15,16}$/.test(digits)) errors.cardNumber = "Enter a valid card number.";
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(expiry)) errors.expiry = "Use MM/YY format.";
    if (!/^\d{3,4}$/.test(cvc)) errors.cvc = "Enter a valid security code.";

    setCardErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setStep("processing");
    window.setTimeout(() => {
      if (digits === DECLINE_TEST_NUMBER) {
        setStep("failed");
      } else {
        subscribe(selectedPlan);
        setStep("success");
      }
    }, 1600);
  }

  function formatCardNumber(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExpiry(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  if (step === "processing") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-white px-6">
        <LoadingState fullScreen label={`Processing your ${formatCurrency(plan.price)} payment...`} />
        <p className="max-w-xs text-center text-xs text-ink-400">
          This is a simulated payment for demo purposes. No real charge will occur.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        {step === "plan" && (
          <div className="animate-fade-in">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-ink-900">Choose your plan</h1>
              <p className="mt-1.5 text-sm text-ink-500">
                {user ? `${user.fullName.split(" ")[0]}, choose` : "Choose"} how you'd like to pay
                for unlimited access to MyCampusCare.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {paymentPlans.map((p) => (
                <PaymentPlanCard
                  key={p.id}
                  plan={p}
                  selected={p.id === selectedPlan}
                  onSelect={() => setSelectedPlan(p.id)}
                />
              ))}
            </div>

            <Button
              size="lg"
              fullWidth
              className="mt-6"
              onClick={() => setStep("checkout")}
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {step === "checkout" && (
          <div className="animate-slide-up">
            <button
              type="button"
              onClick={() => setStep("plan")}
              className="mb-4 flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-ink-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Change plan
            </button>

            <div className="rounded-3xl bg-white p-6 shadow-card">
              <div className="mb-5 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{plan.name} plan</p>
                  <p className="text-xs text-ink-500">{plan.billingFrequency}</p>
                </div>
                <p className="text-lg font-bold text-brand-700">
                  {formatCurrency(plan.price)}
                  <span className="text-xs font-medium text-ink-400">{plan.priceSuffix}</span>
                </p>
              </div>

              <h2 className="mb-4 flex items-center gap-1.5 text-base font-semibold text-ink-900">
                <Lock className="h-4 w-4 text-ink-400" />
                Payment details
              </h2>

              <form className="flex flex-col gap-4" onSubmit={handleCheckoutSubmit} noValidate>
                <TextField
                  label="Name on card"
                  placeholder="Jordan Adeyemi"
                  autoComplete="cc-name"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  error={cardErrors.cardName}
                />
                <TextField
                  label="Card number"
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  error={cardErrors.cardNumber}
                  hint="Demo tip: use 4000 0000 0000 0002 to preview a declined payment."
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Expiry"
                    placeholder="MM/YY"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    error={cardErrors.expiry}
                  />
                  <TextField
                    label="Security code"
                    placeholder="CVC"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    error={cardErrors.cvc}
                  />
                </div>

                <Button type="submit" size="lg" fullWidth className="mt-1">
                  Pay {formatCurrency(plan.price)}
                </Button>
              </form>
            </div>
          </div>
        )}

        {step === "failed" && (
          <div className="animate-scale-in rounded-3xl bg-white p-6 text-center shadow-card">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-50 text-danger-500">
              <AlertTriangle className="h-9 w-9" strokeWidth={1.75} />
            </div>
            <h2 className="text-lg font-semibold text-ink-900">Payment failed</h2>
            <p className="mt-1.5 text-sm text-ink-500">
              Your card was declined. Please try a different card or check your details.
            </p>
            <Button size="lg" fullWidth className="mt-6" onClick={() => setStep("checkout")}>
              Try again
            </Button>
          </div>
        )}
      </div>

      <ConfirmationModal
        open={step === "success"}
        onClose={() => navigate("/profile")}
        icon={PartyPopper}
        title="You're subscribed!"
        description={`Your ${plan.name} plan is now active. You're all set to connect with a health professional.`}
      >
        <Button size="lg" fullWidth onClick={() => navigate("/profile")}>
          Go to my profile
        </Button>
      </ConfirmationModal>
    </div>
  );
}
