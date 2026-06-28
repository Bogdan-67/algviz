import type { Fragment, Row } from '../../lib/join'
import { fragmentColor } from '../fragmentColor'

interface FragmentationSchemaProps {
  fragments: Fragment[]
  a: Row[]
  b: Row[]
}

function keyOwner(fragments: Fragment[]): Map<string, number> {
  const m = new Map<string, number>()
  fragments.forEach((f) => f.keys.forEach((k) => m.set(k, f.id)))
  return m
}

function RowList({ title, rows, owner }: { title: string; rows: Row[]; owner: Map<string, number> }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {title} · {rows.length} строк
      </span>
      <div className="flex flex-wrap gap-1">
        {rows.map((r, i) => {
          const fid = owner.get(r.key)
          const color = fid === undefined ? undefined : fragmentColor(fid)
          return (
            <span
              key={`${r.key}-${i}`}
              className="rounded border px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-slate-700 dark:text-slate-200"
              style={color?.chip}
              title={fid === undefined ? undefined : `Фрагмент ${fid}`}
            >
              {r.key}:{r.val}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function FragmentationSchema({ fragments, a, b }: FragmentationSchemaProps) {
  const owner = keyOwner(fragments)
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Горизонтальная фрагментация (шардирование по ключу)
        </h2>
        <span className="text-xs text-slate-400">диапазоны ключей не пересекаются</span>
      </div>

      {/* Fragment legend with disjoint key ranges */}
      <div className="flex flex-wrap gap-2">
        {fragments.map((f) => {
          const color = fragmentColor(f.id)
          const range =
            f.keys.length === 0
              ? '∅'
              : f.keys.length === 1
                ? f.keys[0]
                : `${f.keys[0]} … ${f.keys[f.keys.length - 1]}`
          return (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
              style={color.chip}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: color.solid }}
                aria-hidden
              />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                  Фрагмент {f.id}
                </span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-300">
                  {range} · {f.keys.length} кл.
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <RowList title="Таблица A (ключ:b)" rows={a} owner={owner} />
        <RowList title="Таблица B (ключ:c)" rows={b} owner={owner} />
      </div>
    </div>
  )
}
