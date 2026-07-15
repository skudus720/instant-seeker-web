const ZERO = BigInt(0);
const MINOR_SCALE = BigInt(100);
export const BASIS_POINTS_TOTAL = BigInt(10_000);
export const DEFAULT_SUB_ADMIN_RATE_BPS = BigInt(7_000);

export function splitProfitMinor(
  netProfitMinor: bigint,
  subAdminRateBasisPoints = DEFAULT_SUB_ADMIN_RATE_BPS,
) {
  if (
    netProfitMinor <= ZERO ||
    subAdminRateBasisPoints < ZERO ||
    subAdminRateBasisPoints > BASIS_POINTS_TOTAL
  ) {
    return { subAdminAmountMinor: ZERO, superAdminAmountMinor: ZERO };
  }

  const subAdminAmountMinor =
    (netProfitMinor * subAdminRateBasisPoints) / BASIS_POINTS_TOTAL;
  return {
    subAdminAmountMinor,
    superAdminAmountMinor: netProfitMinor - subAdminAmountMinor,
  };
}

export function proportionalReversalMinor({
  originalGrossMinor,
  remainingGrossMinor,
  remainingProfitMinor,
  remainingSubAdminMinor,
  refundMinor,
  subAdminRateBasisPoints = DEFAULT_SUB_ADMIN_RATE_BPS,
}: {
  originalGrossMinor: bigint;
  remainingGrossMinor: bigint;
  remainingProfitMinor: bigint;
  remainingSubAdminMinor: bigint;
  refundMinor: bigint;
  subAdminRateBasisPoints?: bigint;
}) {
  if (
    originalGrossMinor <= ZERO ||
    remainingGrossMinor <= ZERO ||
    refundMinor <= ZERO
  ) {
    return {
      refundAppliedMinor: ZERO,
      profitReversalMinor: ZERO,
      subAdminReversalMinor: ZERO,
      superAdminReversalMinor: ZERO,
    };
  }

  const refundAppliedMinor =
    refundMinor > remainingGrossMinor ? remainingGrossMinor : refundMinor;
  const isFinal = refundAppliedMinor === remainingGrossMinor;
  const profitReversalMinor = isFinal
    ? remainingProfitMinor
    : (remainingProfitMinor * refundAppliedMinor) / remainingGrossMinor;
  const rateBasedSubAdmin =
    (profitReversalMinor * subAdminRateBasisPoints) / BASIS_POINTS_TOTAL;
  const subAdminReversalMinor = isFinal
    ? remainingSubAdminMinor
    : rateBasedSubAdmin > remainingSubAdminMinor
      ? remainingSubAdminMinor
      : rateBasedSubAdmin;

  return {
    refundAppliedMinor,
    profitReversalMinor,
    subAdminReversalMinor,
    superAdminReversalMinor: profitReversalMinor - subAdminReversalMinor,
  };
}

export function decimalToMinorString(
  value: string,
  { allowNegative = false }: { allowNegative?: boolean } = {},
) {
  const normalized = value.trim();
  const pattern = allowNegative
    ? /^-?(?:0|[1-9]\d*)(?:\.\d{1,2})?$/
    : /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
  if (!pattern.test(normalized)) return null;

  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [major, fraction = ""] = unsigned.split(".");
  const minor = BigInt(major) * MINOR_SCALE + BigInt(fraction.padEnd(2, "0"));
  return (negative ? -minor : minor).toString();
}

export function formatMinorCurrency(
  value: string | number | bigint,
  currency: string,
  locale = "en-GH",
) {
  let minor: bigint;
  try {
    minor = BigInt(value);
  } catch {
    minor = ZERO;
  }
  const negative = minor < ZERO;
  const absolute = negative ? -minor : minor;
  const major = absolute / MINOR_SCALE;
  const fraction = String(absolute % MINOR_SCALE).padStart(2, "0");
  const grouped = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(major);
  return `${currency} ${negative ? "-" : ""}${grouped}.${fraction}`;
}

export function availableBalanceMinor({
  availableLedgerMinor,
  paidAllocationsMinor,
}: {
  availableLedgerMinor: bigint;
  paidAllocationsMinor: bigint;
}) {
  return availableLedgerMinor - paidAllocationsMinor;
}
