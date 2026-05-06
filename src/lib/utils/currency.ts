export function formatCurrency(
  amount: number,
  options: { compact?: boolean; showSign?: boolean } = {},
): string {
  const { compact = false, showSign = false } = options;

  if (compact && Math.abs(amount) >= 1_000_000) {
    const val = amount / 1_000_000;
    return `${showSign && amount > 0 ? "+" : ""}${amount < 0 ? "-" : ""}$${Math.abs(val).toFixed(2)}M`;
  }

  if (compact && Math.abs(amount) >= 1_000) {
    const val = amount / 1_000;
    return `${showSign && amount > 0 ? "+" : ""}${amount < 0 ? "-" : ""}$${Math.abs(val).toFixed(1)}K`;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return `${showSign && amount > 0 ? "+" : ""}${amount < 0 ? "-" : ""}${formatted.replace("-", "")}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatRate(hourlyRate: number): string {
  return `$${hourlyRate.toFixed(2)}/hr`;
}
