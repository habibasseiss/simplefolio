export interface CashFlow {
  amount: number;
  date: Date;
}

/**
 * Calculates the internal rate of return for a schedule of cash flows that is not necessarily periodic.
 * 
 * @param cashFlows Array of cash flows
 * @param guess Initial guess for the rate of return (default 10%)
 * @returns The calculated XIRR as a decimal (e.g. 0.08 for 8%), or null if it cannot be calculated or does not converge
 */
export function xirr(cashFlows: CashFlow[], guess = 0.1): number | null {
  if (!cashFlows || cashFlows.length < 2) return null;

  const sorted = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
  
  const hasPositive = sorted.some((cf) => cf.amount > 0);
  const hasNegative = sorted.some((cf) => cf.amount < 0);
  
  if (!hasPositive || !hasNegative) return null;

  const t0 = sorted[0].date.getTime();

  // Consolidate cashflows on the exact same date to minimize zero-day NPV anomalies
  const dailyCFs: { amount: number; t: number }[] = [];
  for (const cf of sorted) {
    const t = (cf.date.getTime() - t0) / (1000 * 60 * 60 * 24 * 365.25);
    const last = dailyCFs[dailyCFs.length - 1];
    if (last && Math.abs(last.t - t) < 1e-5) {
      last.amount += cf.amount;
    } else {
      dailyCFs.push({ amount: cf.amount, t });
    }
  }

  let rate = guess;
  const maxIterations = 200;
  const tolerance = 1e-7;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dNpv = 0;

    for (const cf of dailyCFs) {
      // Ensure we don't drop below -1 (total loss)
      const r = Math.max(rate, -0.999999);
      const factor = Math.pow(1 + r, cf.t);
      
      npv += cf.amount / factor;
      dNpv -= (cf.t * cf.amount) / (factor * (1 + r));
    }

    // Stop if NPV is sufficiently close to 0
    if (Math.abs(npv) < 1e-4) {
      return rate;
    }

    if (dNpv === 0) {
      return null;
    }
    
    const newRate = rate - npv / dNpv;

    // Check convergence
    if (Math.abs(newRate - rate) < tolerance) {
      return newRate;
    }

    rate = newRate;

    // Avoid domain errors for (1 + rate)
    if (rate <= -1) {
      rate = -0.999999;
    }
  }

  // Failed to converge within maxIterations
  return null;
}
