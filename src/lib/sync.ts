// Thread-synchronization simulator — pure logic.
//
// Model: several "threads", each a list of elementary steps (read/inc/write,
// lock/unlock, P/V on semaphores, put/take, barrier). The simulator plays a
// concrete INTERLEAVING: applyStep advances one chosen thread by one step and
// updates shared resources, honouring blocking. Deterministic per step index.
// No real OS threads — this is a visualization.

export type Scenario = 'race' | 'mutex' | 'semaphore' | 'prodcons' | 'barrier' | 'deadlock'

export type Op =
  | 'read'
  | 'inc'
  | 'write'
  | 'lock'
  | 'unlock'
  | 'wait'
  | 'signal'
  | 'put'
  | 'take'
  | 'barrier'
  | 'work'

export interface Instr {
  op: Op
  text: string
  var?: string
  reg?: string
  lock?: string
  sem?: string
  barrier?: string
}

export type ThreadStatus = 'ready' | 'blocked' | 'done'

export interface ThreadState {
  id: number
  name: string
  program: Instr[]
  pc: number
  status: ThreadStatus
  regs: Record<string, number>
  blockedOn?: string
}

export interface LockState {
  owner: number | null
  waiters: number[]
}
export interface SemState {
  value: number
  waiters: number[]
}
export interface BufferState {
  capacity: number
  items: number[]
}
export interface BarrierState {
  needed: number
  arrived: number[]
  opened: boolean
}

export interface SyncState {
  scenario: Scenario
  threads: ThreadState[]
  vars: Record<string, number>
  locks: Record<string, LockState>
  sems: Record<string, SemState>
  buffer?: BufferState
  barrier?: BarrierState
  lastThread: number | null
  lastAction: string
  /** Expected final x for increment scenarios (race/mutex/semaphore). */
  expectedX?: number
}

export const EXPECTED_INCREMENT = 2

// ---------------------------------------------------------------------------
// Step helpers (mutate a CLONED state)
// ---------------------------------------------------------------------------

function step1(t: ThreadState): void {
  t.pc++
  if (t.pc >= t.program.length) {
    t.status = 'done'
    t.blockedOn = undefined
  }
}

function wake(t: ThreadState): void {
  t.status = 'ready'
  t.blockedOn = undefined
  step1(t)
}

/** Advance one thread by one step. Pure: returns a new state. */
export function applyStep(state: SyncState, tid: number): SyncState {
  const s: SyncState = structuredClone(state)
  const t = s.threads[tid]
  if (!t || t.status !== 'ready') {
    s.lastThread = tid
    s.lastAction = t ? `${t.name}: не готов к шагу` : 'нет потока'
    return s
  }
  const instr = t.program[t.pc]
  let action = ''
  switch (instr.op) {
    case 'read':
      t.regs[instr.reg!] = s.vars[instr.var!]
      action = `${t.name}: ${instr.text} (=${s.vars[instr.var!]})`
      step1(t)
      break
    case 'inc':
      t.regs[instr.reg!] = (t.regs[instr.reg!] ?? 0) + 1
      action = `${t.name}: ${instr.text} (=${t.regs[instr.reg!]})`
      step1(t)
      break
    case 'write':
      s.vars[instr.var!] = t.regs[instr.reg!]
      action = `${t.name}: ${instr.text} (x=${s.vars[instr.var!]})`
      step1(t)
      break
    case 'work':
      action = `${t.name}: ${instr.text}`
      step1(t)
      break
    case 'lock': {
      const L = s.locks[instr.lock!]
      if (L.owner === null) {
        L.owner = tid
        action = `${t.name}: захватил замок ${instr.lock}`
        step1(t)
      } else {
        t.status = 'blocked'
        t.blockedOn = instr.lock
        if (!L.waiters.includes(tid)) L.waiters.push(tid)
        action = `${t.name}: ждёт замок ${instr.lock} (занят: ${s.threads[L.owner].name})`
      }
      break
    }
    case 'unlock': {
      const L = s.locks[instr.lock!]
      if (L.owner === tid) {
        if (L.waiters.length) {
          const nx = L.waiters.shift()!
          L.owner = nx
          wake(s.threads[nx])
          action = `${t.name}: освободил ${instr.lock} → отдал ${s.threads[nx].name}`
        } else {
          L.owner = null
          action = `${t.name}: освободил замок ${instr.lock}`
        }
      } else {
        action = `${t.name}: ${instr.text}`
      }
      step1(t)
      break
    }
    case 'wait': {
      const S = s.sems[instr.sem!]
      if (S.value > 0) {
        S.value--
        action = `${t.name}: ${instr.text} (${instr.sem}=${S.value})`
        step1(t)
      } else {
        t.status = 'blocked'
        t.blockedOn = instr.sem
        if (!S.waiters.includes(tid)) S.waiters.push(tid)
        action = `${t.name}: блокируется на ${instr.sem}=0`
      }
      break
    }
    case 'signal': {
      const S = s.sems[instr.sem!]
      if (S.waiters.length) {
        const nx = S.waiters.shift()!
        wake(s.threads[nx])
        action = `${t.name}: ${instr.text} → разбудил ${s.threads[nx].name}`
      } else {
        S.value++
        action = `${t.name}: ${instr.text} (${instr.sem}=${S.value})`
      }
      step1(t)
      break
    }
    case 'put': {
      const v = (s.vars._prod ?? 0) + 1
      s.vars._prod = v
      s.buffer!.items.push(v)
      action = `${t.name}: положил #${v} (буфер ${s.buffer!.items.length}/${s.buffer!.capacity})`
      step1(t)
      break
    }
    case 'take': {
      const v = s.buffer!.items.shift()
      s.vars._cons = (s.vars._cons ?? 0) + 1
      action = `${t.name}: взял #${v} (буфер ${s.buffer!.items.length}/${s.buffer!.capacity})`
      step1(t)
      break
    }
    case 'barrier': {
      const B = s.barrier!
      if (!B.arrived.includes(tid)) B.arrived.push(tid)
      if (B.arrived.length >= B.needed) {
        B.opened = true
        for (const at of [...B.arrived]) wake(s.threads[at])
        action = `барьер открыт: пришли все ${B.needed} — продолжаем вместе`
      } else {
        t.status = 'blocked'
        t.blockedOn = 'B'
        action = `${t.name}: ждёт на барьере (${B.arrived.length}/${B.needed})`
      }
      break
    }
  }
  s.lastThread = tid
  s.lastAction = action
  return s
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function runnableThreads(s: SyncState): number[] {
  return s.threads.filter((t) => t.status === 'ready').map((t) => t.id)
}

export function isDone(s: SyncState): boolean {
  return s.threads.every((t) => t.status === 'done')
}

export function isDeadlocked(s: SyncState): boolean {
  return !isDone(s) && runnableThreads(s).length === 0
}

export function lostUpdate(s: SyncState): boolean {
  return s.expectedX !== undefined && isDone(s) && s.vars.x < s.expectedX
}

// ---------------------------------------------------------------------------
// Scenario initial states
// ---------------------------------------------------------------------------

const READ: Instr = { op: 'read', var: 'x', reg: 'r', text: 'прочитать x → r' }
const INC: Instr = { op: 'inc', reg: 'r', text: 'r = r + 1' }
const WRITE: Instr = { op: 'write', var: 'x', reg: 'r', text: 'записать x ← r' }

function thread(id: number, name: string, program: Instr[]): ThreadState {
  return { id, name, program, pc: 0, status: 'ready', regs: {} }
}

const base = (scenario: Scenario, threads: ThreadState[]): SyncState => ({
  scenario,
  threads,
  vars: {},
  locks: {},
  sems: {},
  lastThread: null,
  lastAction: 'старт',
})

export interface ScenarioOpts {
  fixed?: boolean
  items?: number
  capacity?: number
}

export function initialState(scenario: Scenario, opts: ScenarioOpts = {}): SyncState {
  switch (scenario) {
    case 'race': {
      const prog = [READ, INC, WRITE]
      const s = base('race', [thread(0, 'Поток 1', prog), thread(1, 'Поток 2', prog)])
      s.vars = { x: 0 }
      s.expectedX = EXPECTED_INCREMENT
      return s
    }
    case 'mutex': {
      const prog: Instr[] = [
        { op: 'lock', lock: 'L', text: 'захватить замок L' },
        READ,
        INC,
        WRITE,
        { op: 'unlock', lock: 'L', text: 'освободить замок L' },
      ]
      const s = base('mutex', [thread(0, 'Поток 1', prog), thread(1, 'Поток 2', prog)])
      s.vars = { x: 0 }
      s.locks = { L: { owner: null, waiters: [] } }
      s.expectedX = EXPECTED_INCREMENT
      return s
    }
    case 'semaphore': {
      const prog: Instr[] = [
        { op: 'wait', sem: 'S', text: 'P(S): захватить' },
        READ,
        INC,
        WRITE,
        { op: 'signal', sem: 'S', text: 'V(S): освободить' },
      ]
      const s = base('semaphore', [thread(0, 'Поток 1', prog), thread(1, 'Поток 2', prog)])
      s.vars = { x: 0 }
      s.sems = { S: { value: 1, waiters: [] } }
      s.expectedX = EXPECTED_INCREMENT
      return s
    }
    case 'prodcons': {
      const items = opts.items ?? 4
      const capacity = opts.capacity ?? 2
      const prod: Instr[] = []
      const cons: Instr[] = []
      for (let i = 0; i < items; i++) {
        prod.push(
          { op: 'wait', sem: 'empty', text: 'P(свободно)' },
          { op: 'put', text: 'положить в буфер' },
          { op: 'signal', sem: 'full', text: 'V(занято)' },
        )
        cons.push(
          { op: 'wait', sem: 'full', text: 'P(занято)' },
          { op: 'take', text: 'взять из буфера' },
          { op: 'signal', sem: 'empty', text: 'V(свободно)' },
        )
      }
      const s = base('prodcons', [thread(0, 'Производитель', prod), thread(1, 'Потребитель', cons)])
      s.vars = { _prod: 0, _cons: 0 }
      s.sems = { empty: { value: capacity, waiters: [] }, full: { value: 0, waiters: [] } }
      s.buffer = { capacity, items: [] }
      return s
    }
    case 'barrier': {
      const prog: Instr[] = [
        { op: 'work', text: 'фаза 1: работа' },
        { op: 'barrier', barrier: 'B', text: 'ждать на барьере' },
        { op: 'work', text: 'фаза 2: работа' },
      ]
      const s = base('barrier', [
        thread(0, 'Поток 1', prog),
        thread(1, 'Поток 2', prog),
        thread(2, 'Поток 3', prog),
      ])
      s.barrier = { needed: 3, arrived: [], opened: false }
      return s
    }
    case 'deadlock': {
      const t0: Instr[] = [
        { op: 'lock', lock: 'A', text: 'захватить A' },
        { op: 'lock', lock: 'B', text: 'захватить B' },
        { op: 'unlock', lock: 'B', text: 'освободить B' },
        { op: 'unlock', lock: 'A', text: 'освободить A' },
      ]
      const t1bad: Instr[] = [
        { op: 'lock', lock: 'B', text: 'захватить B' },
        { op: 'lock', lock: 'A', text: 'захватить A' },
        { op: 'unlock', lock: 'A', text: 'освободить A' },
        { op: 'unlock', lock: 'B', text: 'освободить B' },
      ]
      const t1fixed: Instr[] = [
        { op: 'lock', lock: 'A', text: 'захватить A' },
        { op: 'lock', lock: 'B', text: 'захватить B' },
        { op: 'unlock', lock: 'B', text: 'освободить B' },
        { op: 'unlock', lock: 'A', text: 'освободить A' },
      ]
      const s = base('deadlock', [
        thread(0, 'Поток 1', t0),
        thread(1, 'Поток 2', opts.fixed ? t1fixed : t1bad),
      ])
      s.locks = { A: { owner: null, waiters: [] }, B: { owner: null, waiters: [] } }
      return s
    }
  }
}

// ---------------------------------------------------------------------------
// Schedules / snapshot builders
// ---------------------------------------------------------------------------

export function buildScenarioSnapshots(
  scenario: Scenario,
  schedule: number[],
  opts: ScenarioOpts = {},
): SyncState[] {
  let st = initialState(scenario, opts)
  const snaps: SyncState[] = [st]
  for (const tid of schedule) {
    st = applyStep(st, tid)
    snaps.push(st)
  }
  return snaps
}

/** Drive the scenario to completion (or deadlock) using a thread picker. */
export function autoSchedule(
  scenario: Scenario,
  opts: ScenarioOpts,
  choose: (runnable: number[], step: number) => number,
): number[] {
  let st = initialState(scenario, opts)
  const sched: number[] = []
  let guard = 0
  while (!isDone(st) && !isDeadlocked(st) && guard < 2000) {
    const run = runnableThreads(st)
    if (run.length === 0) break
    const tid = choose(run, guard)
    sched.push(tid)
    st = applyStep(st, tid)
    guard++
  }
  return sched
}

export const roundRobin = (run: number[], step: number): number => run[step % run.length]
export const randomChoice = (run: number[]): number =>
  run[Math.floor(Math.random() * run.length)]

/** Preset interleaving that loses an update in the race scenario. */
export const BAD_RACE_SCHEDULE = [0, 1, 0, 0, 1, 1]
/** Preset safe interleaving (each thread fully, then the other). */
export const GOOD_RACE_SCHEDULE = [0, 0, 0, 1, 1, 1]
