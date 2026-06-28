// Parallel sorting networks — pure logic.
//
// Both algorithms reduce to the compare-exchange primitive: two positions
// compare and keep the smaller/larger. Parallelism = many DISJOINT pairs run in
// one phase. The UI precomputes a snapshot per phase (deterministic stepping).

export type SortKind = 'oddeven' | 'bitonic'

export interface Pair {
  i: number
  j: number
  /** true = keep smaller at i (sort ascending in this comparator). */
  ascending: boolean
  /** whether this compare-exchange actually swapped the values. */
  swapped: boolean
}

export interface Snapshot {
  index: number
  kind: SortKind
  /** Array state AFTER this phase's compare-exchanges. */
  array: number[]
  /** Array state BEFORE this phase (for swap animation). */
  before: number[]
  /** Disjoint pairs compared simultaneously this phase. */
  pairs: Pair[]
  /** Phase number (1-based); 0 for the initial snapshot. */
  phase: number
  /** Bitonic stage / substage (undefined for odd-even). */
  stage?: number
  substage?: number
  caption: string
  sorted: boolean
}

export function isSorted(arr: number[]): boolean {
  for (let i = 1; i < arr.length; i++) if (arr[i - 1] > arr[i]) return false
  return true
}

export function isPowerOfTwo(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0
}

/** Immutable compare-exchange of positions i,j (keeps smaller at min(i,j) when ascending). */
export function compareExchange(arr: number[], i: number, j: number, ascending = true): number[] {
  const out = arr.slice()
  const lo = Math.min(i, j)
  const hi = Math.max(i, j)
  const shouldSwap = ascending ? out[lo] > out[hi] : out[lo] < out[hi]
  if (shouldSwap) {
    const tmp = out[lo]
    out[lo] = out[hi]
    out[hi] = tmp
  }
  return out
}

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

export type Preset = 'random' | 'sorted' | 'reversed' | 'nearly'

/** Generate data for a preset. Values are small positive ints (bar heights). */
export function makeData(preset: Preset, n: number): number[] {
  const base = Array.from({ length: n }, (_, i) =>
    Math.round(8 + (i / Math.max(1, n - 1)) * 90),
  )
  switch (preset) {
    case 'sorted':
      return base
    case 'reversed':
      return base.slice().reverse()
    case 'nearly': {
      const arr = base.slice()
      const swaps = Math.max(1, Math.round(n * 0.12))
      for (let s = 0; s < swaps; s++) {
        const i = randInt(0, n - 1)
        const j = Math.min(n - 1, i + 1)
        const t = arr[i]
        arr[i] = arr[j]
        arr[j] = t
      }
      return arr
    }
    case 'random':
    default:
      return Array.from({ length: n }, () => randInt(5, 99))
  }
}

function snapshotCommon(
  kind: SortKind,
  index: number,
  before: number[],
  array: number[],
  pairs: Pair[],
  phase: number,
  caption: string,
): Snapshot {
  return { index, kind, before, array, pairs, phase, caption, sorted: isSorted(array) }
}

/**
 * Odd-even transposition sort: parallel bubble sort on a linear array.
 * Even phases compare (0,1)(2,3)…; odd phases compare (1,2)(3,4)…. All pairs in
 * a phase run simultaneously. At most n phases; stops once sorted.
 */
export function buildOddEvenSnapshots(input: number[]): Snapshot[] {
  const n = input.length
  let arr = input.slice()
  const snapshots: Snapshot[] = [
    snapshotCommon('oddeven', 0, arr.slice(), arr.slice(), [], 0, 'Исходный массив. Накопителей нет.'),
  ]
  for (let phase = 0; phase < n; phase++) {
    const start = phase % 2 === 0 ? 0 : 1
    const before = arr.slice()
    const next = arr.slice()
    const pairs: Pair[] = []
    for (let i = start; i + 1 < n; i += 2) {
      const swapped = next[i] > next[i + 1]
      if (swapped) {
        const t = next[i]
        next[i] = next[i + 1]
        next[i + 1] = t
      }
      pairs.push({ i, j: i + 1, ascending: true, swapped })
    }
    arr = next
    const parity = start === 0 ? 'чётная' : 'нечётная'
    snapshots.push(
      snapshotCommon(
        'oddeven',
        snapshots.length,
        before,
        arr.slice(),
        pairs,
        phase + 1,
        `Фаза ${phase + 1} (${parity}): пары ${pairs.map((p) => `(${p.i},${p.j})`).join(' ')} сравниваются параллельно.`,
      ),
    )
    if (isSorted(arr)) break
  }
  return snapshots
}

/**
 * Batcher's bitonic sort (n must be a power of two). The comparator network is
 * FIXED — the same pairs and directions for any input — built from nested
 * stages (k) and substages (j). Each (k,j) level is one parallel phase.
 */
export function buildBitonicSnapshots(input: number[]): Snapshot[] {
  const n = input.length
  if (!isPowerOfTwo(n)) {
    throw new Error(`buildBitonicSnapshots: n=${n} must be a power of two`)
  }
  let arr = input.slice()
  const snapshots: Snapshot[] = [
    snapshotCommon('bitonic', 0, arr.slice(), arr.slice(), [], 0, 'Исходный массив. Сеть Бэтчера фиксирована.'),
  ]
  let stage = 0
  for (let k = 2; k <= n; k <<= 1) {
    stage++
    let substage = 0
    for (let j = k >> 1; j > 0; j >>= 1) {
      substage++
      const before = arr.slice()
      const next = arr.slice()
      const pairs: Pair[] = []
      for (let i = 0; i < n; i++) {
        const l = i ^ j
        if (l > i) {
          const ascending = (i & k) === 0
          const lo = i
          const hi = l
          const shouldSwap = ascending ? next[lo] > next[hi] : next[lo] < next[hi]
          if (shouldSwap) {
            const t = next[lo]
            next[lo] = next[hi]
            next[hi] = t
          }
          pairs.push({ i: lo, j: hi, ascending, swapped: shouldSwap })
        }
      }
      arr = next
      const snap = snapshotCommon(
        'bitonic',
        snapshots.length,
        before,
        arr.slice(),
        pairs,
        snapshots.length,
        `Стадия ${stage}, подстадия ${substage} (k=${k}, j=${j}): фиксированные сравнители ${ascArrowSummary(pairs)}.`,
      )
      snap.stage = stage
      snap.substage = substage
      snapshots.push(snap)
    }
  }
  return snapshots
}

function ascArrowSummary(pairs: Pair[]): string {
  const up = pairs.filter((p) => p.ascending).length
  const down = pairs.length - up
  return `↑${up} / ↓${down}`
}

export function buildSnapshots(kind: SortKind, input: number[]): Snapshot[] {
  return kind === 'bitonic' ? buildBitonicSnapshots(input) : buildOddEvenSnapshots(input)
}

export interface SortMetrics {
  phases: number
  totalCompareExchanges: number
  /** Sequential time = one compare-exchange per tick. */
  sequentialTicks: number
  /** Parallel time = number of phases. */
  parallelTicks: number
  speedup: number
}

export function sortMetrics(snapshots: Snapshot[]): SortMetrics {
  const phases = snapshots.length - 1
  const totalCompareExchanges = snapshots.reduce((s, snap) => s + snap.pairs.length, 0)
  const sequentialTicks = totalCompareExchanges
  const parallelTicks = phases
  return {
    phases,
    totalCompareExchanges,
    sequentialTicks,
    parallelTicks,
    speedup: parallelTicks > 0 ? sequentialTicks / parallelTicks : 0,
  }
}

/**
 * Track stable element identities across phases so the UI can animate swaps as
 * positional movement. Returns idAtPos[snapshotIndex][position].
 */
export function idTrack(snapshots: Snapshot[]): number[][] {
  const n = snapshots[0].array.length
  let ids = Array.from({ length: n }, (_, i) => i)
  const out: number[][] = [ids.slice()]
  for (const s of snapshots.slice(1)) {
    const next = ids.slice()
    for (const p of s.pairs) {
      if (p.swapped) {
        const t = next[p.i]
        next[p.i] = next[p.j]
        next[p.j] = t
      }
    }
    ids = next
    out.push(ids.slice())
  }
  return out
}

/** Signature of a network's comparator set (ignores values) — for the fixed-network test. */
export function networkSignature(snapshots: Snapshot[]): string {
  return snapshots
    .slice(1)
    .map((s) => s.pairs.map((p) => `${p.i}-${p.j}:${p.ascending ? 'A' : 'D'}`).join(','))
    .join('|')
}
