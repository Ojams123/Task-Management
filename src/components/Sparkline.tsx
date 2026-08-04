import { useId, useState, type MouseEvent } from 'react'

export interface SparklinePoint {
  label: string
  value: number
}

const VIEW_WIDTH = 400

export function Sparkline({
  points,
  height = 72,
  color = 'var(--accent)',
  formatValue = (v: number) => String(v),
}: {
  points: SparklinePoint[]
  height?: number
  color?: string
  formatValue?: (v: number) => string
}) {
  const gradientId = useId()
  const [hover, setHover] = useState<number | null>(null)

  if (points.length < 2) {
    return <div className="sparkline-empty">Not enough data yet.</div>
  }

  const values = points.map((p) => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = VIEW_WIDTH / (points.length - 1)
  const padY = 10
  const coords = points.map(
    (p, i) => [i * stepX, height - padY - ((p.value - min) / range) * (height - padY * 2)] as const
  )
  const linePath = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${VIEW_WIDTH},${height} L0,${height} Z`

  const active = hover ?? coords.length - 1
  const [activeX, activeY] = coords[active]

  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const fx = (e.clientX - rect.left) / rect.width
    const idx = Math.round(fx * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, idx)))
  }

  return (
    <div className="sparkline-wrap">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
        className="sparkline"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={activeX} x2={activeX} y1={0} y2={height} className="sparkline-guide" />
        <circle cx={activeX} cy={activeY} r="4" fill={color} stroke="var(--bg-card)" strokeWidth="2" />
      </svg>
      <div className="sparkline-tooltip" style={{ left: `${(activeX / VIEW_WIDTH) * 100}%` }}>
        <div className="sparkline-tooltip-value">{formatValue(points[active].value)}</div>
        <div className="sparkline-tooltip-label">{points[active].label}</div>
      </div>
    </div>
  )
}
