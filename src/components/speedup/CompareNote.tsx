export function CompareNote() {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Амдал против Густафсона
      </h3>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-500/30 dark:bg-sky-500/10">
          <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Амдал — strong scaling</span>
          <p className="mt-1 text-[12px] leading-snug text-slate-600 dark:text-slate-300">
            Фиксирует <span className="font-semibold">размер задачи</span>: насколько быстрее её
            решить? Упирается в потолок 1/f — серийная часть не ускоряется.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Густафсон — weak scaling</span>
          <p className="mt-1 text-[12px] leading-snug text-slate-600 dark:text-slate-300">
            Фиксирует <span className="font-semibold">время</span>: насколько бо́льшую задачу решить
            за то же время? Растёт почти линейно — с ростом задачи доля f «размывается».
          </p>
        </div>
      </div>
      <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
        Это не противоречие, а два разных вопроса об одном и том же. Тот же показатель S(p) считается
        на других страницах как «последовательное время / параллельное время».
      </p>
    </div>
  )
}
