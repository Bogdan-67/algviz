import { describe, it, expect } from 'vitest'
import {
  accessLatency,
  numaExpectedLatency,
  umaScalability,
  genAccesses,
  avgLatency,
  buildAccessSnapshots,
  scalabilitySeries,
  UMA_BASE,
  NUMA_LOCAL,
  NUMA_REMOTE,
  type Access,
} from './memarch'

describe('UMA latency', () => {
  it('is identical for every processor and cell (no contention)', () => {
    for (let from = 0; from < 8; from++) {
      expect(accessLatency('uma', from, 0, 0)).toBe(UMA_BASE)
    }
  })
  it('grows with the number of concurrent bus users', () => {
    let prev = -Infinity
    for (let busBusy = 0; busBusy <= 7; busBusy++) {
      const lat = accessLatency('uma', 0, 0, busBusy)
      expect(lat).toBeGreaterThan(prev)
      prev = lat
    }
  })
  it('average latency increases with p (bus contention)', () => {
    let prev = -Infinity
    for (const p of [1, 2, 4, 8]) {
      const v = umaScalability(p)
      expect(v).toBeGreaterThan(prev)
      prev = v
    }
  })
})

describe('NUMA latency', () => {
  it('local access is cheaper than remote', () => {
    expect(accessLatency('numa', 3, 3, 0)).toBe(NUMA_LOCAL)
    expect(accessLatency('numa', 3, 5, 0)).toBe(NUMA_REMOTE)
    expect(accessLatency('numa', 3, 3, 0)).toBeLessThan(accessLatency('numa', 3, 5, 0))
  })
  it('expected latency decreases monotonically as locality rises', () => {
    let prev = Infinity
    for (const loc of [0, 0.25, 0.5, 0.75, 1]) {
      const v = numaExpectedLatency(loc)
      expect(v).toBeLessThan(prev)
      prev = v
    }
    expect(numaExpectedLatency(1)).toBe(NUMA_LOCAL)
    expect(numaExpectedLatency(0)).toBe(NUMA_REMOTE)
  })
})

describe('genAccesses + avgLatency', () => {
  it('UMA: every access targets the single shared bank', () => {
    const acc = genAccesses('uma', 4, 1, 50)
    for (const a of acc) expect(a.target).toBe(0)
  })
  it('NUMA: higher locality lowers the measured average latency', () => {
    const samples = (loc: number) => {
      let sum = 0
      const trials = 40
      for (let t = 0; t < trials; t++) sum += avgLatency('numa', genAccesses('numa', 6, loc, 100))
      return sum / trials
    }
    expect(samples(0.9)).toBeLessThan(samples(0.2))
  })
  it('NUMA: a local access is never to another node', () => {
    const acc = genAccesses('numa', 5, 0.5, 100)
    for (const a of acc) expect(a.local).toBe(a.proc === a.target)
  })
})

describe('buildAccessSnapshots', () => {
  it('accumulates count, average and local/remote counters', () => {
    const accesses: Access[] = [
      { proc: 0, target: 0, local: true, concurrent: 1 },
      { proc: 1, target: 2, local: false, concurrent: 1 },
    ]
    const snaps = buildAccessSnapshots('numa', 3, accesses)
    expect(snaps).toHaveLength(3) // initial + 2
    const last = snaps[2]
    expect(last.count).toBe(2)
    expect(last.localCount).toBe(1)
    expect(last.remoteCount).toBe(1)
    expect(last.sumLatency).toBe(NUMA_LOCAL + NUMA_REMOTE)
    expect(last.avgLatency).toBeCloseTo((NUMA_LOCAL + NUMA_REMOTE) / 2)
  })
})

describe('scalabilitySeries', () => {
  it('UMA rises with p while NUMA (high locality) stays flat and lower', () => {
    const { uma, numa } = scalabilitySeries(8, 0.9)
    expect(uma[7].v).toBeGreaterThan(uma[0].v)
    expect(new Set(numa.map((n) => n.v)).size).toBe(1) // flat
    expect(numa[7].v).toBeLessThan(uma[7].v)
  })
})
