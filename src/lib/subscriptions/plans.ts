import { z } from "zod";

export const planCodeSchema = z.enum(["gold", "platinum", "diamond"]);

export type PlanCode = z.infer<typeof planCodeSchema>;

export interface SubscriptionPlan {
  code: PlanCode;
  name: string;
  amount: number;
  amountMinor: number;
  currency: "GHS";
  durationHours: number;
  description: string;
  features: readonly string[];
  popular?: boolean;
}

export const subscriptionPlans = [
  {
    code: "gold",
    name: "Gold",
    amount: 350,
    amountMinor: 35_000,
    currency: "GHS",
    durationHours: 24,
    description: "Focused access for a short analysis window.",
    features: [
      "24 hours of AI analysis access",
      "Standard analysis processing",
      "Private analysis history",
      "Email support",
    ],
  },
  {
    code: "platinum",
    name: "Platinum",
    amount: 850,
    amountMinor: 85_000,
    currency: "GHS",
    durationHours: 48,
    description: "More time for a steady screenshot-review workflow.",
    features: [
      "48 hours of AI analysis access",
      "Priority analysis processing",
      "Private analysis history",
      "Priority email support",
    ],
    popular: true,
  },
  {
    code: "diamond",
    name: "Diamond",
    amount: 1_500,
    amountMinor: 150_000,
    currency: "GHS",
    durationHours: 72,
    description: "The longest access window for extended analysis sessions.",
    features: [
      "72 hours of AI analysis access",
      "Priority analysis processing",
      "Private analysis history",
      "Priority email support",
    ],
  },
] as const satisfies readonly SubscriptionPlan[];

export function getSubscriptionPlan(code: string): SubscriptionPlan | null {
  return subscriptionPlans.find((plan) => plan.code === code) || null;
}
