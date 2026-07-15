export interface ReferralCheckoutSnapshot {
  attributionId: string;
  referralProfileId: string;
  subAdminId: string;
  referralCode: string;
  subAdminRateBasisPoints: number;
  superAdminRateBasisPoints: number;
}

export interface ReferralCurrencySummary {
  referredRevenueMinor: string;
  referredProfitMinor: string;
  commissionEarnedMinor: string;
  superAdminShareMinor: string;
  pendingCommissionMinor: string;
  availableBalanceMinor: string;
  totalPaidMinor: string;
}

export interface ReferralPartnerRollup {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  accountStatus: string;
  suspendedUntil: string | null;
  referralOperational: boolean;
  referralCode: string;
  referralEnabled: boolean;
  commissionRateBasisPoints: number;
  createdAt: string;
  totalClicks: number;
  uniqueVisitors: number;
  referredRegistrations: number;
  payingCustomers: number;
  successfulTransactions: number;
  lastReferralActivityAt: string | null;
  financials: Record<string, ReferralCurrencySummary>;
}

export interface ReferralActivityRow {
  id: string;
  createdAt: string;
  customerDisplayName: string;
  customerEmail: string;
  paymentReference: string;
  sourcePaymentType: string;
  productCode: string | null;
  currency: string;
  grossAmountMinor: string;
  netProfitMinor: string;
  subAdminAmountMinor: string;
  entryType: string;
  status: string;
  refundAmountMinor: string;
}

export interface ReferralPayoutRow {
  id: string;
  payoutDate: string;
  amountMinor: string;
  currency: string;
  paymentMethod: string;
  externalReference: string;
  status: string;
  notes: string | null;
}

export interface ReferralPackageAnalytics {
  productCode: string;
  currency: string;
  count: number;
  revenueMinor: string;
}

export interface ReferralPaymentStatusBreakdown {
  failed: number;
  completed: number;
  pending: number;
}
