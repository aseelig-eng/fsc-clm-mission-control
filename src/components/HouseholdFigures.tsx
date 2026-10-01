import type { Interest, PersonLikeness } from '../data/portraits'
import { likenessScore } from '../data/portraits'

function heightScale(person: PersonLikeness) {
  if (person.profile.deceased) return 0.9
  const age = person.age
  if (age == null) return 1
  if (age < 13) return 0.62
  if (age < 20) return 0.78
  if (age >= 75) return 0.86
  if (age >= 60) return 0.92
  return 1
}

/** Likeness → tone, shared with the HUD node coloring in HouseholdPulse. */
function likenessTone(score: number): 'ok' | 'warn' | 'danger' {
  if (score < 30) return 'danger'
  if (score < 55) return 'warn'
  return 'ok'
}

const TONE_GLOW: Record<'ok' | 'warn' | 'danger', string> = {
  ok: '#5ad7ff',
  warn: '#ffb347',
  danger: '#ff4d5e',
}

function InterestMark({ interest, accent }: { interest: Interest; accent: string }) {
  if (interest === 'tech') {
    return <rect x="16" y="-8" width="14" height="9" rx="1.5" fill="#0b1420" stroke={accent} strokeWidth="1.2" />
  }
  if (interest === 'travel') {
    return <rect x="16" y="-6" width="12" height="9" rx="1" fill={accent} opacity={0.85} />
  }
  if (interest === 'family') {
    return <circle cx="22" cy="-2" r="4" fill="#0b1420" stroke={accent} strokeWidth="1.2" />
  }
  if (interest === 'markets') {
    return <polyline points="16,-8 20,-2 24,-6 30,2" fill="none" stroke={accent} strokeWidth="1.4" />
  }
  if (interest === 'garden') {
    return <ellipse cx="22" cy="-2" rx="5" ry="3.5" fill="#2e844a" />
  }
  return <circle cx="22" cy="-2" r="4" fill="#dd7a01" />
}

/** Deterministic pseudo-random in [0,1) seeded by two ints — stable across re-renders, no Math.random jitter. */
function seeded(a: number, b: number) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return v - Math.floor(v)
}

/**
 * One holographic figure: an anonymized, featureless glowing head (no facial
 * features, no gendered hair/head shape — purely tone-colored by accent) lit
 * by a vertical beam of descending data-particles. Beam density/opacity and
 * the ring at the figure's feet are driven by that person's likeness score,
 * so "how well we know this person" stays visible on the figure itself, not
 * just on the separate compass panel.
 */
function Figure({ person, x, mini, idx }: { person: PersonLikeness; x: number; mini: boolean; idx: number }) {
  const scale = heightScale(person)
  const { interests, occasion, deceased } = person.profile
  const accent = deceased ? '#8e8e8e' : person.accent
  const interest = interests[0]
  const likeness = likenessScore(person)
  const tone = likenessTone(likeness)
  const glow = deceased ? '#8e8e8e' : TONE_GLOW[tone]
  const beamId = `beam-${person.id}`
  const haloId = `halo-${person.id}`
  const ringPct = Math.max(0, Math.min(100, likeness)) / 100
  const ringCirc = 2 * Math.PI * 15
  const particleCount = mini ? 0 : 3 + Math.round((likeness / 100) * 4)

  return (
    <g transform={`translate(${x} 0) scale(${scale})`} opacity={deceased ? 0.5 : 1}>
      {!mini && (
        <defs>
          <linearGradient id={beamId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={glow} stopOpacity="0" />
            <stop offset="55%" stopColor={glow} stopOpacity={0.22 + ringPct * 0.28} />
            <stop offset="100%" stopColor={glow} stopOpacity={0.08 + ringPct * 0.2} />
          </linearGradient>
          <radialGradient id={haloId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="55%" stopColor={glow} stopOpacity="0.55" />
            <stop offset="100%" stopColor={glow} stopOpacity="0" />
          </radialGradient>
        </defs>
      )}

      {/* descending light beam + data particles — intensity reflects likeness */}
      {!mini && (
        <>
          <polygon points="-13,-150 13,-150 20,-46 -20,-46" fill={`url(#${beamId})`} />
          {Array.from({ length: particleCount }).map((_, p) => {
            const sx = (seeded(idx + 1, p + 1) - 0.5) * 22
            const sy = -150 + seeded(idx + 2, p + 3) * 104
            const r = 1 + seeded(idx + 3, p + 5) * 1.4
            return <circle key={p} cx={sx} cy={sy} r={r} fill={glow} opacity={0.55 + seeded(idx + 4, p) * 0.35} />
          })}
        </>
      )}

      {interest && <InterestMark interest={interest} accent={accent} />}
      {occasion === 'birthday' && <polygon points="-7,-58 0,-74 7,-58" fill="#dd7a01" />}
      {occasion === 'wedding' && (
        <path d="M-8 -56 Q0 -70 8 -56" fill="none" stroke="#fff" strokeWidth="1.6" opacity={0.8} />
      )}

      {/* anonymized head: a smooth, featureless glowing orb — no face, no hair, no gendered head shape */}
      <circle cx="0" cy="-46" r="13" fill={`url(#${haloId})`} opacity={mini ? 0.9 : 1} />
      <circle cx="0" cy="-46" r="8.5" fill="#f4f8ff" stroke={glow} strokeWidth="1" />
      <circle cx="-2.5" cy="-49" r="2.4" fill="#ffffff" opacity="0.9" />

      {/* holographic torso — translucent silhouette, accent-tinted edge glow */}
      <rect x="-11" y="-36" width="22" height="28" rx="8" fill={accent} opacity={deceased ? 0.35 : 0.3} stroke={accent} strokeWidth="1.4" />
      <rect x="-8" y="-8" width="6" height="22" rx="3" fill={accent} opacity={deceased ? 0.35 : 0.42} />
      <rect x="2" y="-8" width="6" height="22" rx="3" fill={accent} opacity={deceased ? 0.35 : 0.42} />

      {/* likeness ring at the figure's feet — fraction of the ring lit = likeness % */}
      {!mini && (
        <g transform="translate(0 20)">
          <circle r="15" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
          <circle
            r="15"
            fill="none"
            stroke={glow}
            strokeWidth="2.5"
            strokeDasharray={`${ringCirc * ringPct} ${ringCirc}`}
            strokeLinecap="round"
            transform="rotate(-90)"
          />
        </g>
      )}
      {deceased && <circle cx="0" cy="20" r="2" fill="#9a9a9a" />}
    </g>
  )
}

export function HouseholdFigures({ persons, mini = false }: { persons: PersonLikeness[]; mini?: boolean }) {
  const n = persons.length
  const gap = n <= 1 ? 0 : n === 2 ? 56 : 48
  const start = -((n - 1) * gap) / 2
  const avgLikeness = n === 0 ? 0 : Math.round(persons.reduce((sum, p) => sum + likenessScore(p), 0) / n)
  const householdTone = likenessTone(avgLikeness)
  const platformGlow = TONE_GLOW[householdTone]
  const platformId = `platform-${persons[0]?.id ?? 'hh'}`

  const body = (
    <>
      {!mini && (
        <defs>
          <radialGradient id={platformId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={platformGlow} stopOpacity="0.55" />
            <stop offset="60%" stopColor={platformGlow} stopOpacity="0.18" />
            <stop offset="100%" stopColor={platformGlow} stopOpacity="0" />
          </radialGradient>
        </defs>
      )}
      <ellipse cx="0" cy="22" rx={48 + n * 26} ry={14 + n * 2} fill={mini ? '#d5e6f2' : `url(#${platformId})`} />
      <ellipse
        cx="0"
        cy="22"
        rx={36 + n * 24}
        ry="9"
        fill="none"
        stroke={mini ? '#c6dced' : platformGlow}
        strokeWidth={mini ? 1 : 1.4}
        opacity={mini ? 0.6 : 0.85}
      />
      {persons.map((person, i) => (
        <Figure key={person.id} person={person} x={start + i * gap} mini={mini} idx={i} />
      ))}
    </>
  )
  if (mini) return <g>{body}</g>
  return <g transform="translate(200 268)">{body}</g>
}
