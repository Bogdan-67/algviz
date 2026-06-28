import type { JoinMethod } from '../../lib/join'

interface MethodComparisonProps {
  active: JoinMethod
}

const ROWS: Array<{ id: JoinMethod | 'common'; title: string; text: string }> = [
  {
    id: 'sp',
    title: 'СУБД-соединение (SP JOIN)',
    text: 'Тяжёлую работу делает движок БД (использует индексы). Приложение лишь параллельно раздаёт запрос по фрагментам и ждёт на барьере.',
  },
  {
    id: 'scoop',
    title: 'Соединение в приложении (черпак)',
    text: 'Алгоритм соединения реализует само приложение: слияние двух отсортированных потоков за один проход. БД — как хранилище; результат пишется массовой загрузкой.',
  },
  {
    id: 'common',
    title: 'Общий принцип',
    text: 'Горизонтальная фрагментация → независимая параллельная обработка фрагментов. Узкое место — перекос данных: самый нагруженный фрагмент задаёт общее время.',
  },
]

export function MethodComparison({ active }: MethodComparisonProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Сравнение методов
      </h3>
      <div className="flex flex-col gap-2">
        {ROWS.map((r) => {
          const highlighted = r.id === active
          return (
            <div
              key={r.id}
              className={`rounded-lg border p-2.5 ${
                highlighted
                  ? 'border-sky-300 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                  {r.title}
                </span>
                {highlighted && (
                  <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    активно
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {r.text}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
