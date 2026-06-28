import { amdahl, gustafson, efficiency, amdahlLimit } from '../../lib/speedup'

interface NumbersPanelProps {
  f: number
  p: number
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
      <span className={`font-mono text-lg font-semibold ${accent ?? 'text-slate-800 dark:text-slate-100'}`}>
        {value}
      </span>
      {hint && <span className="text-[10px] text-slate-400">{hint}</span>}
    </div>
  )
}

export function NumbersPanel({ f, p }: NumbersPanelProps) {
  const sa = amdahl(f, p)
  const sg = gustafson(f, p)
  const eff = efficiency(sa, p)
  const limit = amdahlLimit(f)
  const pInt = Math.round(p)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Числа для f = {f.toFixed(2)}, p = {pInt}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Ускорение (Амдал)" value={`${sa.toFixed(2)}×`} accent="text-sky-600 dark:text-sky-300" hint="strong scaling" />
        <Stat label="Ускорение (Густафсон)" value={`${sg.toFixed(2)}×`} accent="text-amber-600 dark:text-amber-300" hint="weak scaling" />
        <Stat label="Эффективность" value={`${(eff * 100).toFixed(0)}%`} hint="E = S/p" />
        <Stat label="Предел Амдала" value={Number.isFinite(limit) ? `${limit.toFixed(1)}×` : '∞'} hint="1/f, при p → ∞" />
      </div>
      <p className="rounded-lg bg-sky-50 px-3 py-2 text-[12px] leading-snug text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
        {f > 0
          ? `При f = ${(f * 100).toFixed(0)}% предел ускорения ×${limit.toFixed(1)} — сколько бы процессоров ни добавляли.`
          : 'При f = 0 ускорение идеально линейное: предел отсутствует.'}
      </p>
    </div>
  )
}
