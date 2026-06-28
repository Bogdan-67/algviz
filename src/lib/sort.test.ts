import { describe, it, expect } from 'vitest'
import {
  isSorted,
  isPowerOfTwo,
  compareExchange,
  makeData,
  buildOddEvenSnapshots,
  buildBitonicSnapshots,
  networkSignature,
  sortMetrics,
  type Preset,
} from './sort'

const sortedAsc = (a: number[]) => a.slice().sort((x, y) => x - y)

describe('helpers', () => {
  it('isSorted detects ascending order', () => {
    expect(isSorted([1, 2, 2, 3])).toBe(true)
    expect(isSorted([1, 3, 2])).toBe(false)
  })
  it('isPowerOfTwo', () => {
    expect([1, 2, 4, 8, 16, 32].every(isPowerOfTwo)).toBe(true)
    expect([3, 6, 12, 0].some(isPowerOfTwo)).toBe(false)
  })
  it('compareExchange keeps smaller at the lower index (ascending)', () => {
    expect(compareExchange([5, 2], 0, 1, true)).toEqual([2, 5])
    expect(compareExchange([2, 5], 0, 1, true)).toEqual([2, 5])
    expect(compareExchange([2, 5], 0, 1, false)).toEqual([5, 2])
  })
  it('compareExchange does not mutate input', () => {
    const a = [3, 1]
    compareExchange(a, 0, 1)
    expect(a).toEqual([3, 1])
  })
})

const presets: Preset[] = ['random', 'sorted', 'reversed', 'nearly']

describe('odd-even transposition sort', () => {
  for (const n of [2, 3, 5, 8, 13, 20]) {
    it(`sorts random arrays of size ${n}`, () => {
      for (let t = 0; t < 12; t++) {
        const input = makeData('random', n)
        const snaps = buildOddEvenSnapshots(input)
        const last = snaps[snaps.length - 1]
        expect(last.sorted).toBe(true)
        expect(last.array).toEqual(sortedAsc(input))
      }
    })
  }

  for (const preset of presets) {
    it(`sorts the "${preset}" preset (n=16)`, () => {
      const input = makeData(preset, 16)
      const last = buildOddEvenSnapshots(input).slice(-1)[0]
      expect(last.array).toEqual(sortedAsc(input))
    })
  }

  it('uses at most n phases', () => {
    const n = 20
    const snaps = buildOddEvenSnapshots(makeData('reversed', n))
    expect(snaps.length - 1).toBeLessThanOrEqual(n)
  })

  it('pairs in a phase are disjoint (parallelizable)', () => {
    const snaps = buildOddEvenSnapshots(makeData('random', 12))
    for (const s of snaps.slice(1)) {
      const used = new Set<number>()
      for (const p of s.pairs) {
        expect(used.has(p.i)).toBe(false)
        expect(used.has(p.j)).toBe(false)
        used.add(p.i)
        used.add(p.j)
      }
    }
  })
})

describe('bitonic sort', () => {
  for (const n of [2, 4, 8, 16, 32]) {
    it(`sorts random power-of-two arrays of size ${n}`, () => {
      for (let t = 0; t < 12; t++) {
        const input = makeData('random', n)
        const last = buildBitonicSnapshots(input).slice(-1)[0]
        expect(last.sorted).toBe(true)
        expect(last.array).toEqual(sortedAsc(input))
      }
    })
  }

  for (const preset of presets) {
    it(`sorts the "${preset}" preset (n=16)`, () => {
      const input = makeData(preset, 16)
      const last = buildBitonicSnapshots(input).slice(-1)[0]
      expect(last.array).toEqual(sortedAsc(input))
    })
  }

  it('throws for non-power-of-two sizes', () => {
    expect(() => buildBitonicSnapshots(makeData('random', 12))).toThrow()
  })

  it('network is data-INDEPENDENT (same comparators for any input of size n)', () => {
    const n = 16
    const sigA = networkSignature(buildBitonicSnapshots(makeData('random', n)))
    const sigB = networkSignature(buildBitonicSnapshots(makeData('reversed', n)))
    const sigC = networkSignature(buildBitonicSnapshots(makeData('sorted', n)))
    expect(sigA).toBe(sigB)
    expect(sigB).toBe(sigC)
  })

  it('has O(log²n) phases: n=8 → 6, n=16 → 10, n=32 → 15', () => {
    expect(buildBitonicSnapshots(makeData('random', 8)).length - 1).toBe(6)
    expect(buildBitonicSnapshots(makeData('random', 16)).length - 1).toBe(10)
    expect(buildBitonicSnapshots(makeData('random', 32)).length - 1).toBe(15)
  })

  it('pairs in each phase are disjoint', () => {
    const snaps = buildBitonicSnapshots(makeData('random', 16))
    for (const s of snaps.slice(1)) {
      const used = new Set<number>()
      for (const p of s.pairs) {
        expect(used.has(p.i)).toBe(false)
        expect(used.has(p.j)).toBe(false)
        used.add(p.i)
        used.add(p.j)
      }
    }
  })
})

describe('sortMetrics', () => {
  it('parallel ticks = phases, speedup = sequential / parallel', () => {
    const snaps = buildBitonicSnapshots(makeData('random', 16))
    const m = sortMetrics(snaps)
    expect(m.phases).toBe(10)
    expect(m.parallelTicks).toBe(10)
    expect(m.sequentialTicks).toBe(m.totalCompareExchanges)
    expect(m.speedup).toBeCloseTo(m.sequentialTicks / m.parallelTicks)
  })
})
