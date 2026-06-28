import { describe, it, expect } from 'vitest'
import { amdahl, gustafson, efficiency, amdahlLimit, series, sampleP, cost } from './speedup'

describe('amdahl', () => {
  it('S(p=1) = 1 — no speedup on one processor', () => {
    for (const f of [0, 0.05, 0.3, 1]) expect(amdahl(f, 1)).toBeCloseTo(1)
  })
  it('f = 0 → perfect linear speedup S = p', () => {
    for (const p of [1, 2, 8, 64]) expect(amdahl(0, p)).toBeCloseTo(p)
  })
  it('f = 1 → S = 1 for any p (all serial)', () => {
    for (const p of [1, 2, 16, 1000]) expect(amdahl(1, p)).toBeCloseTo(1)
  })
  it('approaches the ceiling 1/f as p grows', () => {
    for (const f of [0.05, 0.1, 0.25]) {
      const big = amdahl(f, 1e7)
      expect(big).toBeCloseTo(1 / f, 1)
      expect(big).toBeLessThan(1 / f) // always below the ceiling
    }
  })
  it('is monotonically increasing in p', () => {
    const f = 0.1
    let prev = 0
    for (const p of [1, 2, 4, 8, 16, 32]) {
      const s = amdahl(f, p)
      expect(s).toBeGreaterThan(prev)
      prev = s
    }
  })
})

describe('amdahlLimit', () => {
  it('= 1/f, Infinity at f = 0', () => {
    expect(amdahlLimit(0.05)).toBeCloseTo(20)
    expect(amdahlLimit(0)).toBe(Infinity)
  })
})

describe('gustafson', () => {
  it('S(p=1) = 1', () => {
    for (const f of [0, 0.1, 0.5, 1]) expect(gustafson(f, 1)).toBeCloseTo(1)
  })
  it('f = 0 → S = p (linear)', () => {
    for (const p of [1, 4, 32]) expect(gustafson(0, p)).toBeCloseTo(p)
  })
  it('grows almost linearly (slope 1-f)', () => {
    const f = 0.1
    expect(gustafson(f, 100) - gustafson(f, 99)).toBeCloseTo(1 - f)
  })
  it('exceeds Amdahl for the same f, p > 1', () => {
    const f = 0.2
    for (const p of [2, 8, 64]) expect(gustafson(f, p)).toBeGreaterThan(amdahl(f, p))
  })
})

describe('efficiency', () => {
  it('lies in [0,1] and decreases with p for Amdahl when f > 0', () => {
    const f = 0.1
    let prev = Infinity
    for (const p of [1, 2, 4, 8, 16, 64, 256]) {
      const e = efficiency(amdahl(f, p), p)
      expect(e).toBeGreaterThanOrEqual(0)
      expect(e).toBeLessThanOrEqual(1)
      expect(e).toBeLessThan(prev)
      prev = e
    }
  })
  it('is 1 for f = 0 (perfect scaling)', () => {
    for (const p of [1, 8, 100]) expect(efficiency(amdahl(0, p), p)).toBeCloseTo(1)
  })
})

describe('cost', () => {
  it('= 1 at p=1 and grows when efficiency drops', () => {
    expect(cost(amdahl(0.1, 1), 1)).toBeCloseTo(1)
    expect(cost(amdahl(0.1, 64), 64)).toBeGreaterThan(1)
  })
})

describe('series + sampleP', () => {
  it('series maps p values through the function', () => {
    const pts = series((p) => amdahl(0, p), [1, 2, 4])
    expect(pts).toEqual([
      { p: 1, s: 1 },
      { p: 2, s: 2 },
      { p: 4, s: 4 },
    ])
  })
  it('sampleP spans 1..pMax', () => {
    const lin = sampleP(64, false, 10)
    expect(lin[0]).toBeCloseTo(1)
    expect(lin[lin.length - 1]).toBeCloseTo(64)
    const log = sampleP(1024, true, 11)
    expect(log[0]).toBeCloseTo(1)
    expect(log[log.length - 1]).toBeCloseTo(1024)
  })
})
