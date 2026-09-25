import { MATURITY_LABELS, type BehavioralFacet, type PersonLikeness } from '../data/portraits'
import type { ExceptionItem, Household, LifecycleStage } from '../data/types'
import { LikenessCompass } from './LikenessCompass'
import { HouseholdFigures } from './HouseholdFigures'

export type PulseNodeId = 'engage' | 'lifecycle' | 'likeness' | 'heirs' | 'custodian'

type Props = {
  household: Household
  person: PersonLikeness
  persons: PersonLikeness[]
  exceptions: ExceptionItem[]
  selectedNodeId: PulseNodeId | null
  selectedFacetId: string | null
  onSelectPerson: (personId: string) => void
  onSelectNode: (nodeId: PulseNodeId) => void
  onSelectFacet: (facet: BehavioralFacet) => void
}

function statusLabel(status: LifecycleStage['status']) {
  if (status === 'blocked') return 'Blocked'
  if (status === 'agent-running') return 'Running'
  if (status === 'active') return 'Needs you'
  if (status === 'complete') return 'Done'
  if (status === 'upcoming') return 'Ahead'
  return status
}

export function HouseholdPulse({
  household,
  person,
  persons,
  exceptions,
  selectedNodeId,
  selectedFacetId,
  onSelectPerson,
  onSelectNode,
  onSelectFacet,
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
      s: 'Meetings',
    },
    {
      id: 'lifecycle',
      tone: needsResolution ? 'warn' : 'ok',
      k: 'Stage',
      v: activeStage ? statusLabel(activeStage.status) : '—',
      s: activeStage?.label ?? household.stageLabel,
    },
    {
      id: 'likeness',
      tone: maturity.score < 45 ? 'warn' : 'ok',
      k: 'Likeness',
      v: `${maturity.score}%`,
      s: tier.title,
    },
    {
      id: 'heirs',
      tone: heirScore < 45 ? 'warn' : 'ok',
      k: 'Heirs',
      v: `${heirScore}%`,
      s: heirScore < 45 ? 'At risk' : heirScore < 70 ? 'Forming' : 'Ready',
    },
    {
      id: 'custodian',
      tone: topEx ? 'danger' : 'ok',
      k: 'Custodian',
      v: topEx ? 'NIGO' : 'Clear',
      s: topEx ? 'STP broken' : 'STP',
    },
  ]

  return (
    <div className="pulse-panel">
      <div className="pulse-header">
        <div>
          <div className="likeness-kicker">Household Pulse · Status &amp; Usage</div>
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

      <div className="pulse-visual">
        <div className="pulse-stage">
          <svg className="pulse-scene" viewBox="0 0 400 400" role="img" aria-label={`${household.name} pulse`}>
            <line x1="200" y1="188" x2="200" y2="48" stroke="var(--sf-blue)" strokeWidth="2" strokeDasharray="5 4" />
            <line x1="248" y1="230" x2="332" y2="168" stroke={needsResolution ? 'var(--sf-orange)' : 'var(--sf-blue)'} strokeWidth="2" strokeDasharray="5 4" />
            <line x1="236" y1="286" x2="312" y2="292" stroke={heirScore < 45 ? 'var(--sf-orange)' : 'var(--sf-blue)'} strokeWidth="2" strokeDasharray="5 4" />
            <line x1="152" y1="236" x2="86" y2="252" stroke={maturity.score < 45 ? 'var(--sf-orange)' : 'var(--sf-blue)'} strokeWidth="2" strokeDasharray="5 4" />
            <line x1="188" y1="292" x2="168" y2="348" stroke={topEx ? 'var(--sf-red)' : 'var(--sf-green)'} strokeWidth="2.5" />
            <HouseholdFigures persons={persons} />
          </svg>
          {(
            [
              { id: 'engage' as const, x: 200, y: 48 },
              { id: 'lifecycle' as const, x: 332, y: 168 },
              { id: 'heirs' as const, x: 312, y: 292 },
              { id: 'likeness' as const, x: 86, y: 252 },
              { id: 'custodian' as const, x: 168, y: 348 },
            ] as const
          ).map((pos) => {
            const n = nodes.find((node) => node.id === pos.id)!
            return (
              <button
                key={n.id}
                type="button"
                className={`pulse-node tone-${n.tone} ${selectedNodeId === n.id ? 'active' : ''}`}
                style={{ left: `${(pos.x / 400) * 100}%`, top: `${(pos.y / 400) * 100}%` }}
                aria-pressed={selectedNodeId === n.id}
                onClick={() => onSelectNode(n.id)}
              >
                <span className="k">{n.k}</span>
                <span className="v">{n.v}</span>
                <span className="s">{n.s}</span>
              </button>
            )
          })}
        </div>
        <LikenessCompass person={person} selectedFacetId={selectedFacetId} onSelectFacet={onSelectFacet} />
      </div>

      <div className={`pulse-status ${topEx || needsResolution ? 'needs' : 'ok'}`}>
        <strong>{statusLine}</strong>
      </div>

      <div className="pulse-attn">
        <div className="pulse-attn-label">
          <span>Attention in Use</span>
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
          aria-label="Attention in Use"
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
