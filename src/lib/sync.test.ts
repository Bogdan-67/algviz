import { describe, it, expect } from 'vitest'
import {
  initialState,
  applyStep,
  buildScenarioSnapshots,
  autoSchedule,
  roundRobin,
  randomChoice,
  runnableThreads,
  isDone,
  isDeadlocked,
  lostUpdate,
  BAD_RACE_SCHEDULE,
  GOOD_RACE_SCHEDULE,
  EXPECTED_INCREMENT,
  type Scenario,
} from './sync'

const finalOf = (snaps: ReturnType<typeof buildScenarioSnapshots>) => snaps[snaps.length - 1]

describe('race condition', () => {
  it('a bad interleaving loses an update (x < expected)', () => {
    const snaps = buildScenarioSnapshots('race', BAD_RACE_SCHEDULE)
    const last = finalOf(snaps)
    expect(isDone(last)).toBe(true)
    expect(last.vars.x).toBe(1)
    expect(last.vars.x).toBeLessThan(EXPECTED_INCREMENT)
    expect(lostUpdate(last)).toBe(true)
  })

  it('a good interleaving gives the correct result', () => {
    const last = finalOf(buildScenarioSnapshots('race', GOOD_RACE_SCHEDULE))
    expect(last.vars.x).toBe(EXPECTED_INCREMENT)
    expect(lostUpdate(last)).toBe(false)
  })

  it('there EXISTS some interleaving that loses an update', () => {
    let foundLost = false
    let foundOk = false
    for (let t = 0; t < 200; t++) {
      const sched = autoSchedule('race', {}, randomChoice)
      const last = finalOf(buildScenarioSnapshots('race', sched))
      if (last.vars.x < EXPECTED_INCREMENT) foundLost = true
      if (last.vars.x === EXPECTED_INCREMENT) foundOk = true
    }
    expect(foundLost).toBe(true)
    expect(foundOk).toBe(true)
  })
})

describe('mutex and binary semaphore — mutual exclusion', () => {
  for (const scenario of ['mutex', 'semaphore'] as Scenario[]) {
    it(`${scenario}: ANY interleaving yields the correct increment`, () => {
      for (let t = 0; t < 300; t++) {
        const sched = autoSchedule(scenario, {}, randomChoice)
        const last = finalOf(buildScenarioSnapshots(scenario, sched))
        expect(isDone(last)).toBe(true)
        expect(last.vars.x).toBe(EXPECTED_INCREMENT)
      }
    })
  }

  it('mutex: while one holds the lock, the other is blocked', () => {
    // T0 acquires L, then T1 tries → blocked.
    let st = initialState('mutex')
    st = applyStep(st, 0) // T0 lock L
    expect(st.locks.L.owner).toBe(0)
    st = applyStep(st, 1) // T1 tries lock L → blocked
    expect(st.threads[1].status).toBe('blocked')
    expect(st.locks.L.waiters).toContain(1)
  })
})

describe('producer–consumer (counting semaphores)', () => {
  it('buffer never overflows or underflows under any interleaving', () => {
    const opts = { items: 5, capacity: 2 }
    for (let t = 0; t < 200; t++) {
      const sched = autoSchedule('prodcons', opts, randomChoice)
      const snaps = buildScenarioSnapshots('prodcons', sched, opts)
      for (const s of snaps) {
        expect(s.buffer!.items.length).toBeGreaterThanOrEqual(0)
        expect(s.buffer!.items.length).toBeLessThanOrEqual(s.buffer!.capacity)
      }
      const last = finalOf(snaps)
      expect(isDone(last)).toBe(true)
      expect(last.vars._prod).toBe(5)
      expect(last.vars._cons).toBe(5)
      expect(last.buffer!.items).toHaveLength(0)
    }
  })
})

describe('barrier', () => {
  it('no thread passes the barrier until all p have arrived', () => {
    const sched = autoSchedule('barrier', {}, roundRobin)
    const snaps = buildScenarioSnapshots('barrier', sched)
    for (const s of snaps) {
      if (!s.barrier!.opened) {
        // pc 2 = the "phase 2" step, only reachable past the barrier
        for (const th of s.threads) expect(th.pc).toBeLessThanOrEqual(1)
      }
    }
    expect(isDone(finalOf(snaps))).toBe(true)
  })

  it('barrier opens exactly when the last thread arrives', () => {
    let st = initialState('barrier')
    st = applyStep(st, 0) // work
    st = applyStep(st, 0) // barrier → blocked
    st = applyStep(st, 1) // work
    st = applyStep(st, 1) // barrier → blocked
    expect(st.barrier!.opened).toBe(false)
    st = applyStep(st, 2) // work
    st = applyStep(st, 2) // barrier → opens
    expect(st.barrier!.opened).toBe(true)
  })
})

describe('deadlock', () => {
  it('bad lock order reaches a state where both threads are blocked', () => {
    const sched = autoSchedule('deadlock', { fixed: false }, roundRobin)
    const last = finalOf(buildScenarioSnapshots('deadlock', sched, { fixed: false }))
    expect(isDeadlocked(last)).toBe(true)
    expect(isDone(last)).toBe(false)
    expect(last.threads.every((t) => t.status === 'blocked')).toBe(true)
  })

  it('classic circular wait: T0 holds A waits B, T1 holds B waits A', () => {
    let st = initialState('deadlock', { fixed: false })
    st = applyStep(st, 0) // T0 lock A
    st = applyStep(st, 1) // T1 lock B
    st = applyStep(st, 0) // T0 lock B → blocked
    st = applyStep(st, 1) // T1 lock A → blocked
    expect(isDeadlocked(st)).toBe(true)
    expect(st.locks.A.owner).toBe(0)
    expect(st.locks.B.owner).toBe(1)
  })

  it('fixed (same lock order) runs to completion under any interleaving', () => {
    for (let t = 0; t < 200; t++) {
      const sched = autoSchedule('deadlock', { fixed: true }, randomChoice)
      const last = finalOf(buildScenarioSnapshots('deadlock', sched, { fixed: true }))
      expect(isDeadlocked(last)).toBe(false)
      expect(isDone(last)).toBe(true)
    }
  })
})

describe('queries', () => {
  it('runnableThreads excludes blocked and done', () => {
    let st = initialState('mutex')
    st = applyStep(st, 0)
    st = applyStep(st, 1) // T1 blocked
    expect(runnableThreads(st)).toEqual([0])
  })
})
