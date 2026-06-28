import type { CSSProperties } from 'react'

const HUES = [205, 150, 275, 30, 330, 95]

export interface FragmentColor {
  hue: number
  solid: string
  chip: CSSProperties
}

/** Stable, visually-distinct color per fragment id (for shard color coding). */
export function fragmentColor(id: number): FragmentColor {
  const hue = HUES[((id % HUES.length) + HUES.length) % HUES.length]
  return {
    hue,
    solid: `hsl(${hue} 65% 50%)`,
    chip: {
      background: `hsl(${hue} 70% 50% / 0.14)`,
      borderColor: `hsl(${hue} 60% 50% / 0.5)`,
    },
  }
}
