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

// Compact glyphs per line of business, keyed so each pill reads at a glance.
const LOB_GLYPH: Record<LineOfBusinessId, string> = {
  banking: '🏦',
  insurance: '🛡',
  asset_mgmt: '📈',
  lending: '💳',
  trust: '⚖',
}

export function FirmBusiness({
  householdId,
  householdName,
  config,
  role,
  onToggleEnabled,
}: Props) {
  const [openLine, setOpenLine] = useState<LineOfBusinessId | null>(null)

  // Firm/tenant switch is OFF — a single slim opt-in line, not a bulky card.
  if (!canViewWidget(config, role)) {
    return (
      <div className="firm-strip firm-strip-off">
        <span className="firm-strip-lock" aria-hidden>
          🔒
        </span>
        <span className="firm-strip-off-text">
          <strong>Business across the firm</strong>
          <span className="muted"> · gated by information-barrier policy (opt-in)</span>
        </span>
        {onToggleEnabled && role === 'advisor' && (
          <button type="button" className="firm-strip-link" onClick={() => onToggleEnabled(true)}>
            Enable
          </button>
        )}
      </div>
    )
  }

  const profile = firmBusinessFor(householdId)
  const lines = visibleLinesFor(profile, config)
  const detailAllowed = canViewDetail(config, role)
  const active = openLine ? lines.find((l) => l.id === openLine) ?? null : null
  const engagedCount = lines.filter((l) => l.hasBusiness).length

  return (
    <div className="firm-strip">
      <div className="firm-strip-head">
        <span className="firm-strip-title">Business across the firm</span>
        <span className="firm-strip-count">
          {engagedCount}/{lines.length} engaged
        </span>
        {onToggleEnabled && role === 'advisor' && (
          <button
            type="button"
            className="firm-strip-link subtle"
            title="Firm/tenant visibility switch"
            onClick={() => onToggleEnabled(false)}
          >
            Disable
          </button>
        )}
      </div>

      <div className="firm-pills" role="list">
        {lines.map((lob) => {
          const clickable = detailAllowed && lob.hasBusiness
          const isOpen = openLine === lob.id
          return (
            <button
              key={lob.id}
              type="button"
              role="listitem"
              className={`firm-pill ${lob.hasBusiness ? 'has' : 'none'} ${isOpen ? 'open' : ''}`}
              aria-pressed={isOpen}
              disabled={!clickable}
              title={
                lob.hasBusiness
                  ? clickable
                    ? `View ${lob.label} detail`
                    : `${lob.label} — has business`
                  : `${lob.label} — no business`
              }
              onClick={() => clickable && setOpenLine(isOpen ? null : lob.id)}
            >
              <span className="firm-pill-glyph" aria-hidden>
                {LOB_GLYPH[lob.id]}
              </span>
              <span className="firm-pill-label">{lob.label}</span>
              <span className={`firm-pill-flag ${lob.hasBusiness ? 'has' : 'none'}`} aria-hidden />
            </button>
          )
        })}
      </div>

      {!detailAllowed && (
        <p className="firm-strip-note muted">Indicator only — detail restricted by policy for your role.</p>
      )}

      {detailAllowed && active && active.hasBusiness && (
        <div className="firm-detail">
          <div className="firm-detail-head">
            <span className="firm-detail-glyph" aria-hidden>
              {LOB_GLYPH[active.id]}
            </span>
            <div>
              <strong>{active.label}</strong>
              {active.relationshipOwner && (
                <span className="muted"> · {active.relationshipOwner}</span>
              )}
            </div>
            <button type="button" className="firm-strip-link subtle" onClick={() => setOpenLine(null)}>
              Close
            </button>
          </div>
          <ul className="firm-detail-list">
            {active.details.map((row, index) => (
              <li key={`${active.id}-${index}`}>
                <span className="firm-detail-label">{row.label}</span>
                <span className="firm-detail-value">{row.value}</span>
                <span className="muted firm-detail-owner">{row.owner}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <span className="sr-only">{householdName} cross-firm business summary</span>
    </div>
  )
}
