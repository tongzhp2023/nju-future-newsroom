'use client'

import { COLOR_PALETTE } from './types'

export function ColorGrid({ colors = COLOR_PALETTE, onSelect, cols = 10 }: {
  colors?: string[]
  onSelect: (color: string) => void
  cols?: number
}) {
  return (
    <div className="grid gap-[3px] p-2.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {colors.map((c, i) => (
        <button
          key={i}
          className="w-5 h-5 rounded-sm border border-transparent hover:scale-125 hover:border-[var(--foreground)] transition"
          style={{ background: c }}
          title={c}
          onClick={() => onSelect(c)}
        />
      ))}
    </div>
  )
}

export function ColorResetButton({ onClick, label = '恢复默认' }: {
  onClick: () => void
  label?: string
}) {
  return (
    <button
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted)] hover:bg-[var(--surface-hover)] border-t border-[var(--border-light)]"
      onClick={onClick}
    >
      <span className="w-4 h-4 rounded bg-black" /> {label}
    </button>
  )
}
