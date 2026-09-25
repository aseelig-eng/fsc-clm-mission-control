import { useState } from 'react'
import type { ContactChannel, PersonLikeness } from '../data/portraits'
import { HouseholdFigures } from './HouseholdFigures'

const CHANNELS = [
  { id: 'text', label: 'Text' },
  { id: 'email', label: 'Email' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'phone', label: 'Phone' },
  { id: 'video', label: 'Video' },
  { id: 'in_person', label: 'In Person' },
] as const

const INTEREST_LABEL: Record<string, string> = {
  tech: 'Technology',
  travel: 'Travel',
  family: 'Family',
  markets: 'Markets',
  garden: 'Garden',
  art: 'Art',
}

export function ClientDossier({
  householdName,
  persons,
  initialPersonId,
  contact,
  edits,
  onContact,
  onProfile,
  onClose,
}: {
  householdName: string
  persons: PersonLikeness[]
  initialPersonId: string
  contact?: { email?: string; phone?: string; address?: string }
  edits?: Record<string, { sentiment?: string; preferredContact?: ContactChannel[] }>
  onContact?: (key: 'email' | 'phone' | 'address', value: string) => void
  onProfile?: (personId: string, patch: { sentiment?: string; preferredContact?: ContactChannel[] }) => void
  onClose: () => void
}) {
  const [personId, setPersonId] = useState(initialPersonId)
  const person = persons.find((p) => p.id === personId) ?? persons[0]
  if (!person) return null
  const profile = person.profile
  const edit = edits?.[person.id]
  const preferred = edit?.preferredContact ?? profile.preferredContact ?? []
  const sentiment = edit?.sentiment ?? profile.sentiment ?? person.tagline

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="dossier"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dossier-title"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="dossier-spine" aria-label="People in the household">
          <span className="dossier-spine-label">File</span>
          {persons.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`dossier-tab ${p.id === person.id ? 'active' : ''}`}
              onClick={() => setPersonId(p.id)}
            >
              <span className="person-avatar" style={{ background: p.accent }}>
                {p.initials}
              </span>
              <span>{p.name.split(' ')[0]}</span>
            </button>
          ))}
        </aside>
        <div className="dossier-page">
          <div className="modal-header">
            <div>
              <div className="likeness-kicker">{householdName}</div>
              <h2 id="dossier-title">Relationship File</h2>
            </div>
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="dossier-identity">
            <div className="dossier-figure" aria-hidden="true">
              <svg viewBox="0 0 160 150">
                <g transform="translate(80 118) scale(0.72)">
                  <HouseholdFigures persons={[person]} mini />
                </g>
              </svg>
            </div>
            <div>
              <h3>{person.name}</h3>
              <p className="muted">
                {person.role}
                {person.age ? ` · ${person.age}` : ''}
                {profile.deceased ? ' · Deceased' : ''}
                {profile.occasion === 'birthday' ? ' · Birthday this month' : ''}
                {profile.occasion === 'wedding' ? ' · Wedding' : ''}
              </p>
              <blockquote className="dossier-sentiment">
                <label>
                  Sentiment
                  <input
                    className="field-edit"
                    aria-label="Sentiment"
                    value={sentiment}
                    onChange={(event) => onProfile?.(person.id, { sentiment: event.target.value })}
                  />
                </label>
              </blockquote>
            </div>
          </div>

          <section className="dossier-block">
            <h4>How They Want to Be Contacted</h4>
            <div className="dossier-channels">
              {CHANNELS.map((ch) => {
                const chosen = preferred.includes(ch.id)
                return (
                  <button
                    key={ch.id}
                    type="button"
                    className={`dossier-channel ${chosen ? 'chosen' : ''}`}
                    aria-pressed={chosen}
                    onClick={() => {
                      const next = chosen
                        ? preferred.filter((item) => item !== ch.id)
                        : [...preferred, ch.id]
                      onProfile?.(person.id, { preferredContact: next })
                    }}
                  >
                    <span>{ch.label}</span>
                    {chosen && <strong>Preferred</strong>}
                  </button>
                )
              })}
            </div>
            <dl className="dossier-facts">
              {(
                [
                  ['email', 'Email', contact?.email || profile.email || ''],
                  ['phone', 'Phone', contact?.phone || profile.phone || ''],
                  ['address', 'Address', contact?.address || profile.address || ''],
                ] as const
              ).map(([key, label, value]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>
                    <input
                      className="field-edit"
                      aria-label={label}
                      value={value}
                      placeholder="Not on file"
                      onChange={(event) => onContact?.(key, event.target.value)}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="dossier-block">
            <h4>Interests</h4>
            {profile.interests.length === 0 ? (
              <p className="muted">None captured yet.</p>
            ) : (
              <ul className="dossier-interests">
                {profile.interests.map((interest) => (
                  <li key={interest}>{INTEREST_LABEL[interest] ?? interest}</li>
                ))}
              </ul>
            )}
          </section>

          <section className="dossier-block">
            <h4>Life Events</h4>
            {(profile.lifeEvents ?? []).length === 0 ? (
              <p className="muted">No life events on file.</p>
            ) : (
              <ol className="dossier-timeline">
                {(profile.lifeEvents ?? []).map((event) => (
                  <li key={`${event.when}-${event.label}`}>
                    <span className="dossier-when">{event.when}</span>
                    <span>{event.label}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="dossier-block">
            <h4>What Matters in the Relationship</h4>
            <p>{person.tagline}</p>
          </section>
        </div>
      </div>
    </div>
  )
}
