export function CompareNote() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        UMA/SMP против NUMA
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            UMA / SMP (Uniform Memory Access)
          </span>
          <p className="mt-1 text-[12px] leading-snug text-slate-600 dark:text-slate-300">
            Единая память, одинаковое время доступа, просто программировать. Узкое место — общая
            шина: плохо масштабируется (единицы–десятки процессоров).
          </p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            NUMA (Non-Uniform Memory Access)
          </span>
          <p className="mt-1 text-[12px] leading-snug text-slate-600 dark:text-slate-300">
            Распределённая, но логически общая память; единое адресное пространство с аппаратной
            когерентностью (cc-NUMA, cache-coherent NUMA). Масштабируется лучше, но требует заботы о
            локальности данных.
          </p>
        </div>
      </div>
      <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
        Отличие от систем с распределённой памятью (MPP / кластеры): там память изолирована и обмен
        идёт явными сообщениями, а в NUMA адресное пространство единое.
      </p>
    </div>
  )
}
