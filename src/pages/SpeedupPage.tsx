import { useState } from 'react'
import { SpeedupControls } from '../components/speedup/SpeedupControls'
import { SpeedupChart } from '../components/speedup/SpeedupChart'
import { EfficiencyChart } from '../components/speedup/EfficiencyChart'
import { TimeSplitBar } from '../components/speedup/TimeSplitBar'
import { NumbersPanel } from '../components/speedup/NumbersPanel'
import { CompareNote } from '../components/speedup/CompareNote'

export function SpeedupPage() {
  const [f, setF] = useState(0.1)
  const [pMax, setPMax] = useState(64)
  const [currentP, setCurrentP] = useState(16)
  const [show, setShow] = useState({ amdahl: true, gustafson: true, ideal: true })
  const [xLog, setXLog] = useState(false)

  const handlePMax = (v: number) => {
    setPMax(v)
    if (currentP > v) setCurrentP(v)
  }
  const toggle = (k: keyof typeof show) => setShow((s) => ({ ...s, [k]: !s[k] }))

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ускорение: Амдал и Густафсон</h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Ускорение при распараллеливании ограничено серийной долей f. Амдал даёт потолок 1/f при
          фиксированном размере задачи; Густафсон — почти линейный рост, когда задача растёт вместе
          с числом процессоров. Меняй f и p — всё пересчитывается вживую.
        </p>
      </header>

      <SpeedupControls
        f={f}
        onF={setF}
        pMax={pMax}
        onPMax={handlePMax}
        currentP={currentP}
        onCurrentP={setCurrentP}
        show={show}
        onToggle={toggle}
        xLog={xLog}
        onXLog={setXLog}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
              Ускорение S(p)
            </h2>
            <SpeedupChart f={f} pMax={pMax} xLog={xLog} show={show} currentP={currentP} />
          </section>
          <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
              Эффективность E(p)
            </h2>
            <EfficiencyChart f={f} pMax={pMax} xLog={xLog} currentP={currentP} />
          </section>
        </div>

        <aside className="flex flex-col gap-5">
          <NumbersPanel f={f} p={currentP} />
          <TimeSplitBar f={f} p={currentP} />
        </aside>
      </div>

      <CompareNote />

      <footer className="pb-4 text-center text-xs text-slate-400 dark:text-slate-600">
        Амдал — strong scaling (потолок 1/f) · Густафсон — weak scaling (почти линейно) · всё локально
      </footer>
    </div>
  )
}
