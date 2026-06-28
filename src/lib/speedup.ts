// Speedup laws — pure formulas for Amdahl / Gustafson and derived metrics.
//
// f      = serial (non-parallelizable) fraction, 0..1
// (1-f)  = parallel fraction
// p      = number of processors

/** Amdahl (fixed problem size, strong scaling): S = 1 / (f + (1-f)/p). */
export function amdahl(f: number, p: number): number {
  return 1 / (f + (1 - f) / p)
}

/** Amdahl ceiling as p → ∞: 1/f (Infinity when f = 0). */
export function amdahlLimit(f: number): number {
  return f > 0 ? 1 / f : Infinity
}

/** Gustafson (fixed time, weak scaling): S = p - f·(p-1) = f + (1-f)·p. */
export function gustafson(f: number, p: number): number {
  return p - f * (p - 1)
}

/** Efficiency = S / p, the useful-utilization fraction in [0, 1]. */
export function efficiency(s: number, p: number): number {
  return s / p
}

/** Cost = total work = p · T(p), with T(p) = 1/S(p) and T(1) = 1. */
export function cost(s: number, p: number): number {
  return p * (1 / s)
}

export interface Point {
  p: number
  s: number
}

/** Map a list of processor counts through fn into chart points. */
export function series(fn: (p: number) => number, pValues: number[]): Point[] {
  return pValues.map((p) => ({ p, s: fn(p) }))
}

/**
 * Sample processor counts from 1..pMax. Geometric spacing for a log axis,
 * linear otherwise. Returns real-valued p (formulas are continuous).
 */
export function sampleP(pMax: number, log: boolean, n = 96): number[] {
  if (pMax <= 1) return [1]
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    out.push(log ? Math.pow(pMax, t) : 1 + t * (pMax - 1))
  }
  return out
}
