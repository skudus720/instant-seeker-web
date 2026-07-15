export interface SignupCheckout {
  authorizationUrl: string;
  reference: string;
}

export type SubscriptionCheckout = SignupCheckout;

export interface VerifiedSignupPayment {
  userId: string;
  reference: string;
  amountMinor: number;
  currency: string;
  paidAt: string;
  providerTransactionId?: string;
}

export interface VerifiedSubscriptionPayment extends VerifiedSignupPayment {
  planCode: "gold" | "platinum" | "diamond";
}

export interface PaymentActionResult {
  ok: boolean;
  message: string;
  checkoutUrl?: string;
  redirectTo?: string;
}

export interface VerifiedPaymentReversal {
  paymentReference: string;
  amountMinor: number;
  currency: string;
  providerRecordId?: string;
}
