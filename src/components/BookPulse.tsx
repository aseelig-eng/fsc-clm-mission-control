import { FACET_META, personsForHousehold } from '../data/portraits'
import type { Household } from '../data/types'
import { HouseholdFigures } from './HouseholdFigures'

export type BookBubbleId = 'pipeline' | 'nigo' | 'heirs' | 'capacity'

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function BookCompass({ scores, average }: { scores: Record<string, number>; average: number }) {
  const size = 300
  const cx = size / 2
  const cy = size / 2
  const maxR = 96
  const points = FACET_META.map((meta) => {
    const score = scores[meta.id] ?? 0
    const p = polar(cx, cy, (score / 100) * maxR, meta.angle)
    return { meta, score, ...p }
  })
  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ')
  return (
    <div className="likeness-compass">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label="Book likeness">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <circle key={t} cx={cx} cy={cy} r={maxR * t} fill="none" stroke="var(--sf-gray-5)" strokeWidth="1" />
        ))}
        <polygon points={polygon} fill="#0176d3" fillOpacity="0.18" stroke="#0176d3" strokeWidth="2" />
        {points.map(({ meta, x, y }) => {
          const label = polar(cx, cy, maxR + 22, meta.angle)
          return (
            <g key={meta.id}>
              <line x1={cx} y1={cy} x2={polar(cx, cy, maxR, meta.angle).x} y2={polar(cx, cy, maxR, meta.angle).y} stroke="var(--sf-gray-5)" />
              <circle cx={x} cy={y} r="5" fill="#fff" stroke="#0176d3" strokeWidth="2" />
              <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill="var(--sf-gray-2)">
                {meta.short}
              </text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r="32" fill="#fff" stroke="#0176d3" strokeWidth="2" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#014486">
          Book
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="var(--sf-gray-3)">
          {average}%
        </text>
      </svg>
      <div className="likeness-maturity-pill" style={{ borderColor: '#0176d3' }}>
        <span className="muted">Book likeness</span>
        <strong style={{ color: '#014486' }}>Average · {average}</strong>
        <span className="muted">Mean of every person in the book</span>
      </div>
    </div>
  )
}

const FUNDED = new Set(['welcome', 'ongoing', 'annual_review', 'life_event', 'estate'])

export function BookPulse({
  households,
  openSignalCount,
  onOpenHousehold,
  onOpenBubble,
}: {
  households: Household[]
  openSignalCount: number
  onOpenHousehold: (id: string) => void
  onOpenBubble: (id: BookBubbleId) => void
}) {
  const people = households.flatMap((h) => personsForHousehold(h.id))
  const scores: Record<string, number> = {}
  for (const meta of FACET_META) {
    const vals = people.map((p) => p.facets.find((f) => f.id === meta.id)?.score ?? 0)
    scores[meta.id] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0
  }
  const average = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / FACET_META.length)
  const inPipeline = households.filter((h) => !FUNDED.has(h.stage)).length
  const heirScore = scores.heir_readiness ?? 0
  const capacity = Math.max(households.length * 3, 1)
  const bubbles: { id: BookBubbleId; x: number; y: number; k: string; v: string; s: string; tone: string }[] = [
    { id: 'pipeline', x: 260, y: 36, k: 'Pipeline', v: String(inPipeline), s: 'Not funded', tone: 'ok' },
    { id: 'nigo', x: 470, y: 110, k: 'NIGO', v: String(openSignalCount), s: 'Open signals', tone: openSignalCount > 0 ? 'danger' : 'ok' },
    { id: 'heirs', x: 430, y: 286, k: 'Heirs', v: `${heirScore}%`, s: heirScore < 45 ? 'At risk' : 'Forming', tone: heirScore < 45 ? 'warn' : 'ok' },
    { id: 'capacity', x: 48, y: 140, k: 'Capacity', v: `${openSignalCount}/${capacity}`, s: 'Signals', tone: openSignalCount > capacity * 0.6 ? 'warn' : 'ok' },
  ]

  return (
    <div className="pulse-panel">
      <div className="likeness-kicker">Book Pulse · Households &amp; Health</div>
      <h3 className="likeness-title">The book</h3>
      <p className="muted" style={{ margin: '4px 0 12px' }}>
        Each group is a household. Select one to open the client. Bubbles are the book, not one person.
      </p>
      <div className="pulse-visual">
        <div className="pulse-stage book-stage">
          <svg className="pulse-scene" viewBox="0 0 520 340" role="img" aria-label="Book of households">
            <ellipse cx="260" cy="248" rx="210" ry="16" fill="#d5e6f2" />
            <line x1="260" y1="210" x2="260" y2="52" stroke="var(--sf-blue)" strokeWidth="2" strokeDasharray="5 4" />
            <line x1="300" y1="220" x2="450" y2="120" stroke="var(--sf-red)" strokeWidth="2" strokeDasharray="5 4" />
            <line x1="300" y1="250" x2="410" y2="270" stroke="var(--sf-orange)" strokeWidth="2" strokeDasharray="5 4" />
            <line x1="200" y1="220" x2="70" y2="150" stroke="var(--sf-blue)" strokeWidth="2" strokeDasharray="5 4" />
            {households.map((h, i) => {
              const x = 70 + i * (380 / Math.max(households.length - 1, 1))
              return (
                <g key={h.id} transform={`translate(${x} 210) scale(0.42)`}>
                  <HouseholdFigures persons={personsForHousehold(h.id)} mini />
                </g>
              )
            })}
          </svg>
          {households.map((h, i) => {
            const x = 70 + i * (380 / Math.max(households.length - 1, 1))
            return (
              <button
                key={h.id}
                type="button"
                className="book-house-hit"
                style={{ left: `${(x / 520) * 100}%`, top: '62%' }}
                onClick={() => onOpenHousehold(h.id)}
              >
                {h.name.split(' ')[0]}
              </button>
            )
          })}
          {bubbles.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`pulse-node tone-${b.tone}`}
              style={{ left: `${(b.x / 520) * 100}%`, top: `${(b.y / 340) * 100}%` }}
              onClick={() => onOpenBubble(b.id)}
            >
              <span className="k">{b.k}</span>
              <span className="v">{b.v}</span>
              <span className="s">{b.s}</span>
            </button>
          ))}
        </div>
        <BookCompass scores={scores} average={average} />
      </div>
    </div>
  )
}
