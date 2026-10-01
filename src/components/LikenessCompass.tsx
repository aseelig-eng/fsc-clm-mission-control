import { useEffect, useState } from 'react'
import {
  FACET_DEFINITIONS,
  FACET_META,
  LIKENESS_FACET_IDS,
  MATURITY_LABELS,
  likenessScore,
  type BehavioralFacet,
  type PersonLikeness,
} from '../data/portraits'

function likenessFacets(person: PersonLikeness) {
  return LIKENESS_FACET_IDS.map((id) => person.facets.find((f) => f.id === id)!).filter(Boolean)
}

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

function likenessSummary(person: PersonLikeness, score: number) {
  const weakest = [...likenessFacets(person)].sort((a, b) => a.score - b.score)[0]
  const first = person.name.split(' ')[0]
  return `${first}'s likeness — how much we know about them — averages ${score} across ${LIKENESS_FACET_IDS.length} topics. The thinnest is ${weakest.label.toLowerCase()} at ${weakest.score}. ${weakest.blurb}`
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

/** Same low/mid/high banding + glow palette used on the holographic household figures, so a thin facet reads as "at risk" consistently across the pulse. */
function scoreTone(score: number): 'ok' | 'warn' | 'danger' {
  if (score < 30) return 'danger'
  if (score < 55) return 'warn'
  return 'ok'
}

const TONE_GLOW: Record<'ok' | 'warn' | 'danger', string> = {
  ok: '#5ad7ff',
  warn: '#ffb347',
  danger: '#ff4d5e',
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
  const barHalfWidth = 7
  const tier = MATURITY_LABELS[person.maturity.tier]
  const likeness = likenessScore(person)
  const likenessGlow = TONE_GLOW[scoreTone(likeness)]
  const [summaryId, setSummaryId] = useState<string | null>(null)
  const summary = person.facets.find((facet) => facet.id === summaryId) ?? null

  useEffect(() => {
    setSummaryId(null)
  }, [person.id])

  const points = FACET_META.map((meta) => {
    const facet = person.facets.find((f) => f.id === meta.id)!
    const r = Math.max((facet.score / 100) * maxR, 3)
    const tone = scoreTone(facet.score)
    const glow = TONE_GLOW[tone]
    const tip = polar(cx, cy, r, meta.angle)
    const ringTip = polar(cx, cy, maxR, meta.angle)
    const labelPos = polar(cx, cy, maxR + 38, meta.angle)
    // perpendicular offset so each radiating bar reads as a wedge, not a hairline
    const perp = meta.angle + 90
    const wOffset = polar(0, 0, barHalfWidth, perp)
    return { meta, facet, r, tone, glow, tip, ringTip, labelPos, wOffset }
  })

  const hexOuter = points.map((p) => `${p.ringTip.x},${p.ringTip.y}`).join(' ')
  const hexMid = FACET_META.map((meta) => {
    const p = polar(cx, cy, maxR * 0.55, meta.angle)
    return `${p.x},${p.y}`
  }).join(' ')

  return (
    <div className="likeness-compass">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label={`${person.name} likeness compass`}>
        <title>
          Likeness {likeness} (how much we know across {LIKENESS_FACET_IDS.length} topics) · Confidence{' '}
          {tier.title} {person.maturity.score} (how fresh/verified that picture is)
        </title>
        <defs>
          <radialGradient id="compass-plate" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="#1a3246" />
            <stop offset="70%" stopColor="#0d1b2b" />
            <stop offset="100%" stopColor="#070e16" />
          </radialGradient>
          <filter id="compass-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          {points.map(({ facet, glow }) => (
            <linearGradient key={facet.id} id={`bar-${facet.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="35%" stopColor={glow} stopOpacity="0.85" />
              <stop offset="100%" stopColor={glow} stopOpacity="0.25" />
            </linearGradient>
          ))}
        </defs>

        <circle cx={cx} cy={cy} r={maxR + 24} fill="url(#compass-plate)" />
        {[0.33, 0.66, 1].map((t) => (
          <circle key={t} cx={cx} cy={cy} r={maxR * t} fill="none" stroke="#2c4f6b" strokeWidth="1" opacity={0.6} />
        ))}
        {/* triangulated plate lines, echoing the faceted metal disc in the reference art */}
        <polygon points={hexOuter} fill="none" stroke="#2c4f6b" strokeWidth="1" opacity={0.55} />
        <polygon points={hexMid} fill="none" stroke="#2c4f6b" strokeWidth="1" opacity={0.4} />
        {points.map(({ meta, ringTip }) => (
          <line key={meta.id} x1={cx} y1={cy} x2={ringTip.x} y2={ringTip.y} stroke="#2c4f6b" strokeWidth="1" opacity={0.55} />
        ))}

        <circle
          cx={cx}
          cy={cy}
          r={maxR + 8}
          fill="none"
          stroke={likenessGlow}
          strokeWidth="5"
          strokeOpacity={0.25 + person.maturity.score / 220}
          strokeDasharray={`${(person.maturity.score / 100) * 2 * Math.PI * (maxR + 8)} 999`}
          transform={`rotate(-90 ${cx} ${cy})`}
        >
          <title>
            Confidence ring — {tier.title} · {person.maturity.score}. {tier.hint}
          </title>
        </circle>

        {/* radiating crystal bars — one per likeness facet, height = score, color = low/mid/high band */}
        {points.map(({ meta, facet, tip, wOffset, glow, labelPos }) => {
          const base1 = { x: cx + wOffset.x, y: cy + wOffset.y }
          const base2 = { x: cx - wOffset.x, y: cy - wOffset.y }
          const tip1 = { x: tip.x + wOffset.x * 0.3, y: tip.y + wOffset.y * 0.3 }
          const tip2 = { x: tip.x - wOffset.x * 0.3, y: tip.y - wOffset.y * 0.3 }
          const selected = selectedFacetId === facet.id
          const barPoints = `${base1.x},${base1.y} ${tip1.x},${tip1.y} ${tip2.x},${tip2.y} ${base2.x},${base2.y}`
          return (
            <g key={facet.id}>
              <polygon points={barPoints} fill={glow} opacity={0.45} filter="url(#compass-glow)" />
              <polygon
                points={barPoints}
                fill={`url(#bar-${facet.id})`}
                stroke={glow}
                strokeWidth={selected ? 1.6 : 1}
                style={{ cursor: 'pointer' }}
                onClick={() => onSelectFacet(facet)}
              />
              <circle cx={tip.x} cy={tip.y} r={selected ? 4.5 : 3} fill="#fff" stroke={glow} strokeWidth="1.4" />
              <g
                role="button"
                aria-label={`${meta.short} ${facet.score}. ${facet.label}. ${FACET_DEFINITIONS[facet.id]}`}
                style={{ cursor: 'pointer' }}
                onClick={(event) => {
                  event.stopPropagation()
                  setSummaryId((current) => (current === facet.id ? null : facet.id))
                }}
              >
                <title>
                  {facet.label} — {FACET_DEFINITIONS[facet.id]}
                </title>
                <rect
                  x={labelPos.x - 40}
                  y={labelPos.y - 11}
                  width="80"
                  height="22"
                  rx="7"
                  fill="rgba(10,20,32,0.88)"
                  stroke={glow}
                  strokeOpacity={summaryId === facet.id ? 0.95 : 0.55}
                  strokeWidth={summaryId === facet.id ? 1.4 : 1}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fontWeight={summaryId === facet.id ? 700 : 600}
                  fill={summaryId === facet.id ? glow : '#cfe8f7'}
                >
                  {meta.short} {facet.score}
                </text>
              </g>
            </g>
          )
        })}

        <circle cx={cx} cy={cy} r="30" fill="#0b1522" stroke={likenessGlow} strokeWidth="2" filter="url(#compass-glow)" opacity="0.5" />
        <circle cx={cx} cy={cy} r="30" fill="#0e1c2c" stroke={likenessGlow} strokeWidth="2">
          <title>
            Likeness {likeness} — average depth of knowledge across {LIKENESS_FACET_IDS.length} topics (the spokes).
            Not the same as confidence (below).
          </title>
        </circle>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="#eaf6ff">
          {person.initials}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill={likenessGlow}>
          {likeness}%
        </text>
      </svg>
      <div className="facet-pop" role="note" aria-label={summary ? `${summary.label} summary` : 'Likeness summary'}>
        {summary ? (
          <div className="facet-pop-head">
            <strong>{summary.label}</strong>
            <span style={{ color: TONE_GLOW[scoreTone(summary.score)] }}>{summary.score}</span>
            <button type="button" onClick={() => setSummaryId(null)}>
              Close
            </button>
          </div>
        ) : (
          <div className="facet-pop-head" title="Average of the 6 topic scores in the chart above — how much we know about this person.">
            <strong>Likeness</strong>
            <span style={{ color: likenessGlow }}>{likeness}</span>
          </div>
        )}
        {summary && <p className="facet-pop-def muted">{FACET_DEFINITIONS[summary.id]}</p>}
        <p>{summary ? facetSummary(summary) : likenessSummary(person, likeness)}</p>
      </div>
      <div
        className="likeness-maturity-pill"
        style={{ borderColor: person.accent }}
        title="Confidence in this profile: how complete, recent, multi-sourced, and advisor-confirmed it is — separate from Likeness above."
      >
        <span className="muted">Confidence (freshness &amp; sourcing)</span>
        <strong style={{ color: person.accent }}>
          {tier.title} · {person.maturity.score}
        </strong>
        <span className="muted">{tier.hint}</span>
      </div>
    </div>
  )
}
