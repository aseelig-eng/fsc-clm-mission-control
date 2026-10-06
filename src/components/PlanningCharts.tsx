import { fmtK, type CashFlowYear, type MonteCarloResult } from '../data/financialProfile'

const W = 640
const H = 200
const PAD = { l: 48, r: 10, t: 10, b: 22 }

function scaleY(max: number) {
  const h = H - PAD.t - PAD.b
  return (v: number) => PAD.t + h - (max > 0 ? (v / max) * h : 0)
}

function ticks(max: number) {
  const step = max / 4
  return [0, step, step * 2, step * 3, max]
}

/** Portfolio balance bars, with shortfall years marked in red and retirement shaded. */
export function CashFlowChart({ rows, retireAge }: { rows: CashFlowYear[]; retireAge: number }) {
  const max = Math.max(1, ...rows.map((row) => row.endBalance))
  const y = scaleY(max)
  const innerW = W - PAD.l - PAD.r
  const bw = innerW / Math.max(rows.length, 1)
  const retireIdx = rows.findIndex((row) => row.age >= retireAge)
  return (
    <svg className="plan-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Projected portfolio balance by year">
      {retireIdx > 0 && (
        <rect x={PAD.l + retireIdx * bw} y={PAD.t} width={innerW - retireIdx * bw} height={H - PAD.t - PAD.b} className="plan-chart-retire" />
      )}
      {ticks(max).map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="plan-chart-grid" />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="plan-chart-label">
            {fmtK(t)}
          </text>
        </g>
      ))}
      {rows.map((row, i) => (
        <rect
          key={row.year}
          x={PAD.l + i * bw + 0.5}
          y={row.shortfall > 0 ? y(max * 0.04) : y(row.endBalance)}
          width={Math.max(1, bw - 1)}
          height={row.shortfall > 0 ? H - PAD.b - y(max * 0.04) : H - PAD.b - y(row.endBalance)}
          className={row.shortfall > 0 ? 'plan-bar short' : row.phase === 'working' ? 'plan-bar work' : 'plan-bar retired'}
        >
          <title>{`Age ${row.age} (${row.year}): ${fmtK(row.endBalance)}${row.shortfall > 0 ? ` · shortfall ${fmtK(row.shortfall)}` : ''}`}</title>
        </rect>
      ))}
      {rows
        .filter((_, i) => i % 5 === 0)
        .map((row) => {
          const i = rows.indexOf(row)
          return (
            <text key={row.age} x={PAD.l + i * bw + bw / 2} y={H - 6} textAnchor="middle" className="plan-chart-label">
              {row.age}
            </text>
          )
        })}
    </svg>
  )
}

/** Percentile fan (10–90, 25–75, median) from the seeded Monte Carlo. */
export function FanChart({ result }: { result: MonteCarloResult }) {
  const bands = result.bands
  const max = Math.max(1, ...bands.map((band) => band.p90)) * 1.02
  const y = scaleY(max)
  const innerW = W - PAD.l - PAD.r
  const x = (i: number) => PAD.l + (bands.length <= 1 ? 0 : (i / (bands.length - 1)) * innerW)
  const area = (lo: keyof (typeof bands)[number], hi: keyof (typeof bands)[number]) =>
    `${bands.map((band, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(band[hi] as number)}`).join(' ')} ${bands
      .map((_, i) => {
        const j = bands.length - 1 - i
        return `L${x(j)},${y(bands[j][lo] as number)}`
      })
      .join(' ')} Z`
  const median = bands.map((band, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(band.p50)}`).join(' ')
  return (
    <svg className="plan-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Monte Carlo percentile fan chart">
      {ticks(max).map((t) => (
        <g key={t}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="plan-chart-grid" />
          <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="plan-chart-label">
            {fmtK(t)}
          </text>
        </g>
      ))}
      <path d={area('p10', 'p90')} className="fan-outer" />
      <path d={area('p25', 'p75')} className="fan-inner" />
      <path d={median} className="fan-median" />
      {bands
        .filter((_, i) => i % 5 === 0)
        .map((band) => {
          const i = bands.indexOf(band)
          return (
            <text key={band.age} x={x(i)} y={H - 6} textAnchor="middle" className="plan-chart-label">
              {band.age}
            </text>
          )
        })}
    </svg>
  )
}

/** Tiny line for trends (well-being history, performance index). */
export function Sparkline({ values, compare, label }: { values: number[]; compare?: number[]; label: string }) {
  const all = [...values, ...(compare ?? [])]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const span = max - min || 1
  const path = (series: number[]) =>
    series.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / Math.max(series.length - 1, 1)) * 100},${36 - ((v - min) / span) * 32 - 2}`).join(' ')
  return (
    <svg className="sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label={label}>
      {compare && <path d={path(compare)} className="spark-compare" vectorEffect="non-scaling-stroke" />}
      <path d={path(values)} className="spark-main" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
