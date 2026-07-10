export const DEFAULT_BILLING_VAT_RATE = 0.23;

export function calculateIncludedVat(totalCents: number, vatRate = DEFAULT_BILLING_VAT_RATE) {
  if (vatRate <= 0) {
    return {
      amountCents: totalCents,
      vatCents: 0,
      totalCents,
    };
  }

  const amountCents = Math.round(totalCents / (1 + vatRate));

  return {
    amountCents,
    vatCents: totalCents - amountCents,
    totalCents,
  };
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);

  return next;
}
