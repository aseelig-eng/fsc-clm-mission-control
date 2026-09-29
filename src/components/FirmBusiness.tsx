import { useState } from 'react'
import {
  canViewDetail,
  canViewWidget,
  firmBusinessFor,
  visibleLinesFor,
  type FirmBusinessConfig,
  type FirmRole,
  type LineOfBusinessId,
} from '../data/firmBusiness'

type Props = {
  householdId: string
  householdName: string
  config: FirmBusinessConfig
  role: FirmRole
  /** Advisor-facing toggle to flip the firm/tenant switch in the demo. */
  onToggleEnabled?: (enabled: boolean) => void
}

export function FirmBusiness({
  householdId,
  householdName,
  config,
  role,
  onToggleEnabled,
}: Props) {
  const [openLine, setOpenLine] = useState<LineOfBusinessId | null>(null)

  // Firm/tenant switch is OFF — surface an opt-in affordance for the advisor.
  if (!canViewWidget(config, role)) {
    return (
      <div className="firm-business firm-business-off">
        <div className="firm-business-head">
          <div>
            <span className="firm-business-kicker">Business across the firm</span>
            <p className="muted" style={{ margin: '2px 0 0' }}>
              Disabled for this firm. Cross-firm visibility is gated by information-barrier
              policy and is opt-in.
            </p>
          </div>
          {onToggleEnabled && role === 'advisor' && (
            <button type="button" className="btn" onClick={() => onToggleEnabled(true)}>
              Enable (demo)
            </button>
          )}
        </div>
      </div>
    )
  }

  const profile = firmBusinessFor(householdId)
  const lines = visibleLinesFor(profile, config)
  const detailAllowed = canViewDetail(config, role)
  const active = openLine ? lines.find((l) => l.id === openLine) ?? null : null
  const engagedCount = lines.filter((l) => l.hasBusiness).length

  return (
    <div className="firm-business">
      <div className="firm-business-head">
        <div>
          <span className="firm-business-kicker">Business across the firm</span>
          <p className="muted" style={{ margin: '2px 0 0' }}>
            {householdName} · {engagedCount} of {lines.length} lines engaged
          </p>
        </div>
        {onToggleEnabled && role === 'advisor' && (
          <button type="button" className="btn ghost" onClick={() => onToggleEnabled(false)}>
            Disable
          </button>
        )}
      </div>

      <div className="firm-business-chips">
        {lines.map((lob) => {
          const clickable = detailAllowed && lob.hasBusiness
          return (
            <button
              key={lob.id}
              type="button"
              className={`lob-chip ${lob.hasBusiness ? 'has' : 'none'} ${
                openLine === lob.id ? 'active' : ''
              }`}
              aria-pressed={openLine === lob.id}
              disabled={!clickable}
              onClick={() => clickable && setOpenLine(openLine === lob.id ? null : lob.id)}
            >
              <span className={`lob-dot ${lob.hasBusiness ? 'has' : 'none'}`} aria-hidden />
              <span className="lob-name">{lob.label}</span>
              <span className="lob-state">{lob.hasBusiness ? 'Has business' : 'None'}</span>
            </button>
          )
        })}
      </div>

      {!detailAllowed && (
        <p className="muted firm-business-note">
          Detail drill-in is restricted by policy for your role — indicator only.
        </p>
      )}

      {detailAllowed && active && active.hasBusiness && (
        <div className="lob-detail">
          <div className="lob-detail-head">
            <strong>{active.label}</strong>
            {active.relationshipOwner && (
              <span className="muted">Relationship owner · {active.relationshipOwner}</span>
            )}
          </div>
          <ul className="lob-detail-list">
            {active.details.map((row, index) => (
              <li key={`${active.id}-${index}`}>
                <span className="lob-detail-label">{row.label}</span>
                <span className="lob-detail-value">{row.value}</span>
                <span className="muted lob-detail-owner">{row.owner}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
