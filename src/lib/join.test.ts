import { describe, it, expect } from 'vitest'
import {
  generateData,
  shardByKey,
  partitionKeys,
  distinctKeys,
  naiveJoin,
  resultsEqual,
  buildJoinSnapshots,
  finalJoinResult,
  computeMetrics,
  type Row,
  type JoinMethod,
} from './join'

const A: Row[] = [
  { key: 'K01', val: 2 },
  { key: 'K01', val: 3 },
  { key: 'K02', val: 5 },
  { key: 'K04', val: 1 }, // only in A
]
const B: Row[] = [
  { key: 'K01', val: 4 },
  { key: 'K02', val: 2 },
  { key: 'K02', val: 1 },
  { key: 'K03', val: 9 }, // only in B
]

describe('naiveJoin', () => {
  it('computes Σ(b·c) = (Σb)(Σc) per common key', () => {
    // K01: (2+3)·4 = 20 ; K02: 5·(2+1) = 15 ; K03/K04 unmatched.
    expect(naiveJoin(A, B)).toEqual([
      { key: 'K01', sumBC: 20 },
      { key: 'K02', sumBC: 15 },
    ])
  })

  it('returns empty when no keys overlap', () => {
    expect(naiveJoin([{ key: 'X', val: 1 }], [{ key: 'Y', val: 1 }])).toEqual([])
  })
})

describe('partitionKeys / shardByKey — disjoint key ranges', () => {
  it('partitions into p contiguous disjoint groups covering all keys', () => {
    const keys = ['K01', 'K02', 'K03', 'K04', 'K05', 'K06']
    for (const p of [1, 2, 3, 6]) {
      const groups = partitionKeys(keys, p)
      expect(groups).toHaveLength(p)
      expect(groups.flat().sort()).toEqual(keys)
      // disjoint
      const seen = new Set<string>()
      for (const g of groups) for (const k of g) {
        expect(seen.has(k)).toBe(false)
        seen.add(k)
      }
    }
  })

  it('skew makes later fragments own more keys (still disjoint)', () => {
    const keys = Array.from({ length: 12 }, (_, i) => `K${String(i + 1).padStart(2, '0')}`)
    const skewed = partitionKeys(keys, 3, 1)
    expect(skewed.flat()).toHaveLength(12)
    expect(skewed[2].length).toBeGreaterThan(skewed[0].length)
  })

  it('shardByKey keeps every fragment key set disjoint and routes all rows', () => {
    const fragments = shardByKey(A, B, 2)
    const keySets = fragments.map((f) => new Set(f.keys))
    // disjoint
    for (let i = 0; i < keySets.length; i++) {
      for (let j = i + 1; j < keySets.length; j++) {
        for (const k of keySets[i]) expect(keySets[j].has(k)).toBe(false)
      }
    }
    // all rows routed, all keys covered
    const totalA = fragments.reduce((s, f) => s + f.a.length, 0)
    const totalB = fragments.reduce((s, f) => s + f.b.length, 0)
    expect(totalA).toBe(A.length)
    expect(totalB).toBe(B.length)
    expect(fragments.flatMap((f) => f.keys).sort()).toEqual(distinctKeys(A, B))
  })
})

describe('buildJoinSnapshots — correctness vs naiveJoin', () => {
  const methods: JoinMethod[] = ['sp', 'scoop', 'rbar']
  for (const method of methods) {
    it(`final result equals naiveJoin for the fixed example (${method})`, () => {
      const fragments = shardByKey(A, B, 2)
      const snaps = buildJoinSnapshots(fragments, method)
      expect(resultsEqual(finalJoinResult(snaps), naiveJoin(A, B))).toBe(true)
    })

    for (const n of [6, 10, 16]) {
      for (const p of [1, 2, 3, 4]) {
        it(`final result equals naiveJoin for N=${n}, p=${p} (${method}, random)`, () => {
          for (let trial = 0; trial < 8; trial++) {
            const { a, b, fragments } = generateData(n, p, trial % 2 === 0 ? 0 : 0.8)
            const snaps = buildJoinSnapshots(fragments, method)
            expect(resultsEqual(finalJoinResult(snaps), naiveJoin(a, b))).toBe(true)
          }
        })
      }
    }
  }
})

describe('buildJoinSnapshots — structure', () => {
  it('starts at init and ends with a barrier then done', () => {
    const { fragments } = generateData(10, 3, 0.5)
    const snaps = buildJoinSnapshots(fragments, 'scoop')
    expect(snaps[0].phase).toBe('init')
    const barrier = snaps.find((s) => s.atBarrier)
    expect(barrier).toBeDefined()
    expect(snaps[snaps.length - 1].phase).toBe('done')
    // result only grows monotonically in length across steps
    let prev = 0
    for (const s of snaps) {
      expect(s.result.length).toBeGreaterThanOrEqual(prev)
      prev = s.result.length
    }
  })

  it('every method reaches the same final result for the same data', () => {
    const { a, b, fragments } = generateData(14, 3, 0.6)
    const ref = naiveJoin(a, b)
    for (const m of ['sp', 'scoop', 'rbar'] as JoinMethod[]) {
      expect(resultsEqual(finalJoinResult(buildJoinSnapshots(fragments, m)), ref)).toBe(true)
    }
  })
})

describe('computeMetrics', () => {
  it('parallel = max, sequential = sum, theoretical max = p, speedup = seq/par', () => {
    const { fragments } = generateData(16, 4, 0.7)
    const m = computeMetrics(fragments, 'scoop')
    expect(m.perExecutor).toHaveLength(4)
    expect(m.parallelTime).toBe(Math.max(...m.perExecutor))
    expect(m.sequentialTime).toBe(m.perExecutor.reduce((s, v) => s + v, 0))
    expect(m.theoreticalMax).toBe(4)
    if (m.parallelTime > 0) {
      expect(m.speedup).toBeCloseTo(m.sequentialTime / m.parallelTime)
    }
    expect(m.perExecutor[m.bottleneckFragment]).toBe(m.parallelTime)
  })

  it('p=1 has speedup 1 (sequential == parallel)', () => {
    const { fragments } = generateData(12, 1, 0)
    const m = computeMetrics(fragments, 'sp')
    expect(m.theoreticalMax).toBe(1)
    expect(m.speedup).toBeCloseTo(1)
  })
})
