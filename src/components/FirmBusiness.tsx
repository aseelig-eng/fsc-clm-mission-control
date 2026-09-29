import { useState } from 'react'
import { firmBusinessFor, type LineOfBusinessId } from '../data/firmBusiness'

type Props = {
  householdId: string
  householdName: string
}

// Line-drawn glyphs per line of business, matching the app's 24×24 stroke icons.
function LobGlyph({ id }: { id: LineOfBusinessId }) {
  const s = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (id === 'banking') {
    // Bank / deposits — columned building
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 9l8-4 8 4" {...s} />
        <path d="M4 10h16M5 20h14" {...s} />
        <path d="M7 10v8M12 10v8M17 10v8" {...s} />
      </svg>
    )
  }
  if (id === 'insurance') {
    // Insurance — shield with check
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M12 3l7 3v6c0 4.5-3 7-7 9-4-2-7-4.5-7-9V6z" {...s} />
        <path d="M9 12l2 2 4-4" {...s} />
      </svg>
    )
  }
  if (id === 'asset_mgmt') {
    // Asset management — upward trend
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <path d="M4 16l5-5 3 3 8-8" {...s} />
        <path d="M14 6h6v6" {...s} />
      </svg>
    )
  }
  if (id === 'lending') {
    // Lending — credit card
    return (
      <svg viewBox="0 0 24 24" aria-hidden>
        <rect x="3" y="6" width="18" height="12" rx="2" {...s} />
        <path d="M3 10h18M7 15h4" {...s} />
      </svg>
    )
  }
  // trust — scales of justice
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M8 19h8M6 8h12" {...s} />
      <path d="M6 8l-3 5M6 8l3 5M18 8l-3 5M18 8l3 5" {...s} />
      <path d="M3 13a3 2 0 006 0M15 13a3 2 0 006 0" {...s} />
      <circle cx="12" cy="5" r="1" {...s} />
    </svg>
  )
}

// One-line headline shown on an engaged tile — the first detail value, or the
// relationship owner if there is no dollar figure.
function headline(relationshipOwner: string | undefined, details: { value: string }[]): string {
  return details[0]?.value ?? relationshipOwner ?? 'Engaged'
}

export function FirmBusiness({ householdId, householdName }: Props) {
  const [openLine, setOpenLine] = useState<LineOfBusinessId | null>(null)

  const profile = firmBusinessFor(householdId)
  const lines = profile.lines
  const active = openLine ? lines.find((l) => l.id === openLine) ?? null : null
  const engagedCount = lines.filter((l) => l.hasBusiness).length

  return (
    <div className="firm-map">
      <div className="firm-map-head">
        <span className="firm-map-kicker">Across the firm</span>
        <span className="firm-map-count">
          <strong>{engagedCount}</strong> of {lines.length} lines engaged
        </span>
      </div>

      <div className="firm-map-grid" role="list">
        {lines.map((lob) => {
          const clickable = lob.hasBusiness
          const isOpen = openLine === lob.id
          return (
            <button
              key={lob.id}
              type="button"
              role="listitem"
              className={`firm-tile ${lob.hasBusiness ? 'has' : 'none'} ${isOpen ? 'open' : ''}`}
              aria-pressed={isOpen}
              disabled={!clickable}
              title={
                lob.hasBusiness
                  ? `View ${lob.label} relationship`
                  : `${lob.label} — no business on file`
              }
              onClick={() => clickable && setOpenLine(isOpen ? null : lob.id)}
            >
              <span className="firm-tile-top">
                <span className="firm-tile-glyph" aria-hidden>
                  <LobGlyph id={lob.id} />
                </span>
                <span className={`firm-tile-dot ${lob.hasBusiness ? 'has' : 'none'}`} aria-hidden />
              </span>
              <span className="firm-tile-label">{lob.label}</span>
              <span className="firm-tile-state">
                {lob.hasBusiness ? headline(lob.relationshipOwner, lob.details) : 'No business'}
              </span>
            </button>
          )
        })}
      </div>

      {active && active.hasBusiness && (
        <div className="firm-detail">
          <div className="firm-detail-head">
            <span className="firm-detail-glyph" aria-hidden>
              <LobGlyph id={active.id} />
            </span>
            <div>
              <strong>{active.label}</strong>
              {active.relationshipOwner && <span className="muted"> · {active.relationshipOwner}</span>}
            </div>
            <button type="button" className="firm-detail-close" onClick={() => setOpenLine(null)}>
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
      <span className="sr-only">{householdName} business across the firm</span>
    </div>
  )
}
