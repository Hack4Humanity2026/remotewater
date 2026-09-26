// decay.js — estimate free chlorine in a household tank without a sensor.
// First-order decay: C(t) = C0 * exp(-k t). k rises with temperature (Q10 rule of thumb).
// These constants are placeholders. The strip-test feature exists to calibrate them against
// real tanks in Inukjuak.

export function rateAt(tempC, { kPerDayAt20C = 0.15, q10 = 2.0 } = {}) {
  return kPerDayAt20C * Math.pow(q10, (tempC - 20) / 10);
}

/** Free chlorine (mg/L) `days` after delivery, starting from `c0` at the plant. */
export function chlorineAfter(c0, days, tempC = 18, cfg = {}) {
  return c0 * Math.exp(-rateAt(tempC, cfg) * days);
}

/** Days until free chlorine drops below `minMgL`. 0 if c0 is already at or below it. */
export function daysUntilBelow(c0, minMgL = 0.2, tempC = 18, cfg = {}) {
  if (c0 <= minMgL) return 0;
  return Math.log(c0 / minMgL) / rateAt(tempC, cfg);
}

/** Safe-until timestamp for a delivery. */
export function safeUntil(deliveredAtIso, c0, cfg = {}, thresholds = {}) {
  const days = daysUntilBelow(c0, thresholds.freeChlorineMinMgL ?? 0.2, cfg.tankTempC ?? 18, cfg);
  return new Date(new Date(deliveredAtIso).getTime() + days * 86400e3).toISOString();
}
