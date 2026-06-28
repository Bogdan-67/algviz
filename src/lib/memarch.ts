// Memory architecture model — UMA (SMP) vs NUMA. Pure logic.
//
// Model latencies in abstract units (not real hardware measurements):
//  - UMA: every processor reaches the single shared memory over a shared bus;
//    base latency is the SAME for all, plus contention when others use the bus.
//  - NUMA: memory is distributed per node; local access is cheap, remote
//    (through the interconnect) is several times slower. Address space is
//    unified, but access time is non-uniform.

export type Arch = 'uma' | 'numa'

export const UMA_BASE = 2 // bus latency to shared memory
export const BUS_PENALTY = 1 // added per concurrent competing request
export const NUMA_LOCAL = 1 // processor → own memory
export const NUMA_REMOTE = 4 // processor → another node's memory
export const BUS_SCALE_STEP = 0.7 // avg contention growth per extra processor

export interface Access {
  proc: number
  /** Target memory: UMA → 0 (single bank); NUMA → node index. */
  target: number
  local: boolean
  /** Number of processors hitting the bus at the same tick (UMA contention). */
  concurrent: number
}

/**
 * Latency of one access.
 *  - UMA: UMA_BASE + busBusy·BUS_PENALTY (busBusy = others competing). Constant
 *    UMA_BASE for any processor/cell when uncontended.
 *  - NUMA: local (from === to) is NUMA_LOCAL, remote is NUMA_REMOTE.
 */
export function accessLatency(arch: Arch, from: number, to: number, busBusy = 0): number {
  if (arch === 'uma') return UMA_BASE + Math.max(0, busBusy) * BUS_PENALTY
  return from === to ? NUMA_LOCAL : NUMA_REMOTE
}

/** Expected NUMA latency for a given locality (fraction of local accesses). */
export function numaExpectedLatency(locality: number, local = NUMA_LOCAL, remote = NUMA_REMOTE): number {
  const l = Math.max(0, Math.min(1, locality))
  return l * local + (1 - l) * remote
}

/** UMA average latency under contention as p grows (bus is the bottleneck). */
export function umaScalability(p: number): number {
  return UMA_BASE + Math.max(0, p - 1) * BUS_SCALE_STEP
}

/** NUMA average latency vs p — stays low when locality is high (flat-ish). */
export function numaScalability(locality: number): number {
  return numaExpectedLatency(locality)
}

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

/**
 * Generate a stream of memory accesses.
 *  - UMA: all target the single bank (0); `concurrent` models simultaneous bus
 *    users when busLoad is on.
 *  - NUMA: with probability `locality` the access is local (target = proc node),
 *    otherwise it targets a random other node.
 */
export function genAccesses(
  arch: Arch,
  p: number,
  locality: number,
  count: number,
  busLoad = false,
): Access[] {
  const out: Access[] = []
  for (let i = 0; i < count; i++) {
    const proc = randInt(0, p - 1)
    if (arch === 'uma') {
      const concurrent = busLoad ? randInt(1, p) : 1
      out.push({ proc, target: 0, local: true, concurrent })
    } else {
      const isLocal = Math.random() < locality
      let target = proc
      if (!isLocal && p > 1) {
        target = randInt(0, p - 2)
        if (target >= proc) target++ // any node except proc
      }
      out.push({ proc, target, local: target === proc, concurrent: 1 })
    }
  }
  return out
}

/** Latency of a single access (uses its own contention count for UMA). */
export function latencyOf(arch: Arch, a: Access): number {
  return accessLatency(arch, a.proc, a.target, arch === 'uma' ? a.concurrent - 1 : 0)
}

export function avgLatency(arch: Arch, accesses: Access[]): number {
  if (accesses.length === 0) return 0
  const sum = accesses.reduce((s, a) => s + latencyOf(arch, a), 0)
  return sum / accesses.length
}

export interface MemSnapshot {
  index: number
  arch: Arch
  p: number
  access: Access | null
  latency: number
  busBusy: number
  count: number
  sumLatency: number
  avgLatency: number
  localCount: number
  remoteCount: number
  caption: string
}

/** Precompute one snapshot per access for deterministic stepping. */
export function buildAccessSnapshots(
  arch: Arch,
  p: number,
  accesses: Access[],
): MemSnapshot[] {
  const snaps: MemSnapshot[] = [
    {
      index: 0,
      arch,
      p,
      access: null,
      latency: 0,
      busBusy: 0,
      count: 0,
      sumLatency: 0,
      avgLatency: 0,
      localCount: 0,
      remoteCount: 0,
      caption: arch === 'uma'
        ? 'UMA (SMP): единая память через общую шину — время доступа одинаково для всех.'
        : 'NUMA: память распределена по узлам — локальный доступ быстрый, удалённый медленнее.',
    },
  ]
  let sum = 0
  let local = 0
  let remote = 0
  accesses.forEach((a, i) => {
    const lat = latencyOf(arch, a)
    sum += lat
    if (a.local) local++
    else remote++
    const busBusy = arch === 'uma' ? a.concurrent - 1 : 0
    const caption =
      arch === 'uma'
        ? busBusy > 0
          ? `П${a.proc} → общая память (задержка ${lat}: база ${UMA_BASE} + ${busBusy} в очереди за шину)`
          : `П${a.proc} → общая память (задержка ${lat}, шина свободна)`
        : a.local
          ? `П${a.proc} → своя локальная память (узел ${a.target}) — задержка ${lat} ✓`
          : `П${a.proc} → удалённая память узла ${a.target} через interconnect — задержка ${lat}`
    snaps.push({
      index: i + 1,
      arch,
      p,
      access: a,
      latency: lat,
      busBusy,
      count: i + 1,
      sumLatency: sum,
      avgLatency: sum / (i + 1),
      localCount: local,
      remoteCount: remote,
      caption,
    })
  })
  return snaps
}

/** Scalability series: avg latency vs p for both archs (NUMA at given locality). */
export function scalabilitySeries(
  pMax: number,
  locality: number,
): { uma: { p: number; v: number }[]; numa: { p: number; v: number }[] } {
  const uma: { p: number; v: number }[] = []
  const numa: { p: number; v: number }[] = []
  for (let p = 1; p <= pMax; p++) {
    uma.push({ p, v: umaScalability(p) })
    numa.push({ p, v: numaScalability(locality) })
  }
  return { uma, numa }
}
