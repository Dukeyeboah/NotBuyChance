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

export function currencyName(currency: string): string {
  const code = currency.trim().toUpperCase() || "USD";
  if (code === "USD") return "US dollars";
  try {
    const raw = new Intl.DisplayNames("en", { type: "currency" }).of(code);
    if (!raw) return code;
    return `${raw} (${code})`;
  } catch {
    return code;
  }
}

function moneyWords(amount: number, currency: string): string {
  return `${formatMoney(amount, currency)} ${currencyName(currency)}`;
}

export function budgetLabel(options: {
  tier: string;
  currency: string;
  min?: string;
  max?: string;
}): string {
  const currency = options.currency || "USD";
  if (options.tier === "none") return `No specific budget · still thinking in ${currencyName(currency)}`;
  if (options.tier === "friendly") return `Budget-friendly · up to ${moneyWords(50, currency)}`;
  if (options.tier === "moderate") {
    return `Moderate · ${moneyWords(50, currency)}–${moneyWords(150, currency)}`;
  }
  if (options.tier === "premium") {
    return `Premium · ${moneyWords(150, currency)}–${moneyWords(500, currency)}`;
  }
  const min = options.min ? Number(options.min) : undefined;
  const max = options.max ? Number(options.max) : undefined;
  if (min != null && !Number.isNaN(min) && max != null && !Number.isNaN(max)) {
    return `${moneyWords(min, currency)}–${moneyWords(max, currency)}`;
  }
  if (max != null && !Number.isNaN(max)) return `Up to ${moneyWords(max, currency)}`;
  if (min != null && !Number.isNaN(min)) return `From ${moneyWords(min, currency)}`;
  return `Custom budget · ${currencyName(currency)}`;
}
