import { useCallback, useEffect, useMemo, useState } from 'react'
import { genAccesses, buildAccessSnapshots, type Arch } from '../lib/memarch'
import { MemoryControls } from '../components/memarch/MemoryControls'
import { UmaDiagram } from '../components/memarch/UmaDiagram'
import { NumaDiagram } from '../components/memarch/NumaDiagram'
import { MetricsPanel } from '../components/memarch/MetricsPanel'
import { ScalabilityChart } from '../components/memarch/ScalabilityChart'
import { CompareNote } from '../components/memarch/CompareNote'

export function MemoryArchPage() {
  const [arch, setArch] = useState<Arch>('uma')
  const [p, setP] = useState(4)
  const [locality, setLocality] = useState(0.7)
  const [count, setCount] = useState(16)
  const [busLoad, setBusLoad] = useState(true)
  const [seed, setSeed] = useState(0) // bump to regenerate accesses
  const [stepIndex, setStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(650)

  // Regenerate the access stream whenever inputs change (or Generate is pressed).
  const snapshots = useMemo(() => {
    const accesses = genAccesses(arch, p, locality, count, busLoad)
    return buildAccessSnapshots(arch, p, accesses)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arch, p, locality, count, busLoad, seed])

  const totalSteps = snapshots.length
  const safeStep = Math.min(stepIndex, totalSteps - 1)
  const current = snapshots[safeStep]
  const atStart = stepIndex <= 0
  const atEnd = stepIndex >= totalSteps - 1

  // Reset position when the stream is rebuilt.
  useEffect(() => {
    setStepIndex(0)
    setIsPlaying(false)
  }, [arch, p, locality, count, busLoad, seed])

  const goNext = useCallback(() => setStepIndex((s) => Math.min(s + 1, totalSteps - 1)), [totalSteps])
  const goPrev = useCallback(() => setStepIndex((s) => Math.max(0, s - 1)), [])
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Архитектура памяти: SMP/UMA против NUMA</h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          <strong>SMP</strong> (Symmetric Multiprocessing — симметричная мультипроцессорность),{' '}
          <strong>UMA</strong> (Uniform Memory Access — однородный доступ): единая память через общую
          шину, одинаковое время. <strong>NUMA</strong> (Non-Uniform Memory Access — неоднородный
          доступ): память распределена по узлам, локальный доступ быстрее удалённого. Модельные
          задержки, не реальные замеры.
        </p>
      </header>

      <MemoryControls
        arch={arch}
        onArch={setArch}
        p={p}
        onP={setP}
        locality={locality}
        onLocality={setLocality}
        count={count}
        onCount={setCount}
        busLoad={busLoad}
        onBusLoad={setBusLoad}
        onGenerate={() => setSeed((s) => s + 1)}
        stepIndex={safeStep}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        atStart={atStart}
        atEnd={atEnd}
        onPrev={goPrev}
        onNext={goNext}
        onPlayToggle={togglePlay}
        onReset={() => {
          setStepIndex(0)
          setIsPlaying(false)
        }}
        speedMs={speedMs}
        onSpeedChange={setSpeedMs}
      />

      <div className="rounded-xl border border-slate-200 bg-white/70 p-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
        <span className="font-semibold">Обращение {safeStep}:</span> {current.caption}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
              Схема {arch === 'uma' ? 'UMA (SMP) — общая шина и память' : 'NUMA — узлы и interconnect'}
            </h2>
            {arch === 'uma' ? (
              <UmaDiagram snapshot={current} showBusLoad={busLoad} />
            ) : (
              <NumaDiagram snapshot={current} />
            )}
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
              Масштабируемость: средняя задержка от p
            </h2>
            <ScalabilityChart pMax={8} locality={locality} currentP={p} />
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <MetricsPanel snapshot={current} locality={locality} />
          <CompareNote />
        </aside>
      </div>

      <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Стрелки ← → — обращения · Пробел — авто/пауза · симуляция, всё локально
      </footer>
    </div>
  )
}
