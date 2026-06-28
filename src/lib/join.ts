// Parallel JOIN over horizontally-fragmented (sharded) data — pure logic.
//
// Domain: two tables sharing a string key.
//   A: rows (key, b)   B: rows (key, c)
// JOIN result per key present in BOTH tables: SUM(b·c) over all matched pairs,
// which equals (Σ b) · (Σ c) for that key.
//
// Horizontal fragmentation: keys are partitioned into p DISJOINT contiguous
// ranges, so every fragment can be joined fully independently (no cross-fragment
// re-join). Each fragment is processed by one logical executor; the builders
// below precompute deterministic step snapshots (like the Cannon page) for three
// in-fragment join methods: SP (engine) join, scoop / sort-merge, and naive RBAR.
//
// This is a SIMULATION — no real OS threads or databases run.

export interface Row {
  key: string
  /** b for table A, c for table B. */
  val: number
}

export interface Fragment {
  id: number
  /** Sorted, disjoint set of keys owned by this fragment. */
  keys: string[]
  /** A-rows (sorted by key). */
  a: Row[]
  /** B-rows (sorted by key). */
  b: Row[]
}

export interface ResultRow {
  key: string
  sumBC: number
}

export type JoinMethod = 'sp' | 'scoop' | 'rbar'

export interface FragmentView {
  id: number
  status: 'idle' | 'running' | 'done'
  caption: string
  // sort-merge / rbar pointers
  aPointer: number
  bPointer: number
  currentKey: string | null
  buffer: number[]
  runningSum: number
  /** Value just added to runningSum (for highlight), or null. */
  justAdded: number | null
  comparison: string | null
  /** SP engine progress 0..1. */
  progress: number
  /** RBAR round-trip counter. */
  roundTrips: number
  emittedKeys: string[]
}

export interface JoinSnapshot {
  index: number
  method: JoinMethod
  phase: 'init' | 'process' | 'barrier' | 'done'
  fragments: FragmentView[]
  result: ResultRow[]
  caption: string
  atBarrier: boolean
}

export interface JoinMetrics {
  perExecutor: number[]
  parallelTime: number
  sequentialTime: number
  speedup: number
  theoreticalMax: number
  bottleneckFragment: number
}

const randInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

/** Sorted union of distinct keys across both tables. */
export function distinctKeys(a: Row[], b: Row[]): string[] {
  const set = new Set<string>()
  for (const r of a) set.add(r.key)
  for (const r of b) set.add(r.key)
  return Array.from(set).sort()
}

/** Σ b·c per key present in BOTH tables — the reference (no fragmentation). */
export function naiveJoin(a: Row[], b: Row[]): ResultRow[] {
  const sumB = new Map<string, number>()
  const sumC = new Map<string, number>()
  for (const r of a) sumB.set(r.key, (sumB.get(r.key) ?? 0) + r.val)
  for (const r of b) sumC.set(r.key, (sumC.get(r.key) ?? 0) + r.val)
  const out: ResultRow[] = []
  for (const [key, bSum] of sumB) {
    const cSum = sumC.get(key)
    if (cSum !== undefined) out.push({ key, sumBC: bSum * cSum })
  }
  return out.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))
}

export function resultsEqual(x: ResultRow[], y: ResultRow[]): boolean {
  if (x.length !== y.length) return false
  for (let i = 0; i < x.length; i++) {
    if (x[i].key !== y[i].key || x[i].sumBC !== y[i].sumBC) return false
  }
  return true
}

/**
 * Partition sorted keys into p contiguous DISJOINT groups. `skew` in [0,1]
 * biases later fragments to own more keys (to demonstrate data skew); 0 = even.
 */
export function partitionKeys(keys: string[], p: number, skew = 0): string[][] {
  const groups: string[][] = Array.from({ length: p }, () => [])
  if (p <= 0) return groups
  const m = keys.length
  if (p === 1) {
    groups[0] = keys.slice()
    return groups
  }
  // Weight later fragments more heavily as skew grows (up to ~4×).
  const weights = Array.from({ length: p }, (_, f) => 1 + skew * 3 * (f / (p - 1)))
  const total = weights.reduce((s, w) => s + w, 0)
  const sizes = weights.map((w) => Math.floor((m * w) / total))
  // Distribute the rounding remainder to the heaviest fragments first.
  let assigned = sizes.reduce((s, v) => s + v, 0)
  const order = weights.map((_, f) => f).sort((p1, p2) => weights[p2] - weights[p1])
  let oi = 0
  while (assigned < m) {
    sizes[order[oi % p]]++
    assigned++
    oi++
  }
  let cursor = 0
  for (let f = 0; f < p; f++) {
    groups[f] = keys.slice(cursor, cursor + sizes[f])
    cursor += sizes[f]
  }
  return groups
}

/**
 * Build p fragments. All rows of a given key (from both tables) land in the
 * SAME fragment, so fragment key sets are disjoint and joinable independently.
 */
export function shardByKey(a: Row[], b: Row[], p: number, skew = 0): Fragment[] {
  const keys = distinctKeys(a, b)
  const groups = partitionKeys(keys, p, skew)
  const owner = new Map<string, number>()
  groups.forEach((g, f) => g.forEach((k) => owner.set(k, f)))
  const fragments: Fragment[] = groups.map((g, f) => ({ id: f, keys: g, a: [], b: [] }))
  for (const r of a) {
    const f = owner.get(r.key)
    if (f !== undefined) fragments[f].a.push(r)
  }
  for (const r of b) {
    const f = owner.get(r.key)
    if (f !== undefined) fragments[f].b.push(r)
  }
  const byKey = (x: Row, y: Row) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0)
  for (const frag of fragments) {
    frag.a.sort(byKey)
    frag.b.sort(byKey)
  }
  return fragments
}

/**
 * Generate random tables A and B with string keys plus their fragmentation.
 * Most keys appear in both tables; a few appear in only one (to show pointer
 * advances on mismatch). `skew` biases the fragment key distribution.
 */
export function generateData(
  n: number,
  p: number,
  skew = 0,
): { a: Row[]; b: Row[]; fragments: Fragment[] } {
  const a: Row[] = []
  const b: Row[] = []
  for (let i = 1; i <= n; i++) {
    const key = `K${String(i).padStart(2, '0')}`
    const inA = Math.random() < 0.9
    const inB = Math.random() < 0.9
    // Guarantee the key lands in at least one table.
    const forceA = !inA && !inB
    if (inA || forceA) {
      const rows = 1 + (Math.random() < 0.4 ? 1 : 0)
      for (let r = 0; r < rows; r++) a.push({ key, val: randInt(1, 9) })
    }
    if (inB) {
      const rows = 1 + (Math.random() < 0.4 ? 1 : 0)
      for (let r = 0; r < rows; r++) b.push({ key, val: randInt(1, 9) })
    }
  }
  return { a, b, fragments: shardByKey(a, b, p, skew) }
}

// ----------------------------------------------------------------------------
// Per-fragment simulations → ordered FragmentView "steps" + result emissions.
// ----------------------------------------------------------------------------

interface FragSim {
  steps: FragmentView[]
  emits: Array<{ at: number; row: ResultRow }>
}

const sumOf = (xs: number[]): number => xs.reduce((s, x) => s + x, 0)

const doneView = (frag: Fragment): FragmentView => ({
  id: frag.id,
  status: 'done',
  caption: 'фрагмент соединён',
  aPointer: frag.a.length,
  bPointer: frag.b.length,
  currentKey: null,
  buffer: [],
  runningSum: 0,
  justAdded: null,
  comparison: null,
  progress: 1,
  roundTrips: 0,
  emittedKeys: frag.keys.filter((k) => frag.a.some((r) => r.key === k) && frag.b.some((r) => r.key === k)),
})

const idleView = (frag: Fragment): FragmentView => ({
  id: frag.id,
  status: 'idle',
  caption: 'ожидание запуска',
  aPointer: 0,
  bPointer: 0,
  currentKey: null,
  buffer: [],
  runningSum: 0,
  justAdded: null,
  comparison: null,
  progress: 0,
  roundTrips: 0,
  emittedKeys: [],
})

/** Sort-merge (scoop) simulation of one fragment. */
function simulateScoop(frag: Fragment): FragSim {
  const a = frag.a
  const b = frag.b
  const steps: FragmentView[] = []
  const emits: Array<{ at: number; row: ResultRow }> = []
  const emittedKeys: string[] = []
  let i = 0
  let j = 0

  const push = (v: Partial<FragmentView> & { caption: string; comparison: string | null }) => {
    steps.push({
      id: frag.id,
      status: 'running',
      aPointer: i,
      bPointer: j,
      currentKey: v.currentKey ?? null,
      buffer: v.buffer ? [...v.buffer] : [],
      runningSum: v.runningSum ?? 0,
      justAdded: v.justAdded ?? null,
      comparison: v.comparison,
      progress: 0,
      roundTrips: 0,
      emittedKeys: [...emittedKeys],
      caption: v.caption,
    })
  }

  while (i < a.length && j < b.length) {
    const ka = a[i].key
    const kb = b[j].key
    if (ka === kb) {
      const key = ka
      const buffer: number[] = []
      while (i < a.length && a[i].key === key) {
        buffer.push(a[i].val)
        push({
          caption: `Ключ ${key}: «черпак» собирает b=${a[i].val}`,
          comparison: `A.${key} = B.${key}`,
          currentKey: key,
          buffer,
          runningSum: 0,
        })
        i++
      }
      let sum = 0
      while (j < b.length && b[j].key === key) {
        const c = b[j].val
        const add = sumOf(buffer) * c
        sum += add
        push({
          caption: `Ключ ${key}: c=${c} × Σb=${sumOf(buffer)} → +${add}`,
          comparison: `A.${key} = B.${key}`,
          currentKey: key,
          buffer,
          runningSum: sum,
          justAdded: add,
        })
        j++
      }
      emittedKeys.push(key)
      const at = steps.length
      emits.push({ at, row: { key, sumBC: sum } })
      push({
        caption: `Ключ ${key}: строка (${key}, ${sum}) → в результат`,
        comparison: null,
        currentKey: key,
        buffer,
        runningSum: sum,
      })
    } else if (ka < kb) {
      push({ caption: `${ka} < ${kb}: двигаем указатель A`, comparison: `${ka} < ${kb}` })
      i++
    } else {
      push({ caption: `${kb} < ${ka}: двигаем указатель B`, comparison: `${kb} < ${ka}` })
      j++
    }
  }
  // Drain remaining non-matching rows (visual completeness).
  while (i < a.length) {
    push({ caption: `${a[i].key}: нет пары в B — пропуск`, comparison: null })
    i++
  }
  while (j < b.length) {
    push({ caption: `${b[j].key}: нет пары в A — пропуск`, comparison: null })
    j++
  }
  steps.push(doneView(frag))
  return { steps, emits }
}

/** SP (engine) join simulation of one fragment: dispatch → engine → result. */
function simulateSp(frag: Fragment): FragSim {
  const steps: FragmentView[] = []
  const rows = frag.a.length + frag.b.length
  const engineSteps = Math.max(1, Math.round(rows / 2))
  const result = naiveJoin(frag.a, frag.b)

  const base: Omit<FragmentView, 'caption' | 'progress' | 'status'> = {
    id: frag.id,
    aPointer: 0,
    bPointer: 0,
    currentKey: null,
    buffer: [],
    runningSum: 0,
    justAdded: null,
    comparison: null,
    roundTrips: 0,
    emittedKeys: [],
  }

  steps.push({ ...base, status: 'running', progress: 0, caption: 'запрос отправлен в движок БД' })
  for (let s = 1; s <= engineSteps; s++) {
    steps.push({
      ...base,
      status: 'running',
      progress: s / engineSteps,
      caption: 'движок БД соединяет A⋈B по ключу (индексы)…',
    })
  }
  const at = steps.length
  steps.push(doneView(frag))
  const emits = result.map((row) => ({ at, row }))
  return { steps, emits }
}

/** Naive RBAR simulation: one DB round-trip per key (chatty). */
function simulateRbar(frag: Fragment): FragSim {
  const steps: FragmentView[] = []
  const emits: Array<{ at: number; row: ResultRow }> = []
  const emittedKeys: string[] = []
  const result = naiveJoin(frag.a, frag.b)
  const byKey = new Map(result.map((r) => [r.key, r.sumBC]))
  let roundTrips = 0
  for (const key of frag.keys) {
    roundTrips++
    const matched = byKey.has(key)
    if (matched) {
      emittedKeys.push(key)
      const at = steps.length
      emits.push({ at, row: { key, sumBC: byKey.get(key)! } })
    }
    steps.push({
      id: frag.id,
      status: 'running',
      caption: matched
        ? `Запрос #${roundTrips} к БД по ключу ${key} → (${key}, ${byKey.get(key)})`
        : `Запрос #${roundTrips} к БД по ключу ${key} → нет пары`,
      aPointer: 0,
      bPointer: 0,
      currentKey: key,
      buffer: [],
      runningSum: 0,
      justAdded: null,
      comparison: null,
      progress: 0,
      roundTrips,
      emittedKeys: [...emittedKeys],
    })
  }
  steps.push({ ...doneView(frag), roundTrips })
  return { steps, emits }
}

const simulators: Record<JoinMethod, (f: Fragment) => FragSim> = {
  sp: simulateSp,
  scoop: simulateScoop,
  rbar: simulateRbar,
}

const methodLabel: Record<JoinMethod, string> = {
  sp: 'СУБД-соединение (SP JOIN)',
  scoop: 'Соединение в приложении (черпак / sort-merge)',
  rbar: 'Поключевое (наивное, RBAR)',
}

/** Build the global step snapshots for a method by aligning fragment timelines. */
export function buildJoinSnapshots(fragments: Fragment[], method: JoinMethod): JoinSnapshot[] {
  const sims = fragments.map((f) => simulators[method](f))
  const maxLen = Math.max(1, ...sims.map((s) => s.steps.length))

  const resultAt = (t: number): ResultRow[] => {
    const rows: ResultRow[] = []
    for (const s of sims) for (const e of s.emits) if (e.at <= t) rows.push(e.row)
    return rows.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0))
  }

  const snapshots: JoinSnapshot[] = []

  // init
  snapshots.push({
    index: 0,
    method,
    phase: 'init',
    fragments: fragments.map(idleView),
    result: [],
    caption: `Метод: ${methodLabel[method]}. ${fragments.length} исполнителей готовы; ключи фрагментов не пересекаются.`,
    atBarrier: false,
  })

  // process steps (lanes advance together; finished fragments clamp to 'done')
  for (let t = 0; t < maxLen; t++) {
    const fragViews = sims.map((s, f) =>
      s.steps.length === 0 ? idleView(fragments[f]) : s.steps[Math.min(t, s.steps.length - 1)],
    )
    const running = fragViews.filter((v) => v.status === 'running').length
    snapshots.push({
      index: snapshots.length,
      method,
      phase: 'process',
      fragments: fragViews,
      result: resultAt(t),
      caption:
        running > 0
          ? `Исполнители работают параллельно (${running} активны)…`
          : 'Все исполнители завершили свои фрагменты.',
      atBarrier: false,
    })
  }

  const fullResult = resultAt(maxLen)

  // barrier — explicit synchronization point
  snapshots.push({
    index: snapshots.length,
    method,
    phase: 'barrier',
    fragments: fragments.map(doneView),
    result: fullResult,
    caption: 'Барьер синхронизации: главный исполнитель дождался всех фрагментов.',
    atBarrier: true,
  })

  // done — collected result
  snapshots.push({
    index: snapshots.length,
    method,
    phase: 'done',
    fragments: fragments.map(doneView),
    result: fullResult,
    caption: 'Результат собран из независимых фрагментов — досоединение не требуется.',
    atBarrier: false,
  })

  return snapshots
}

/** Final assembled result from a snapshot array (last snapshot). */
export function finalJoinResult(snapshots: JoinSnapshot[]): ResultRow[] {
  return snapshots[snapshots.length - 1].result
}

// ----------------------------------------------------------------------------
// Cost model / metrics (abstract time units).
// ----------------------------------------------------------------------------

const SP_OVERHEAD = 3
const RBAR_RTT = 2

function fragmentCost(frag: Fragment, method: JoinMethod): number {
  const rows = frag.a.length + frag.b.length
  switch (method) {
    case 'scoop':
      return rows // single merge pass over pre-sorted streams
    case 'sp':
      return frag.keys.length === 0 ? 0 : SP_OVERHEAD + Math.ceil(0.8 * rows) // indexed engine
    case 'rbar':
      return frag.keys.length * RBAR_RTT + rows // a round-trip per key
  }
}

export function computeMetrics(fragments: Fragment[], method: JoinMethod): JoinMetrics {
  const perExecutor = fragments.map((f) => fragmentCost(f, method))
  const parallelTime = Math.max(0, ...perExecutor)
  const sequentialTime = perExecutor.reduce((s, v) => s + v, 0)
  const theoreticalMax = fragments.length
  const speedup = parallelTime > 0 ? sequentialTime / parallelTime : 0
  let bottleneckFragment = 0
  perExecutor.forEach((v, f) => {
    if (v > perExecutor[bottleneckFragment]) bottleneckFragment = f
  })
  return { perExecutor, parallelTime, sequentialTime, speedup, theoreticalMax, bottleneckFragment }
}

export { methodLabel }
