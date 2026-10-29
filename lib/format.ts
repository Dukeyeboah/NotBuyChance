export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function budgetLabel(options: {
  tier: string;
  currency: string;
  min?: string;
  max?: string;
}): string {
  if (options.tier === "none") return "No specific budget";
  if (options.tier === "friendly") return `Budget-friendly · up to ${formatMoney(50, options.currency)}`;
  if (options.tier === "moderate") {
    return `Moderate · ${formatMoney(50, options.currency)}–${formatMoney(150, options.currency)}`;
  }
  if (options.tier === "premium") {
    return `Premium · ${formatMoney(150, options.currency)}–${formatMoney(500, options.currency)}`;
  }
  const min = options.min ? Number(options.min) : undefined;
  const max = options.max ? Number(options.max) : undefined;
  if (min != null && !Number.isNaN(min) && max != null && !Number.isNaN(max)) {
    return `${formatMoney(min, options.currency)}–${formatMoney(max, options.currency)}`;
  }
  if (max != null && !Number.isNaN(max)) return `Up to ${formatMoney(max, options.currency)}`;
  if (min != null && !Number.isNaN(min)) return `From ${formatMoney(min, options.currency)}`;
  return "Custom budget";
}
