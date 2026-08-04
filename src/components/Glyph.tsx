const PALETTE = ['var(--accent)', 'var(--info)', 'var(--warning)', 'var(--danger)', 'var(--success)']

function hashColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function Glyph({ label, size = 34 }: { label: string; size?: number }) {
  const color = hashColor(label)
  return (
    <div
      className="fin-glyph"
      style={{
        width: size,
        height: size,
        color,
        background: `color-mix(in srgb, ${color} 16%, var(--bg-elevated))`,
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  )
}
