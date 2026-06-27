import { divisors } from '../lib/cannon'

interface ProcessorSelectProps {
  n: number
  q: number
  onQChange: (q: number) => void
}

/**
 * Lets the user pick the number of logical processors p = q², where q (the grid
 * dimension) must divide N. Shows derived q×q grid and b×b block size, plus the
 * "this is a simulation of logical processors" clarification.
 */
export function ProcessorSelect({ n, q, onQChange }: ProcessorSelectProps) {
  const options = divisors(n).map((d) => ({ q: d, p: d * d, b: n / d }))
  const b = n / q

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>Число процессоров (логических потоков)</span>
          <select
            value={q}
            onChange={(e) => onQChange(parseInt(e.target.value, 10))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-sky-400/60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            aria-label="Число процессоров"
          >
            {options.map((o) => (
              <option key={o.q} value={o.q}>
                {o.p} процессоров (сетка {o.q}×{o.q}, блок {o.b}×{o.b})
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <Stat label="Сетка" value={`${q}×${q}`} />
          <Stat label="Процессоров p = q²" value={`${q * q}`} />
          <Stat label="Размер блока" value={`${b}×${b}`} />
          <Stat label="Шагов умножения" value={`${q}`} />
        </div>
      </div>

      <p className="rounded-lg bg-slate-100/70 px-3 py-2 text-sm font-medium text-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
        Матрица {n}×{n}, сетка {q}×{q} процессоров, у каждого блок {b}×{b} элементов.
      </p>

      <div className="flex flex-col gap-1 text-[12px] leading-snug text-slate-500 dark:text-slate-400">
        <p>
          <span className="font-semibold text-slate-600 dark:text-slate-300">«Процессор»</span> здесь
          — логическая единица модели: ему поручён один блок матрицы, это не обязательно
          отдельное ядро CPU.
        </p>
        <p>
          Это <span className="font-semibold text-slate-600 dark:text-slate-300">симуляция</span>:
          приложение не запускает {q * q} реальных потоков ОС, а в обычном цикле рисует, что
          процессоры делали бы, работая параллельно.
        </p>
        <p className="text-slate-400 dark:text-slate-500">
          Частные случаи: q = N — поэлементный режим (блок 1×1); q = 1 — один процессор и обычное
          последовательное умножение.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  )
}
