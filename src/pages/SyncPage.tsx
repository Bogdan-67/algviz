import { useCallback, useEffect, useMemo, useState } from 'react'
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
  BAD_RACE_SCHEDULE,
  GOOD_RACE_SCHEDULE,
  type Scenario,
  type SyncState,
} from '../lib/sync'
import { ScenarioPicker } from '../components/sync/ScenarioPicker'
import { SyncControls } from '../components/sync/SyncControls'
import { ThreadLanes } from '../components/sync/ThreadLanes'
import { WaitGraph } from '../components/sync/WaitGraph'
import {
  SharedVarWidget,
  LockWidget,
  SemaphoreWidget,
  BufferWidget,
  BarrierWidget,
} from '../components/sync/widgets'

const SCENARIO_INTRO: Record<Scenario, string> = {
  race: 'Инкремент x = «прочитать → +1 → записать» (3 шага). При плохом чередовании оба читают одно значение — обновление теряется.',
  mutex: 'Критическая секция под мьютексом: пока один держит замок, другой ждёт. Освобождает замок тот же поток, что захватил. Потерь нет.',
  semaphore: 'Двоичный семафор S=1 как взаимное исключение: P(S) захватывает, V(S) освобождает. Сравните с мьютексом.',
  prodcons: 'Считающие семафоры: «свободно» (места) и «занято» (товары). Производитель ждёт свободное место, потребитель — товар. Буфер не переполняется и не читается пустым.',
  barrier: 'Фазовая синхронизация: потоки делают фазу 1 и ждут на барьере; когда пришли все p — барьер открывается и все идут в фазу 2 одновременно.',
  deadlock: 'Два потока, два замка. Условия deadlock: взаимное исключение, удержание-и-ожидание, отсутствие вытеснения, круговое ожидание. «Исправление» снимает круговое ожидание — единый порядок захвата.',
}

export function SyncPage() {
  const [scenario, setScenario] = useState<Scenario>('race')
  const [fixed, setFixed] = useState(false)
  const [snapshots, setSnapshots] = useState<SyncState[]>(() => [initialState('race')])
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(700)

  const current = snapshots[Math.min(stepIndex, snapshots.length - 1)]
  const run = useMemo(() => runnableThreads(current), [current])
  const done = isDone(current)
  const deadlocked = isDeadlocked(current)
  const atStart = stepIndex <= 0
  const canReplay = stepIndex < snapshots.length - 1
  const canAdvance = canReplay || run.length > 0

  const setTimeline = useCallback((snaps: SyncState[]) => {
    setSnapshots(snaps)
    setStepIndex(0)
    setIsPlaying(false)
  }, [])

  const resetScenario = useCallback(
    (s: Scenario, fix: boolean) => setTimeline([initialState(s, { fixed: fix })]),
    [setTimeline],
  )

  const handleScenario = useCallback(
    (s: Scenario) => {
      setScenario(s)
      setFixed(false)
      resetScenario(s, false)
    },
    [resetScenario],
  )

  const doStep = useCallback(
    (tid: number) => {
      const base = snapshots[stepIndex]
      const ns = applyStep(base, tid)
      setSnapshots((prev) => [...prev.slice(0, stepIndex + 1), ns])
      setStepIndex(stepIndex + 1)
    },
    [snapshots, stepIndex],
  )

  const randomStep = useCallback(() => {
    if (run.length > 0) doStep(randomChoice(run))
  }, [run, doStep])

  const onForward = useCallback(() => {
    if (canReplay) setStepIndex((i) => i + 1)
    else randomStep()
  }, [canReplay, randomStep])

  const onPrev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), [])

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), [])

  // auto-play
  useEffect(() => {
    if (!isPlaying) return
    const cur = snapshots[stepIndex]
    const replay = stepIndex < snapshots.length - 1
    const r = runnableThreads(cur)
    if (!replay && r.length === 0) {
      setIsPlaying(false)
      return
    }
    const id = setTimeout(() => {
      if (replay) setStepIndex((i) => i + 1)
      else doStep(randomChoice(r))
    }, speedMs)
    return () => clearTimeout(id)
  }, [isPlaying, stepIndex, snapshots, speedMs, doStep])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onForward()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onForward, onPrev, togglePlay])

  // scenario-specific presets
  const presets = useMemo(() => {
    const list: Array<{ label: string; onClick: () => void }> = []
    if (scenario === 'race') {
      list.push(
        { label: '⚠ плохое чередование', onClick: () => setTimeline(buildScenarioSnapshots('race', BAD_RACE_SCHEDULE)) },
        { label: '✓ безопасное чередование', onClick: () => setTimeline(buildScenarioSnapshots('race', GOOD_RACE_SCHEDULE)) },
      )
    }
    if (scenario === 'deadlock') {
      list.push({
        label: '▶ проиграть (round-robin)',
        onClick: () =>
          setTimeline(
            buildScenarioSnapshots('deadlock', autoSchedule('deadlock', { fixed }, roundRobin), { fixed }),
          ),
      })
    }
    if (['mutex', 'semaphore', 'prodcons', 'barrier'].includes(scenario)) {
      list.push({
        label: '▶ случайно до конца',
        onClick: () =>
          setTimeline(buildScenarioSnapshots(scenario, autoSchedule(scenario, {}, randomChoice))),
      })
    }
    return list
  }, [scenario, fixed, setTimeline])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Синхронизация потоков</h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Пошаговая симуляция чередования шагов нескольких потоков. Выбирай, какой поток делает
          следующий шаг (или случайный планировщик), и наблюдай за общими ресурсами. Реальных
          потоков ОС нет — проигрываем interleaving.
        </p>
      </header>

      <ScenarioPicker scenario={scenario} onPick={handleScenario} />

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-[13px] leading-snug text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        {SCENARIO_INTRO[scenario]}
      </div>

      <SyncControls
        stepIndex={stepIndex}
        totalSteps={snapshots.length}
        isPlaying={isPlaying}
        atStart={atStart}
        canAdvance={canAdvance}
        onPrev={onPrev}
        onForward={onForward}
        onRandomStep={randomStep}
        onPlayToggle={togglePlay}
        onReset={() => resetScenario(scenario, fixed)}
        speedMs={speedMs}
        onSpeedChange={setSpeedMs}
        presets={presets}
      />

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        <span className="font-semibold">Шаг {stepIndex}:</span> {current.lastAction}
        {deadlocked && <span className="ml-2 font-semibold text-rose-600">— deadlock: все потоки стоят</span>}
        {done && <span className="ml-2 font-semibold text-emerald-600">— все потоки завершены</span>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
            Потоки (псевдокод, текущий шаг подсвечен)
          </h2>
          <ThreadLanes state={current} onStep={doStep} />
        </section>

        <aside className="flex flex-col gap-5">
          {(scenario === 'race' || scenario === 'mutex' || scenario === 'semaphore') && (
            <SharedVarWidget state={current} />
          )}
          {scenario === 'mutex' && (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Замок</h3>
              <LockWidget state={current} id="L" />
            </div>
          )}
          {scenario === 'semaphore' && (
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Семафор</h3>
              <SemaphoreWidget state={current} id="S" />
            </div>
          )}
          {scenario === 'prodcons' && (
            <>
              <BufferWidget state={current} />
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Семафоры</h3>
                <SemaphoreWidget state={current} id="empty" label="свободно" />
                <SemaphoreWidget state={current} id="full" label="занято" />
              </div>
            </>
          )}
          {scenario === 'barrier' && <BarrierWidget state={current} />}
          {scenario === 'deadlock' && (
            <>
              <WaitGraph state={current} />
              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Замки</h3>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={fixed}
                      onChange={(e) => {
                        setFixed(e.target.checked)
                        resetScenario('deadlock', e.target.checked)
                      }}
                      className="accent-sky-500"
                    />
                    исправить (единый порядок A→B)
                  </label>
                </div>
                <LockWidget state={current} id="A" />
                <LockWidget state={current} id="B" />
                <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                  Исправление снимает <span className="font-semibold">круговое ожидание</span>: оба
                  потока берут замки в одном порядке — цикл невозможен.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>

      <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Стрелки ← → — шаги · Пробел — авто/пауза · «▶ шаг» в дорожке — ручной выбор потока · симуляция
      </footer>
    </div>
  )
}
