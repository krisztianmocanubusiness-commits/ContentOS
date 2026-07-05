/** Rounds a max value up to a clean axis tick (…1, 2, 5, 10, 20, 50…). */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const residual = value / magnitude;
  let niceResidual: number;
  if (residual > 5) niceResidual = 10;
  else if (residual > 2) niceResidual = 5;
  else if (residual > 1) niceResidual = 2;
  else niceResidual = 1;
  return niceResidual * magnitude;
}

/** Formats a reach value (already in thousands) as a compact label, e.g. 98 -> "98K", 1840 -> "1.8M". */
export function formatReachK(valueInThousands: number): string {
  if (valueInThousands >= 1000) {
    return `${(valueInThousands / 1000).toFixed(valueInThousands % 1000 === 0 ? 0 : 1)}M`;
  }
  if (valueInThousands >= 100) {
    return `${Math.round(valueInThousands)}K`;
  }
  return `${valueInThousands % 1 === 0 ? valueInThousands : valueInThousands.toFixed(1)}K`;
}

/** Formats a plain count, e.g. 7 -> "7", 1840 -> "1.8K". For real counts, not pre-scaled reach figures. */
export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}
