import type { PaymentPlan } from "../types";

export const paymentPlans: PaymentPlan[] = [
  {
    id: "quarterly",
    name: "Quarterly",
    billingFrequency: "Billed every 3 months",
    price: 29,
    priceSuffix: "/quarter",
    features: [
      "Unlimited chat with health professionals",
      "Audio & video consultations",
      "Personal medical notes & history",
      "Cancel anytime",
    ],
  },
  {
    id: "biannual",
    name: "Every 6 Months",
    billingFrequency: "Billed every 6 months",
    price: 49,
    priceSuffix: "/6 months",
    recommended: true,
    features: [
      "Everything in Quarterly",
      "Priority scheduling with professionals",
      "Save 15% vs. quarterly billing",
      "Cancel anytime",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    billingFrequency: "Billed once a year",
    price: 89,
    priceSuffix: "/year",
    features: [
      "Everything in Every 6 Months",
      "Best value — save 23% vs. quarterly billing",
      "Locked-in rate for the full academic year",
      "Cancel anytime",
    ],
  },
];
