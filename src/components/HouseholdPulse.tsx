import { MATURITY_LABELS, type PersonLikeness } from '../data/portraits'
import type { ExceptionItem, Household, LifecycleStage } from '../data/types'

export type PulseNodeId = 'engage' | 'lifecycle' | 'likeness' | 'heirs' | 'custodian'

type Props = {
  household: Household
  person: PersonLikeness
  persons: PersonLikeness[]
  exceptions: ExceptionItem[]
  selectedNodeId: PulseNodeId | null
  onSelectPerson: (personId: string) => void
  onSelectNode: (nodeId: PulseNodeId) => void
}

function statusLabel(status: LifecycleStage['status']) {
  if (status === 'blocked') return 'Blocked'
  if (status === 'agent-running') return 'Agent running'
  if (status === 'active') return 'Needs you'
  return status
}

export function HouseholdPulse({
  household,
  person,
  persons,
  exceptions,
  selectedNodeId,
  onSelectPerson,
  onSelectNode,
}: Props) {
  const engage = person.facets.find((f) => f.id === 'engagement')
  const heirs = person.facets.find((f) => f.id === 'heir_readiness')
  const maturity = person.maturity
  const tier = MATURITY_LABELS[maturity.tier]

  const activeStage =
    household.stages.find((s) => s.status === 'blocked') ||
    household.stages.find((s) => s.status === 'active' || s.status === 'agent-running') ||
    household.stages.find((s) => s.id === household.stage)

  const needsResolution =
    !!activeStage &&
    (activeStage.status === 'blocked' ||
      ((activeStage.status === 'active' || activeStage.status === 'agent-running') && !!activeStage.unblock))

  const topEx = exceptions[0]
  const signalCount = Math.max(exceptions.length, household.exceptions)
  const capacity = 11
  const attentionPct = Math.min(100, Math.round((signalCount / capacity) * 100))
  const stagesCleared = household.stages.filter((s) => s.status === 'complete').length

  const statusLine = topEx
    ? `Needs you · ${topEx.title.split('—')[0].trim()} · ${signalCount} signal${signalCount === 1 ? '' : 's'}`
    : needsResolution && activeStage?.unblock
      ? `Needs you · ${activeStage.unblock.title} · unblock required`
      : `On track · ${household.stageLabel}`

  const heirScore = heirs?.score ?? 0
  const impactLine =
    heirScore < 45
      ? `Heir readiness ${heirScore}% — retention risk if transfer nears`
      : heirScore < 70
        ? `Heir readiness ${heirScore}% — deepen next-gen this quarter`
        : `Heir readiness ${heirScore}% — next-gen path solid`

  const nodes: {
    id: PulseNodeId
    tone: 'ok' | 'warn' | 'danger'
    k: string
    v: string
    s: string
  }[] = [
    {
      id: 'engage',
      tone: 'ok',
      k: 'Engage',
      v: String(engage?.score ?? '—'),
      s: 'Portal · meetings',
    },
    {
      id: 'lifecycle',
      tone: needsResolution ? 'warn' : 'ok',
      k: 'Lifecycle',
      v: activeStage?.label ?? household.stageLabel,
      s: activeStage ? statusLabel(activeStage.status) : household.stageLabel,
    },
    {
      id: 'likeness',
      tone: maturity.score < 45 ? 'warn' : 'ok',
      k: 'Likeness',
      v: `${maturity.score}% ${tier.title}`,
      s: 'Maturity charge',
    },
    {
      id: 'heirs',
      tone: heirScore < 45 ? 'warn' : 'ok',
      k: 'Heirs',
      v: `${heirScore}%`,
      s: heirs?.blurb.split('—')[0].trim().slice(0, 28) || 'Next-gen readiness',
    },
    {
      id: 'custodian',
      tone: topEx ? 'danger' : 'ok',
      k: 'Custodian',
      v: topEx ? 'NIGO' : 'STP',
      s: topEx ? 'STP broken' : 'Clear',
    },
  ]

  return (
    <div className="pulse-panel">
      <div className="pulse-header">
        <div>
          <div className="likeness-kicker">Household pulse</div>
          <h3 className="likeness-title">{household.name}</h3>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            {person.name} · {person.role}. Tap a node for recommended review — same one-click path as Needs you.
          </p>
        </div>
        {persons.length > 1 && (
          <div className="person-switcher">
            {persons.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`person-chip ${person.id === p.id ? 'active' : ''}`}
                style={
                  person.id === p.id ? { borderColor: p.accent, background: `${p.accent}14` } : undefined
                }
                onClick={() => onSelectPerson(p.id)}
              >
                <span className="person-avatar" style={{ background: p.accent }}>
                  {p.initials}
                </span>
                <span>
                  <strong>{p.name}</strong>
                  <span className="muted person-role">{p.role}</span>
                  <span className="person-mat">
                    {MATURITY_LABELS[p.maturity.tier].title} · {p.maturity.score}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pulse-stage">
        <svg className="pulse-flow" viewBox="0 0 400 340" aria-hidden="true">
          <path
            d="M200 70 C200 110, 200 130, 200 160"
            fill="none"
            stroke="var(--sf-blue)"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.55"
          />
          <path
            d="M260 180 C300 180, 330 170, 350 150"
            fill="none"
            stroke="var(--sf-blue)"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.55"
          />
          <path
            d="M240 230 C300 250, 320 270, 330 290"
            fill="none"
            stroke="var(--sf-orange)"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.7"
          />
          <path
            d="M150 220 C100 240, 80 250, 70 270"
            fill="none"
            stroke="var(--sf-blue)"
            strokeWidth="2"
            strokeDasharray="4 4"
            opacity="0.55"
          />
          <path
            d="M160 250 C140 290, 150 300, 170 310"
            fill="none"
            stroke={topEx ? 'var(--sf-red)' : 'var(--sf-green)'}
            strokeWidth="2.5"
            opacity="0.75"
          />
          <circle cx="178" cy="312" r="5" fill={topEx ? 'var(--sf-red)' : 'var(--sf-green)'} />
        </svg>

        <div className="pulse-house-wrap">
          <svg className="pulse-house" viewBox="0 0 240 180" role="img" aria-label={`${household.name} pulse`}>
            <ellipse cx="120" cy="168" rx="88" ry="8" fill="#c5d8e8" opacity="0.7" />
            <path d="M40 95 L120 35 L200 95 Z" fill={person.accent} />
            <rect x="55" y="95" width="130" height="68" fill="#f4f8fb" stroke={person.accent} strokeWidth="2" />
            <rect x="100" y="118" width="28" height="45" fill={person.accent} opacity="0.85" />
            <rect x="70" y="110" width="22" height="18" fill="#9fd4ff" stroke={person.accent} />
            <rect x="148" y="110" width="22" height="18" fill="#ffe8a3" stroke="var(--sf-orange)" />
            <circle cx="120" cy="78" r="18" fill="#fff" stroke={person.accent} strokeWidth="2" />
            <text
              x="120"
              y="82"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill={person.accent}
              fontFamily="system-ui, sans-serif"
            >
              {person.initials}
            </text>
          </svg>
        </div>

        {nodes.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`pulse-node pulse-n-${n.id} tone-${n.tone} ${selectedNodeId === n.id ? 'active' : ''}`}
            aria-pressed={selectedNodeId === n.id}
            onClick={() => onSelectNode(n.id)}
          >
            <span className="k">{n.k}</span>
            <span className="v">{n.v}</span>
            <span className="s">{n.s}</span>
          </button>
        ))}
      </div>

      <div className={`pulse-status ${topEx || needsResolution ? 'needs' : 'ok'}`}>
        <strong>{statusLine}</strong>
      </div>

      <div className="pulse-attn">
        <div className="pulse-attn-label">
          <span>Attention in use</span>
          <span>
            {signalCount} signal{signalCount === 1 ? '' : 's'} · capacity ~{capacity}
          </span>
        </div>
        <div
          className="pulse-bar"
          role="progressbar"
          aria-valuenow={signalCount}
          aria-valuemin={0}
          aria-valuemax={capacity}
          aria-label="Attention in use"
        >
          <span style={{ width: `${Math.max(8, attentionPct)}%` }} />
        </div>
      </div>

      <div className="pulse-metrics">
        <div className="pulse-metric">
          <div className="label">Progress</div>
          <div className="value">
            {stagesCleared} of {household.stages.length} stages cleared
          </div>
        </div>
        <div className={`pulse-metric ${heirScore < 45 ? 'warn' : ''}`}>
          <div className="label">Impact</div>
          <div className="value">{impactLine}</div>
        </div>
      </div>

      <p className="muted pulse-tagline">{person.tagline}</p>
    </div>
  )
}

export function exceptionsForHousehold(household: Household, all: ExceptionItem[]) {
  const tokens = household.name
    .toLowerCase()
    .split(/[\s&]+/)
    .filter((t) => t.length > 2 && !['and', 'the', 'of', 'estate'].includes(t))
  return all.filter((e) => {
    const h = e.household.toLowerCase()
    return tokens.some((t) => h.includes(t))
  })
}
