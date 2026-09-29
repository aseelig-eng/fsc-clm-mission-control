import { useMemo, useState } from 'react'
import { personsForHousehold } from '../data/portraits'
import type { Household } from '../data/types'

type Props = {
  household: Household
  onClose: () => void
}

type InviteStatus = 'not_invited' | 'sent' | 'opened' | 'activated'

type MemberRow = {
  id: string
  name: string
  role: string
  email: string
  emailValid: boolean
  emailMissing: boolean
  selected: boolean
  status: InviteStatus
}

type PartyRow = {
  id: string
  name: string
  relationship: string
  email: string
  status: InviteStatus
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function statusLabel(status: InviteStatus) {
  if (status === 'sent') return 'Invite sent'
  if (status === 'opened') return 'Opened'
  if (status === 'activated') return 'Activated'
  return 'Not invited'
}

// Deterministic post-send progression so the demo shows a realistic mix
// of sent / opened / activated states without any timers.
function progressedStatus(seed: string): InviteStatus {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) & 0xffff
  const roll = hash % 3
  if (roll === 0) return 'activated'
  if (roll === 1) return 'opened'
  return 'sent'
}

export function PortalSetup({ household, onClose }: Props) {
  const persons = useMemo(() => personsForHousehold(household.id), [household.id])

  const [members, setMembers] = useState<MemberRow[]>(() =>
    persons
      .filter((p) => !p.profile.deceased)
      .map((p) => {
        const email = p.profile.email ?? ''
        return {
          id: p.id,
          name: p.name,
          role: p.role,
          email,
          emailValid: EMAIL_RE.test(email),
          emailMissing: email.trim() === '',
          selected: EMAIL_RE.test(email),
          status: 'not_invited' as InviteStatus,
        }
      }),
  )

  const [parties, setParties] = useState<PartyRow[]>([])
  const [partyName, setPartyName] = useState('')
  const [partyRel, setPartyRel] = useState('CPA')
  const [partyEmail, setPartyEmail] = useState('')
  const [sent, setSent] = useState(false)

  function toggleMember(id: string) {
    setMembers((rows) => rows.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r)))
  }

  function updateEmail(id: string, email: string) {
    setMembers((rows) =>
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              email,
              emailValid: EMAIL_RE.test(email),
              emailMissing: email.trim() === '',
              selected: r.selected && EMAIL_RE.test(email),
            }
          : r,
      ),
    )
  }

  function addParty() {
    const email = partyEmail.trim()
    if (partyName.trim() === '' || !EMAIL_RE.test(email)) return
    setParties((rows) => [
      ...rows,
      {
        id: `party-${rows.length}-${partyName.trim().toLowerCase().replace(/\s+/g, '-')}`,
        name: partyName.trim(),
        relationship: partyRel,
        email,
        status: 'not_invited',
      },
    ])
    setPartyName('')
    setPartyEmail('')
    setPartyRel('CPA')
  }

  function removeParty(id: string) {
    setParties((rows) => rows.filter((r) => r.id !== id))
  }

  const selectedMembers = members.filter((m) => m.selected && m.emailValid)
  const blockedMembers = members.filter((m) => m.selected && !m.emailValid)
  const inviteCount = selectedMembers.length + parties.length

  function sendInvites() {
    if (inviteCount === 0) return
    setMembers((rows) =>
      rows.map((r) =>
        r.selected && r.emailValid ? { ...r, status: progressedStatus(r.id + r.email) } : r,
      ),
    )
    setParties((rows) => rows.map((r) => ({ ...r, status: progressedStatus(r.id + r.email) })))
    setSent(true)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card portal-setup"
        role="dialog"
        aria-modal="true"
        aria-label="One-click portal setup"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="portal-kicker">One-click portal setup</div>
            <h2>{household.name}</h2>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              Select household members, confirm their email, and send secure portal invitations.
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <section className="setup-section">
          <div className="setup-section-head">
            <h3>Household members</h3>
            <span className="muted">Full access — view &amp; take action</span>
          </div>
          <ul className="setup-list">
            {members.map((m) => (
              <li key={m.id} className={`setup-member ${m.selected ? 'is-selected' : ''}`}>
                <label className="setup-check">
                  <input
                    type="checkbox"
                    checked={m.selected}
                    disabled={!m.emailValid}
                    onChange={() => toggleMember(m.id)}
                  />
                  <span>
                    <strong>{m.name}</strong>
                    <span className="muted">{m.role}</span>
                  </span>
                </label>
                <div className="setup-email">
                  <input
                    type="email"
                    value={m.email}
                    placeholder="Add email to invite"
                    onChange={(event) => updateEmail(m.id, event.target.value)}
                  />
                  {m.emailMissing ? (
                    <span className="setup-flag warn">Email missing — add to invite</span>
                  ) : !m.emailValid ? (
                    <span className="setup-flag warn">Invalid email</span>
                  ) : (
                    <span className="setup-flag ok">Pulled from record</span>
                  )}
                </div>
                <span className={`invite-status status-${m.status}`}>{statusLabel(m.status)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="setup-section">
          <div className="setup-section-head">
            <h3>Interested parties</h3>
            <span className="muted">View-only · revocable</span>
          </div>
          <p className="muted setup-hint">
            Invite a CPA, attorney, or other trusted party. They receive read-only access — they
            cannot take action or update anything, and access can be revoked at any time.
          </p>
          {parties.length > 0 && (
            <ul className="setup-list">
              {parties.map((p) => (
                <li key={p.id} className="setup-party">
                  <span>
                    <strong>{p.name}</strong>
                    <span className="muted">
                      {p.relationship} · {p.email}
                    </span>
                  </span>
                  <span className="viewonly-badge">View-only</span>
                  <span className={`invite-status status-${p.status}`}>{statusLabel(p.status)}</span>
                  <button type="button" className="btn ghost" onClick={() => removeParty(p.id)}>
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="setup-party-add">
            <input
              type="text"
              value={partyName}
              placeholder="Name"
              onChange={(event) => setPartyName(event.target.value)}
            />
            <select value={partyRel} onChange={(event) => setPartyRel(event.target.value)}>
              <option value="CPA">CPA</option>
              <option value="Attorney">Attorney</option>
              <option value="Trustee">Trustee</option>
              <option value="Family office">Family office</option>
              <option value="Other">Other</option>
            </select>
            <input
              type="email"
              value={partyEmail}
              placeholder="Email"
              onChange={(event) => setPartyEmail(event.target.value)}
            />
            <button
              type="button"
              className="btn"
              disabled={partyName.trim() === '' || !EMAIL_RE.test(partyEmail.trim())}
              onClick={addParty}
            >
              Add party
            </button>
          </div>
        </section>

        <div className="setup-footer">
          <div className="setup-summary">
            {blockedMembers.length > 0 && (
              <span className="setup-flag warn">
                {blockedMembers.length} member{blockedMembers.length === 1 ? '' : 's'} need a valid email
              </span>
            )}
            <span className="muted">
              {inviteCount} invitation{inviteCount === 1 ? '' : 's'} ready
              {parties.length > 0 ? ` · ${parties.length} view-only` : ''}
            </span>
          </div>
          <button type="button" className="btn primary" disabled={inviteCount === 0} onClick={sendInvites}>
            {sent ? 'Resend invitations' : 'Send invitations'}
          </button>
        </div>

        {sent && (
          <div className="setup-confirm" role="status">
            Invitations sent to {inviteCount} recipient{inviteCount === 1 ? '' : 's'}. Statuses update
            as each recipient opens and activates their portal.
          </div>
        )}
      </div>
    </div>
  )
}
