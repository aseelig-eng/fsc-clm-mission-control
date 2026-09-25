import type { Interest, PersonLikeness } from '../data/portraits'

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

function InterestMark({ interest, accent }: { interest: Interest; accent: string }) {
  if (interest === 'tech') {
    return <rect x="16" y="-8" width="14" height="9" rx="1.5" fill="#fff" stroke={accent} strokeWidth="1.2" />
  }
  if (interest === 'travel') {
    return <rect x="16" y="-6" width="12" height="9" rx="1" fill={accent} />
  }
  if (interest === 'family') {
    return <circle cx="22" cy="-2" r="4" fill="#fff" stroke={accent} strokeWidth="1.2" />
  }
  if (interest === 'markets') {
    return <polyline points="16,-8 20,-2 24,-6 30,2" fill="none" stroke={accent} strokeWidth="1.4" />
  }
  if (interest === 'garden') {
    return <ellipse cx="22" cy="-2" rx="5" ry="3.5" fill="#2e844a" />
  }
  return <circle cx="22" cy="-2" r="4" fill="#dd7a01" />
}

function Figure({ person, x }: { person: PersonLikeness; x: number }) {
  const scale = heightScale(person)
  const { sex, interests, occasion, deceased } = person.profile
  const accent = deceased ? '#8e8e8e' : person.accent
  const torso = occasion === 'wedding' ? '#f7f4ef' : accent
  const interest = interests[0]

  return (
    <g transform={`translate(${x} 0) scale(${scale})`} opacity={deceased ? 0.55 : 1}>
      {interest && <InterestMark interest={interest} accent={accent} />}
      {occasion === 'birthday' && <polygon points="-7,-58 0,-74 7,-58" fill="#dd7a01" />}
      {occasion === 'wedding' && sex !== 'male' && (
        <path d="M-8 -52 Q0 -68 8 -52" fill="none" stroke="#fff" strokeWidth="2" />
      )}
      {occasion === 'wedding' && sex === 'male' && <circle cx="10" cy="-18" r="2.2" fill="#fff" />}
      {sex === 'female' && <ellipse cx="0" cy="-48" rx="11" ry="13" fill={deceased ? '#6e6e6e' : '#3e3e3c'} />}
      {sex === 'male' && <path d="M-9 -50 Q0 -58 9 -50" fill={deceased ? '#6e6e6e' : '#3e3e3c'} />}
      <circle cx="0" cy="-46" r="8" fill="#f3efe8" />
      <rect x="-11" y="-36" width="22" height="28" rx="8" fill={torso} />
      <rect x="-8" y="-8" width="6" height="22" rx="3" fill={accent} />
      <rect x="2" y="-8" width="6" height="22" rx="3" fill={accent} />
      {deceased && <circle cx="0" cy="20" r="2" fill="#706e6b" />}
    </g>
  )
}

export function HouseholdFigures({ persons, mini = false }: { persons: PersonLikeness[]; mini?: boolean }) {
  const n = persons.length
  const gap = n <= 1 ? 0 : n === 2 ? 56 : 48
  const start = -((n - 1) * gap) / 2
  const body = (
    <>
      <ellipse cx="0" cy="22" rx={36 + n * 24} ry="9" fill="#d5e6f2" />
      {persons.map((person, i) => (
        <Figure key={person.id} person={person} x={start + i * gap} />
      ))}
    </>
  )
  if (mini) return <g>{body}</g>
  return <g transform="translate(200 268)">{body}</g>
}
