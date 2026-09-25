import {
  compositeScore,
  readinessBand,
  type DocState,
  type GenerationalProfile,
  type HeirStance,
} from '../data/generational'

const STANCE: Record<HeirStance, string> = {
  unknown: 'Never met',
  light: 'Light contact',
  known: 'Known',
}

const DOC: Record<DocState, string> = {
  current: 'Current',
  stale: 'Stale',
  missing: 'Missing',
}

function tone(score: number) {
  if (score < 45) return 'danger'
  if (score < 80) return 'warn'
  return 'ok'
}

function Ring({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const filled = (score / 100) * circumference
  return (
    <svg className={`handoff-ring tone-${tone(score)}`} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--sf-gray-5)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform="rotate(-90 48 48)"
      />
      <text x="48" y="46" textAnchor="middle" fontSize="22" fontWeight="800" fill="currentColor">
        {score}
      </text>
      <text x="48" y="62" textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--sf-gray-3)">
        READINESS
      </text>
    </svg>
  )
}

export function GenerationalHandoff({
  profile,
  onClose,
  onAct,
}: {
  profile: GenerationalProfile
  onClose: () => void
  onAct: (label: string) => void
}) {
  const score = compositeScore(profile)
  const pillars = [
    { label: 'Beneficiaries', score: profile.beneficiaries, note: 'Can the account move' },
    { label: 'Next generation', score: profile.engagement, note: 'Have we met them' },
    { label: 'Documents', score: profile.documents, note: 'Is the paper current' },
  ]

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card handoff"
        role="dialog"
        aria-modal="true"
        aria-labelledby="handoff-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="likeness-kicker">Generational Handoff</div>
            <h2 id="handoff-title">{profile.principal}</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="handoff-hero">
          <Ring score={score} />
          <div>
            <strong>
              {readinessBand(score)}
              {profile.principalAge ? ` · age ${profile.principalAge}` : ''}
            </strong>
            <p>{profile.risk}</p>
          </div>
        </div>

        <div className="handoff-pillars">
          {pillars.map((pillar) => (
            <div key={pillar.label} className={`handoff-pillar tone-${tone(pillar.score)}`}>
              <span>{pillar.label}</span>
              <strong>{pillar.score}</strong>
              <div className="book-meter-track" aria-hidden="true">
                <div className={`book-meter-fill tone-${tone(pillar.score)}`} style={{ width: `${Math.max(pillar.score, 4)}%` }} />
              </div>
              <em>{pillar.note}</em>
            </div>
          ))}
        </div>

        <section className="dossier-block">
          <h4>Who Would Inherit</h4>
          {profile.heirs.length === 0 ? (
            <p className="muted">No one is named to receive this relationship.</p>
          ) : (
            <ul className="handoff-people">
              {profile.heirs.map((heir) => (
                <li key={heir.name}>
                  <span className={`handoff-stance stance-${heir.stance}`}>{STANCE[heir.stance]}</span>
                  <div>
                    <strong>{heir.name}</strong>
                    <span>
                      {heir.relationship} · {heir.lastTouch}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dossier-block">
          <h4>What Would Break the Transfer</h4>
          <p className="muted">{profile.beneficiaryLine}</p>
          <ul className="handoff-gaps">
            {profile.gaps.map((gap) => (
              <li key={gap.account}>
                <strong>{gap.account}</strong>
                <span>{gap.issue}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="dossier-block">
          <h4>Document Currency</h4>
          <ul className="handoff-docs">
            {profile.docs.map((doc) => (
              <li key={doc.name}>
                <span>{doc.name}</span>
                <span className={`handoff-doc tone-${doc.state}`}>{DOC[doc.state]}</span>
                <span className="muted">{doc.updated ?? '—'}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="modal-actions-title">What to Do</div>
        <ul className="advisor-action-list modal">
          {profile.actions.map((action) => (
            <li key={action.label}>
              <button type="button" className="advisor-action-btn" onClick={() => onAct(action.label)}>
                <span className="action-label">{action.label}</span>
                <span className="action-detail">{action.detail}</span>
              </button>
            </li>
          ))}
        </ul>
        <p className="handoff-note">
          Most heirs leave the incumbent advisor within a year of inheritance. Readiness above 80 is when that risk drops.
        </p>
      </div>
    </div>
  )
}
