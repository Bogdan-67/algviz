import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  generateData,
  shardByKey,
  naiveJoin,
  resultsEqual,
  buildJoinSnapshots,
  computeMetrics,
  finalJoinResult,
  type Row,
  type Fragment,
  type JoinMethod,
} from '../lib/join'
import { JoinControls } from '../components/join/JoinControls'
import { FragmentationSchema } from '../components/join/FragmentationSchema'
import { FragmentLanes } from '../components/join/FragmentLanes'
import { ResultTable } from '../components/join/ResultTable'
import { MetricsPanel } from '../components/join/MetricsPanel'
import { MethodComparison } from '../components/join/MethodComparison'

const N0 = 12
const P0 = 3

export function JoinPage() {
  const [n, setN] = useState(N0)
  const [p, setP] = useState(P0)
  const [skew, setSkew] = useState(0.4)
  const [method, setMethod] = useState<JoinMethod>('scoop')
  const [data, setData] = useState<{ a: Row[]; b: Row[] }>(() => {
    const gen = generateData(N0, P0, 0.4)
    return { a: gen.a, b: gen.b }
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(700)

  // Fragments depend on data + p + skew; snapshots on fragments + method.
  const fragments = useMemo<Fragment[]>(
    () => shardByKey(data.a, data.b, p, skew),
    [data, p, skew],
  )
  const snapshots = useMemo(() => buildJoinSnapshots(fragments, method), [fragments, method])
  const metrics = useMemo(() => computeMetrics(fragments, method), [fragments, method])
  const reference = useMemo(() => naiveJoin(data.a, data.b), [data])

  const totalSteps = snapshots.length
  const current = snapshots[Math.min(stepIndex, totalSteps - 1)]
  const atStart = stepIndex <= 0
  const atEnd = stepIndex >= totalSteps - 1
  const isCorrect = resultsEqual(finalJoinResult(snapshots), reference)

  const regenerate = useCallback((size: number, frags: number, sk: number) => {
    const gen = generateData(size, frags, sk)
    setData({ a: gen.a, b: gen.b })
    setStepIndex(0)
    setIsPlaying(false)
  }, [])

  const handleN = useCallback((v: number) => {
    setN(v)
    regenerate(v, p, skew)
  }, [regenerate, p, skew])
  const handleP = useCallback((v: number) => {
    setP(v)
    setStepIndex(0)
    setIsPlaying(false)
  }, [])
  const handleSkew = useCallback((v: number) => {
    setSkew(v)
    setStepIndex(0)
    setIsPlaying(false)
  }, [])
  const handleMethod = useCallback((m: JoinMethod) => {
    setMethod(m)
    setStepIndex(0)
    setIsPlaying(false)
  }, [])
  const handleRandom = useCallback(() => regenerate(n, p, skew), [regenerate, n, p, skew])

  const goNext = useCallback(() => setStepIndex((s) => Math.min(s + 1, totalSteps - 1)), [totalSteps])
  const goPrev = useCallback(() => setStepIndex((s) => Math.max(s - 1, 0)), [])
  const reset = useCallback(() => {
    setStepIndex(0)
    setIsPlaying(false)
  }, [])
  const togglePlay = useCallback(() => {
    setIsPlaying((pl) => {
      if (!pl && atEnd) setStepIndex(0)
      return !pl
    })
  }, [atEnd])

  useEffect(() => {
    if (!isPlaying) return
    if (atEnd) {
      setIsPlaying(false)
      return
    }
    const id = setTimeout(() => setStepIndex((s) => Math.min(s + 1, totalSteps - 1)), speedMs)
    return () => clearTimeout(id)
  }, [isPlaying, stepIndex, atEnd, speedMs, totalSteps])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      } else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goNext, goPrev, togglePlay])

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Параллельный JOIN</h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Симуляция параллельного соединения таблиц A(ключ,b) и B(ключ,c) поверх горизонтально
          фрагментированных данных. Ключи шардируются по непересекающимся диапазонам → каждый
          фрагмент соединяется независимо. JOIN считает Σ(b·c) по совпавшим ключам. Это симуляция —
          реальных потоков ОС и БД нет.
        </p>
      </header>

      <FragmentationSchema fragments={fragments} a={data.a} b={data.b} />

      <JoinControls
        n={n}
        onNChange={handleN}
        p={p}
        onPChange={handleP}
        skew={skew}
        onSkewChange={handleSkew}
        method={method}
        onMethodChange={handleMethod}
        onRandom={handleRandom}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        atStart={atStart}
        atEnd={atEnd}
        onPrev={goPrev}
        onNext={goNext}
        onPlayToggle={togglePlay}
        onReset={reset}
        speedMs={speedMs}
        onSpeedChange={setSpeedMs}
      />

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        <span className="font-semibold">Шаг {stepIndex} из {totalSteps - 1}:</span> {current.caption}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <FragmentLanes
          snapshot={current}
          fragments={fragments}
          perExecutor={metrics.perExecutor}
          bottleneck={metrics.bottleneckFragment}
        />
        <aside className="flex flex-col gap-5">
          <ResultTable
            result={current.result}
            expectedCount={reference.length}
            isCorrect={isCorrect}
          />
          <MetricsPanel metrics={metrics} />
          <MethodComparison active={method} />
        </aside>
      </div>

      <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Стрелки ← → — шаги · Пробел — авто/пауза · симуляция, всё локально, без сети
      </footer>
    </div>
  )
}
