import { amdahlLimit } from '../../lib/speedup'

interface Show {
  amdahl: boolean
  gustafson: boolean
  ideal: boolean
}

interface SpeedupControlsProps {
  f: number
  onF: (f: number) => void
  pMax: number
  onPMax: (p: number) => void
  currentP: number
  onCurrentP: (p: number) => void
  show: Show
  onToggle: (k: keyof Show) => void
  xLog: boolean
  onXLog: (v: boolean) => void
}

const P_MAX_OPTIONS = [16, 64, 256, 1024]
const PRESETS: Array<{ label: string; f: number }> = [
  { label: 'Кэннон ≈2%', f: 0.02 },
  { label: 'JOIN ≈5%', f: 0.05 },
  { label: 'сортировка ≈10%', f: 0.1 },
  { label: 'тяжёлая серия 30%', f: 0.3 },
]

const toggleBtn = (on: boolean) =>
  `rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
    on
      ? 'border-sky-500 bg-sky-500 text-white'
      : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
  }`
const chip =
  'rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-100 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-300'

export function SpeedupControls({
  f,
  onF,
  pMax,
  onPMax,
  currentP,
  onCurrentP,
  show,
  onToggle,
  xLog,
  onXLog,
}: SpeedupControlsProps) {
  const limit = amdahlLimit(f)
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* f */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Доля серийного кода f = <span className="font-mono">{f.toFixed(2)}</span> · предел 1/f ={' '}
            <span className="font-mono">{Number.isFinite(limit) ? `${limit.toFixed(1)}×` : '∞'}</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={0.5}
              step={0.01}
              value={f}
              onChange={(e) => onF(parseFloat(e.target.value))}
              className="flex-1 accent-sky-500"
              aria-label="Доля серийного кода"
            />
            <input
              type="number"
              min={0}
              max={1}
              step={0.01}
              value={f}
              onChange={(e) => onF(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0)))}
              className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
        </label>

        {/* current p */}
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          <span>
            Текущее p = <span className="font-mono">{Math.round(currentP)}</span>
          </span>
          <input
            type="range"
            min={1}
            max={pMax}
            value={currentP}
            onChange={(e) => onCurrentP(parseInt(e.target.value, 10))}
            className="accent-sky-500"
            aria-label="Текущее число процессоров"
          />
        </label>

        {/* pMax + axis */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            Макс. p
            <select
              value={pMax}
              onChange={(e) => onPMax(parseInt(e.target.value, 10))}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 font-mono text-sm dark:border-slate-600 dark:bg-slate-800"
            >
              {P_MAX_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            <span className="ml-2">ось p:</span>
            <button className={toggleBtn(!xLog)} onClick={() => onXLog(false)}>
              лин
            </button>
            <button className={toggleBtn(xLog)} onClick={() => onXLog(true)}>
              log
            </button>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700/60">
        <span className="text-[11px] font-medium text-slate-400">кривые:</span>
        <button className={toggleBtn(show.amdahl)} onClick={() => onToggle('amdahl')}>
          Амдал
        </button>
        <button className={toggleBtn(show.gustafson)} onClick={() => onToggle('gustafson')}>
          Густафсон
        </button>
        <button className={toggleBtn(show.ideal)} onClick={() => onToggle('ideal')}>
          Идеал S = p
        </button>
        <span className="ml-3 text-[11px] font-medium text-slate-400">пресеты f:</span>
        {PRESETS.map((pre) => (
          <button key={pre.label} className={chip} onClick={() => onF(pre.f)}>
            {pre.label}
          </button>
        ))}
      </div>
    </div>
  )
}
