import { useState } from 'react'
import {
  CLIENT_SEGMENTS,
  RELATED_PARTY_ROLES,
  type ContactChannel,
  type ExtraMember,
  type PersonLikeness,
  type RelatedParty,
} from '../data/portraits'
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

// Suggestable interests the advisor can add with one click.
const INTEREST_SUGGESTIONS = ['tech', 'travel', 'family', 'markets', 'garden', 'art', 'sports', 'philanthropy', 'wine', 'real_estate'] as const

function interestLabel(id: string) {
  return INTEREST_LABEL[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

type ProfileEdit = {
  sentiment?: string
  preferredContact?: ContactChannel[]
  interests?: string[]
  segment?: string
  referredBy?: string
}

type HouseholdExtra = {
  name?: string
  members: ExtraMember[]
  relatedParties: RelatedParty[]
  log: string[]
}

type HouseholdPatch = {
  name?: string
  members?: ExtraMember[]
  relatedParties?: RelatedParty[]
  logEntry?: string
}

export function ClientDossier({
  householdName,
  persons,
  initialPersonId,
  contact,
  edits,
  householdExtra,
  onContact,
  onProfile,
  onHousehold,
  onClose,
}: {
  householdName: string
  persons: PersonLikeness[]
  initialPersonId: string
  contact?: { email?: string; phone?: string; address?: string }
  edits?: Record<string, ProfileEdit>
  householdExtra?: HouseholdExtra
  onContact?: (key: 'email' | 'phone' | 'address', value: string) => void
  onProfile?: (personId: string, patch: ProfileEdit) => void
  onHousehold?: (patch: HouseholdPatch) => void
  onClose: () => void
}) {
  const [personId, setPersonId] = useState(initialPersonId)
  const [manageOpen, setManageOpen] = useState(false)
  const [newInterest, setNewInterest] = useState('')
  const [memberName, setMemberName] = useState('')
  const [memberRole, setMemberRole] = useState('Spouse / Partner')
  const [partyName, setPartyName] = useState('')
  const [partyRole, setPartyRole] = useState<string>(RELATED_PARTY_ROLES[0])
  const [partyFirm, setPartyFirm] = useState('')
  const [partyContact, setPartyContact] = useState('')
  const [householdRename, setHouseholdRename] = useState('')
  const [mergeWith, setMergeWith] = useState('')
  const [splitMember, setSplitMember] = useState('')

  const person = persons.find((p) => p.id === personId) ?? persons[0]
  if (!person) return null
  const profile = person.profile
  const edit = edits?.[person.id]
  const preferred = edit?.preferredContact ?? profile.preferredContact ?? []
  const sentiment = edit?.sentiment ?? profile.sentiment ?? person.tagline
  const interests = edit?.interests ?? profile.interests
  const segment = edit?.segment ?? profile.segment ?? ''
  const referredBy = edit?.referredBy ?? profile.referredBy ?? ''

  const extraMembers = householdExtra?.members ?? []
  const relatedParties = householdExtra?.relatedParties ?? []
  const displayName = householdExtra?.name ?? householdName
  const log = householdExtra?.log ?? []

  function addInterest(raw: string) {
    const value = raw.trim().toLowerCase().replace(/\s+/g, '_')
    if (!value || interests.includes(value)) return
    onProfile?.(person.id, { interests: [...interests, value] })
  }

  function removeInterest(value: string) {
    onProfile?.(person.id, { interests: interests.filter((item) => item !== value) })
  }

  function addMember() {
    const name = memberName.trim()
    if (!name) return
    const member: ExtraMember = { id: `m-${name.replace(/\s+/g, '-').toLowerCase()}-${extraMembers.length}`, name, role: memberRole }
    onHousehold?.({ members: [...extraMembers, member], logEntry: `Added ${name} (${memberRole}) to the household.` })
    setMemberName('')
  }

  function removeMember(id: string) {
    const gone = extraMembers.find((m) => m.id === id)
    onHousehold?.({
      members: extraMembers.filter((m) => m.id !== id),
      logEntry: gone ? `Removed ${gone.name} from the household.` : undefined,
    })
  }

  function addParty() {
    const name = partyName.trim()
    if (!name) return
    const party: RelatedParty = {
      id: `rp-${name.replace(/\s+/g, '-').toLowerCase()}-${relatedParties.length}`,
      name,
      role: partyRole,
      firm: partyFirm.trim() || undefined,
      contact: partyContact.trim() || undefined,
    }
    onHousehold?.({ relatedParties: [...relatedParties, party], logEntry: `Linked ${name} as ${partyRole}.` })
    setPartyName('')
    setPartyFirm('')
    setPartyContact('')
  }

  function removeParty(id: string) {
    const gone = relatedParties.find((p) => p.id === id)
    onHousehold?.({
      relatedParties: relatedParties.filter((p) => p.id !== id),
      logEntry: gone ? `Unlinked ${gone.name} (${gone.role}).` : undefined,
    })
  }

  function renameHousehold() {
    const name = householdRename.trim()
    if (!name || name === displayName) return
    onHousehold?.({ name, logEntry: `Renamed household “${displayName}” → “${name}”.` })
    setHouseholdRename('')
  }

  function doMerge() {
    const into = mergeWith.trim()
    if (!into) return
    onHousehold?.({ logEntry: `Merge requested: fold “${displayName}” into “${into}”. Queued for advisor review — nothing was combined at the custodian.` })
    setMergeWith('')
  }

  function doSplit() {
    const who = splitMember.trim()
    if (!who) return
    onHousehold?.({ logEntry: `Split requested: move ${who} into a new household. Queued for advisor review — accounts stay put until confirmed.` })
    setSplitMember('')
  }

  const splitCandidates = [...persons.map((p) => p.name), ...extraMembers.map((m) => m.name)]

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
          {extraMembers.map((m) => (
            <div key={m.id} className="dossier-tab extra" title={`${m.name} · ${m.role}`}>
              <span className="person-avatar" style={{ background: '#94a3b8' }}>
                {m.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span>{m.name.split(' ')[0]}</span>
            </div>
          ))}
        </aside>
        <div className="dossier-page">
          <div className="modal-header">
            <div>
              <div className="likeness-kicker">{displayName}</div>
              <h2 id="dossier-title">Relationship File</h2>
            </div>
            <div className="dossier-header-actions">
              <button type="button" className={`btn ${manageOpen ? 'primary' : ''}`} onClick={() => setManageOpen((v) => !v)}>
                {manageOpen ? 'Done managing' : 'Manage household'}
              </button>
              <button type="button" className="btn" onClick={onClose}>
                Close
              </button>
            </div>
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

          {manageOpen && (
            <section className="dossier-block dossier-manage">
              <h4>Manage Household</h4>

              <div className="dossier-manage-grid">
                <div className="dossier-manage-card">
                  <h5>Update household</h5>
                  <label>
                    Household name
                    <input
                      className="field-edit"
                      value={householdRename}
                      placeholder={displayName}
                      onChange={(event) => setHouseholdRename(event.target.value)}
                    />
                  </label>
                  <button type="button" className="btn" onClick={renameHousehold}>
                    Rename household
                  </button>
                </div>

                <div className="dossier-manage-card">
                  <h5>Add a person</h5>
                  <label>
                    Name
                    <input className="field-edit" value={memberName} placeholder="Full name" onChange={(event) => setMemberName(event.target.value)} />
                  </label>
                  <label>
                    Role
                    <select value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>
                      {['Spouse / Partner', 'Child', 'Dependent', 'Parent', 'Sibling', 'Trusted contact', 'Other'].map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="btn" onClick={addMember}>
                    Add to household
                  </button>
                </div>

                <div className="dossier-manage-card">
                  <h5>Merge household</h5>
                  <label>
                    Merge into
                    <input
                      className="field-edit"
                      value={mergeWith}
                      placeholder="Other household name"
                      onChange={(event) => setMergeWith(event.target.value)}
                    />
                  </label>
                  <button type="button" className="btn" onClick={doMerge}>
                    Request merge
                  </button>
                </div>

                <div className="dossier-manage-card">
                  <h5>Split household</h5>
                  <label>
                    Move person out
                    <select value={splitMember} onChange={(event) => setSplitMember(event.target.value)}>
                      <option value="">Choose a person</option>
                      {splitCandidates.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="button" className="btn" onClick={doSplit}>
                    Request split
                  </button>
                </div>
              </div>

              {extraMembers.length > 0 && (
                <div className="dossier-manage-list">
                  <h5>Added people</h5>
                  <ul>
                    {extraMembers.map((m) => (
                      <li key={m.id}>
                        <span>
                          <strong>{m.name}</strong> · {m.role}
                        </span>
                        <button type="button" className="link-btn" onClick={() => removeMember(m.id)}>
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="dossier-manage-card wide">
                <h5>Add a related party</h5>
                <div className="dossier-party-grid">
                  <label>
                    Name
                    <input className="field-edit" value={partyName} placeholder="e.g. Dana Cross" onChange={(event) => setPartyName(event.target.value)} />
                  </label>
                  <label>
                    Role
                    <select value={partyRole} onChange={(event) => setPartyRole(event.target.value)}>
                      {RELATED_PARTY_ROLES.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Firm
                    <input className="field-edit" value={partyFirm} placeholder="Firm (optional)" onChange={(event) => setPartyFirm(event.target.value)} />
                  </label>
                  <label>
                    Contact
                    <input className="field-edit" value={partyContact} placeholder="Email or phone (optional)" onChange={(event) => setPartyContact(event.target.value)} />
                  </label>
                </div>
                <button type="button" className="btn" onClick={addParty}>
                  Link related party
                </button>
              </div>

              {log.length > 0 && (
                <div className="dossier-manage-list">
                  <h5>Recent changes</h5>
                  <ul className="dossier-log">
                    {log.slice(0, 6).map((entry, index) => (
                      <li key={`${index}-${entry}`}>{entry}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

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
            <h4>Segment &amp; Referral</h4>
            <dl className="dossier-facts">
              <div>
                <dt>Segment</dt>
                <dd>
                  <select
                    className="field-edit"
                    aria-label="Segment"
                    value={segment}
                    onChange={(event) => onProfile?.(person.id, { segment: event.target.value })}
                  >
                    <option value="">Not set</option>
                    {CLIENT_SEGMENTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </dd>
              </div>
              <div>
                <dt>Referred by</dt>
                <dd>
                  <input
                    className="field-edit"
                    aria-label="Referred by"
                    value={referredBy}
                    placeholder="Who referred them?"
                    onChange={(event) => onProfile?.(person.id, { referredBy: event.target.value })}
                  />
                </dd>
              </div>
            </dl>
          </section>

          <section className="dossier-block">
            <h4>Interests</h4>
            {interests.length === 0 ? (
              <p className="muted">None captured yet.</p>
            ) : (
              <ul className="dossier-interests">
                {interests.map((interest) => (
                  <li key={interest}>
                    {interestLabel(interest)}
                    <button
                      type="button"
                      className="chip-remove"
                      aria-label={`Remove ${interestLabel(interest)}`}
                      onClick={() => removeInterest(interest)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="dossier-interest-add">
              <div className="dossier-interest-suggestions">
                {INTEREST_SUGGESTIONS.filter((item) => !interests.includes(item)).map((item) => (
                  <button key={item} type="button" className="chip-add" onClick={() => addInterest(item)}>
                    + {interestLabel(item)}
                  </button>
                ))}
              </div>
              <form
                className="dossier-interest-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  addInterest(newInterest)
                  setNewInterest('')
                }}
              >
                <input
                  className="field-edit"
                  value={newInterest}
                  placeholder="Add another interest"
                  aria-label="Add another interest"
                  onChange={(event) => setNewInterest(event.target.value)}
                />
                <button type="submit" className="btn">
                  Add
                </button>
              </form>
            </div>
          </section>

          {relatedParties.length > 0 && (
            <section className="dossier-block">
              <h4>Related Parties</h4>
              <ul className="dossier-parties">
                {relatedParties.map((party) => (
                  <li key={party.id}>
                    <span>
                      <strong>{party.name}</strong> · {party.role}
                      {party.firm ? ` · ${party.firm}` : ''}
                      {party.contact ? <em> · {party.contact}</em> : null}
                    </span>
                    <button type="button" className="link-btn" onClick={() => removeParty(party.id)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

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
