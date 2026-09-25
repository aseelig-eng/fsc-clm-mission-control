import { useEffect, useState } from 'react'
import { FACET_META, MATURITY_LABELS, type BehavioralFacet, type PersonLikeness } from '../data/portraits'

function facetSummary(facet: BehavioralFacet) {
  const band =
    facet.score >= 80
      ? 'This is a strong read'
      : facet.score >= 55
        ? 'This is a workable read'
        : facet.score >= 35
          ? 'This is still thin'
          : 'This is barely on the file'
  const proof = facet.evidence[0] ? ` Seen on the file: ${facet.evidence[0].replace(/\.$/, '')}.` : ''
  return `${band}. ${facet.blurb}${proof}`
}

function likenessSummary(person: PersonLikeness) {
  const weakest = [...person.facets].sort((a, b) => a.score - b.score)[0]
  const tier = MATURITY_LABELS[person.maturity.tier]
  const first = person.name.split(' ')[0]
  return `${first}'s likeness is ${tier.title.toLowerCase()} at ${person.maturity.score}. The thinnest spoke is ${weakest.label.toLowerCase()} at ${weakest.score}. ${weakest.blurb}`
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export function LikenessCompass({
  person,
  selectedFacetId,
  onSelectFacet,
}: {
  person: PersonLikeness
  selectedFacetId: string | null
  onSelectFacet: (facet: BehavioralFacet) => void
}) {
  const size = 360
  const cx = size / 2
  const cy = size / 2
  const maxR = 96
  const tier = MATURITY_LABELS[person.maturity.tier]
  const [summaryId, setSummaryId] = useState<string | null>(null)
  const summary = person.facets.find((facet) => facet.id === summaryId) ?? null

  useEffect(() => {
    setSummaryId(null)
  }, [person.id])

  const points = FACET_META.map((meta) => {
    const facet = person.facets.find((f) => f.id === meta.id)!
    const r = (facet.score / 100) * maxR
    const p = polar(cx, cy, r, meta.angle)
    return { meta, facet, ...p }
  })

  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="likeness-compass">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label={`${person.name} likeness compass`}>
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <circle key={t} cx={cx} cy={cy} r={maxR * t} fill="none" stroke="var(--sf-gray-5)" strokeWidth="1" />
        ))}
        <circle
          cx={cx}
          cy={cy}
          r={maxR + 8}
          fill="none"
          stroke={person.accent}
          strokeWidth="6"
          strokeOpacity={0.2 + person.maturity.score / 200}
          strokeDasharray={`${(person.maturity.score / 100) * 2 * Math.PI * (maxR + 8)} 999`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <polygon points={polygon} fill={person.accent} fillOpacity="0.18" stroke={person.accent} strokeWidth="2" />
        {points.map(({ meta, facet, x, y }) => {
          const labelPos = polar(cx, cy, maxR + 34, meta.angle)
          const selected = selectedFacetId === facet.id
          return (
            <g key={facet.id} style={{ cursor: 'pointer' }} onClick={() => onSelectFacet(facet)}>
              <line
                x1={cx}
                y1={cy}
                x2={polar(cx, cy, maxR, meta.angle).x}
                y2={polar(cx, cy, maxR, meta.angle).y}
                stroke="var(--sf-gray-5)"
                strokeWidth="1"
              />
              <circle
                cx={x}
                cy={y}
                r={selected ? 8 : 6}
                fill={selected ? person.accent : '#fff'}
                stroke={person.accent}
                strokeWidth="2"
              />
              <g
                role="button"
                aria-label={`${meta.short} ${facet.score}. ${facet.label}`}
                style={{ cursor: 'pointer' }}
                onClick={(event) => {
                  event.stopPropagation()
                  setSummaryId((current) => (current === facet.id ? null : facet.id))
                }}
              >
                <rect x={labelPos.x - 42} y={labelPos.y - 12} width="84" height="22" fill="transparent" />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight={summaryId === facet.id ? 700 : 600}
                  fill={summaryId === facet.id ? person.accent : 'var(--sf-gray-2)'}
                >
                  {meta.short} {facet.score}
                </text>
              </g>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r="32" fill="#fff" stroke={person.accent} strokeWidth="2" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill={person.accent}>
          {person.initials}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill="var(--sf-gray-3)">
          {person.maturity.score}%
        </text>
      </svg>
      <div className="facet-pop" role="note" aria-label={summary ? `${summary.label} summary` : 'Likeness summary'}>
        {summary ? (
          <div className="facet-pop-head">
            <strong>{summary.label}</strong>
            <span>{summary.score}</span>
            <button type="button" onClick={() => setSummaryId(null)}>
              Close
            </button>
          </div>
        ) : (
          <div className="facet-pop-head">
            <strong>Likeness</strong>
            <span>{person.maturity.score}</span>
          </div>
        )}
        <p>{summary ? facetSummary(summary) : likenessSummary(person)}</p>
      </div>
      <div className="likeness-maturity-pill" style={{ borderColor: person.accent }}>
        <span className="muted">Maturity</span>
        <strong style={{ color: person.accent }}>
          {tier.title} · {person.maturity.score}
        </strong>
        <span className="muted">{tier.hint}</span>
      </div>
    </div>
  )
}
