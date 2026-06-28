import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { SortPage } from './pages/SortPage'

// Render-only smoke: SortPage mounts and shows controls, network strip, metrics.
describe('SortPage render smoke', () => {
  it('renders without throwing', () => {
    const html = renderToString(createElement(SortPage))
    expect(html).toContain('Параллельная сортировка')
    expect(html).toContain('Чётно-нечётная')
    expect(html).toContain('Битоническая')
    expect(html).toContain('Сеть сравнений')
    expect(html).toContain('compare-exchange')
  })
})
