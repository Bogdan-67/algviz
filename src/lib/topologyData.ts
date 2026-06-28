import type { TopologyKind, TopologyParams } from './topology'

export interface TopologyInfo {
  id: TopologyKind
  name: string
  blurb: string
  /** Что хорошо ложится на эту топологию. */
  useCases: string[]
  weaknesses: string[]
  /** Сильная сторона для сравнительной таблицы. */
  strongPoint: string
  /** Ссылка на страницу Кэннона как живой пример (mesh/torus). */
  linkCannon?: boolean
}

export const TOPOLOGY_ORDER: TopologyKind[] = [
  'linear',
  'ring',
  'mesh',
  'torus',
  'star',
  'full',
  'tree',
  'hypercube',
]

export const TOPOLOGY_INFO: Record<TopologyKind, TopologyInfo> = {
  linear: {
    id: 'linear',
    name: 'Линейка (array)',
    blurb: 'Узлы в ряд, каждый связан с двумя соседями.',
    useCases: [
      'Конвейерная (поточная) обработка и систолические алгоритмы.',
      'Чётно-нечётная сортировка — обмен только с соседями.',
    ],
    weaknesses: ['Большой диаметр (n−1) → медленный глобальный обмен.'],
    strongPoint: 'Простота и дешевизна связей',
  },
  ring: {
    id: 'ring',
    name: 'Кольцо (ring)',
    blurb: 'Линейка с замкнутыми краями — все узлы в цикле.',
    useCases: [
      'Кольцевые схемы обмена (token ring, all-gather по кругу).',
      'Конвейерные и систолические вычисления с возвратом.',
    ],
    weaknesses: ['Диаметр ⌊n/2⌋ всё ещё растёт линейно.'],
    strongPoint: 'Степень 2 при замкнутом обмене',
  },
  mesh: {
    id: 'mesh',
    name: '2D-решётка (mesh)',
    blurb: 'Сетка узлов, связи с соседями по горизонтали и вертикали.',
    useCases: [
      'Матричные и сеточные вычисления, разностные схемы.',
      'Обработка изображений (соседство по сетке).',
    ],
    weaknesses: ['Диаметр ~2(√p−1) больше, чем у гиперкуба.'],
    strongPoint: 'Естественна для 2D-данных',
    linkCannon: true,
  },
  torus: {
    id: 'torus',
    name: '2D-тор (torus)',
    blurb: 'Решётка с замыканием краёв по обеим осям.',
    useCases: [
      'Матричное умножение по Кэннону (сдвиги блоков по кругу).',
      'Сеточные вычисления без краевых эффектов.',
    ],
    weaknesses: ['Сложнее разводка из-за заворачивающихся связей.'],
    strongPoint: 'Меньший диаметр и вдвое большая бисекция, чем у mesh',
    linkCannon: true,
  },
  star: {
    id: 'star',
    name: 'Звезда (star)',
    blurb: 'Центральный узел, к нему подключены все остальные.',
    useCases: [
      'Схемы «главный — рабочие» (master–worker).',
      'Централизованный сбор и раздача данных.',
    ],
    weaknesses: ['Центр — узкое место и единая точка отказа.'],
    strongPoint: 'Диаметр 2, простая координация',
  },
  full: {
    id: 'full',
    name: 'Полносвязный (full)',
    blurb: 'Каждый узел соединён с каждым.',
    useCases: [
      'Интенсивный обмен «все со всеми» на малых системах.',
      'Алгоритмы, где важна минимальная задержка между любой парой.',
    ],
    weaknesses: ['Число связей ~p²/2 — нереализуем при большом p.'],
    strongPoint: 'Диаметр 1, максимальная бисекция',
  },
  tree: {
    id: 'tree',
    name: 'Дерево (tree)',
    blurb: 'Иерархия с корнем и потомками.',
    useCases: [
      'Рассылка (broadcast) и сборка/агрегирование (reduce).',
      'Иерархические схемы; fat-tree — в реальных кластерных сетях.',
    ],
    weaknesses: ['Корень — узкое место (у обычного дерева, не fat-tree).'],
    strongPoint: 'Логарифмический диаметр для broadcast/reduce',
  },
  hypercube: {
    id: 'hypercube',
    name: 'Гиперкуб (hypercube)',
    blurb: 'Узлы — двоичные коды; связаны отличающиеся ровно в одном бите.',
    useCases: [
      'Рекурсивные «разделяй и властвуй», БПФ (FFT).',
      'Глобальные обмены и сортировки — малый диаметр (log₂p).',
    ],
    weaknesses: ['Степень узла растёт с размером (= d = log₂p).'],
    strongPoint: 'Логарифмический диаметр и большая бисекция',
  },
}

export interface ParamControl {
  key: keyof TopologyParams
  label: string
  min: number
  max: number
}

/** Which size parameters each topology exposes, with readable limits. */
export function paramControls(kind: TopologyKind): ParamControl[] {
  switch (kind) {
    case 'linear':
    case 'ring':
    case 'star':
      return [{ key: 'n', label: 'Узлов n', min: 2, max: 16 }]
    case 'full':
      return [{ key: 'n', label: 'Узлов n', min: 2, max: 12 }]
    case 'mesh':
    case 'torus':
      return [
        { key: 'w', label: 'Ширина', min: 2, max: 6 },
        { key: 'h', label: 'Высота', min: 2, max: 6 },
      ]
    case 'tree':
      return [
        { key: 'levels', label: 'Уровней', min: 1, max: 5 },
        { key: 'branching', label: 'Ветвление', min: 2, max: 3 },
      ]
    case 'hypercube':
      return [{ key: 'd', label: 'Размерность d', min: 1, max: 5 }]
  }
}

export const DEFAULT_PARAMS: TopologyParams = {
  n: 8,
  w: 4,
  h: 4,
  levels: 4,
  branching: 2,
  d: 3,
}
