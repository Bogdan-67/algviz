import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryArchPage } from './pages/MemoryArchPage'

// Render-only smoke: MemoryArchPage mounts with diagram, metrics, compare note.
describe('MemoryArchPage render smoke', () => {
  it('renders without throwing', () => {
    const html = renderToString(createElement(MemoryArchPage))
    expect(html).toContain('SMP/UMA против NUMA')
    expect(html).toContain('Symmetric Multiprocessing')
    expect(html).toContain('Non-Uniform Memory Access')
    expect(html).toContain('Масштабируемость')
    expect(html).toContain('Метрики')
  })
})
