import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { TopologyPage } from './pages/TopologyPage'

// Render-only smoke: TopologyPage mounts, shows the graph, live metrics and
// the compare table without throwing.
describe('TopologyPage render smoke', () => {
  it('renders without throwing', () => {
    const html = renderToString(createElement(TopologyPage, { onNavigateCannon: () => {} }))
    expect(html).toContain('Топологии межсоединений')
    expect(html).toContain('Характеристики')
    expect(html).toContain('Сравнение топологий')
    expect(html).toContain('Гиперкуб') // default kind + compare row
    expect(html).toContain('Диаметр')
  })
})
