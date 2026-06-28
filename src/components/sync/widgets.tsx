import type { SyncState } from '../../lib/sync'
import { isDone, lostUpdate } from '../../lib/sync'
import { fragmentColor } from '../fragmentColor'

const card =
  'flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50'

function nameOf(state: SyncState, id: number | null): string {
  return id === null ? '—' : state.threads[id].name
}

export function SharedVarWidget({ state }: { state: SyncState }) {
  const done = isDone(state)
  const lost = lostUpdate(state)
  const correct = done && state.expectedX !== undefined && state.vars.x === state.expectedX
  return (
    <div className={card}>
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Общая переменная x
      </h3>
      <div className="flex items-end gap-4">
        <span className="font-mono text-4xl font-bold text-slate-800 dark:text-slate-100">
          {state.vars.x ?? 0}
        </span>
        {state.expectedX !== undefined && (
          <span className="pb-1 text-xs text-slate-400">ожидается {state.expectedX}</span>
        )}
      </div>
      {done && state.expectedX !== undefined && (
        <span
          role="status"
          className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            correct
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
          }`}
        >
          {correct ? '✓ итог верный' : `✗ потеряно обновление (x=${state.vars.x})`}
        </span>
      )}
      {lost && (
        <p className="text-[11px] text-rose-500">
          Оба потока прочитали одно значение до записи — одно обновление потерялось.
        </p>
      )}
    </div>
  )
}

export function LockWidget({ state, id }: { state: SyncState; id: string }) {
  const L = state.locks[id]
  if (!L) return null
  const ownerColor = L.owner === null ? undefined : fragmentColor(L.owner)
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Замок {id}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            L.owner === null
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
          }`}
          style={ownerColor?.chip}
        >
          {L.owner === null ? 'свободен' : `занят: ${nameOf(state, L.owner)}`}
        </span>
      </div>
      <span className="text-[10px] text-slate-400">
        очередь: {L.waiters.length ? L.waiters.map((w) => nameOf(state, w)).join(', ') : '—'}
      </span>
    </div>
  )
}

export function SemaphoreWidget({ state, id, label }: { state: SyncState; id: string; label?: string }) {
  const S = state.sems[id]
  if (!S) return null
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Семафор {label ?? id}
        </span>
        <span className="font-mono text-lg font-bold text-slate-800 dark:text-slate-100">{S.value}</span>
      </div>
      <span className="text-[10px] text-slate-400">
        ждут: {S.waiters.length ? S.waiters.map((w) => nameOf(state, w)).join(', ') : '—'}
      </span>
    </div>
  )
}

export function BufferWidget({ state }: { state: SyncState }) {
  const b = state.buffer
  if (!b) return null
  return (
    <div className={card}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Ограниченный буфер
        </h3>
        <span className="text-xs text-slate-400">
          {b.items.length}/{b.capacity}
        </span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: b.capacity }, (_, i) => {
          const v = b.items[i]
          const filled = v !== undefined
          return (
            <div
              key={i}
              className={`flex h-10 w-10 items-center justify-center rounded-md border font-mono text-sm tabular-nums ${
                filled
                  ? 'border-sky-400 bg-sky-100 text-sky-700 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200'
                  : 'border-slate-200 bg-slate-50 text-slate-300 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-600'
              }`}
            >
              {filled ? `#${v}` : '·'}
            </div>
          )
        })}
      </div>
      <span className="text-[11px] text-slate-400">
        произведено {state.vars._prod ?? 0} · потреблено {state.vars._cons ?? 0}
      </span>
    </div>
  )
}

export function BarrierWidget({ state }: { state: SyncState }) {
  const B = state.barrier
  if (!B) return null
  return (
    <div className={card}>
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Барьер
      </h3>
      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-bold text-slate-800 dark:text-slate-100">
          {B.arrived.length}/{B.needed}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            B.opened
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-400/20 dark:text-amber-200'
          }`}
        >
          {B.opened ? 'открыт — все идут дальше' : 'ждём остальных'}
        </span>
      </div>
      <div className="flex flex-wrap gap-1">
        {state.threads.map((t) => {
          const arrived = B.arrived.includes(t.id)
          const color = fragmentColor(t.id)
          return (
            <span
              key={t.id}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={arrived ? color.chip : undefined}
            >
              {t.name}: {arrived ? '✓ пришёл' : '…'}
            </span>
          )
        })}
      </div>
    </div>
  )
}
