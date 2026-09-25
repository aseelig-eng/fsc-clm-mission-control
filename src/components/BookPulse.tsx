import { useState } from 'react'
import { metrics } from '../data/content'
import { meetings } from '../data/meetings'
import { allHandoffs, compositeScore, weakestPillar } from '../data/generational'
import type { ExceptionItem, Household, LifecycleStageId } from '../data/types'

const WEEK_START = new Date('2026-09-24T00:00:00')
const WEEK_END = new Date('2026-09-30T23:59:59')

const NEW_CLIENT_PIPE: { id: LifecycleStageId; label: string }[] = [
  { id: 'prospect', label: 'Prospect' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'disclosures', label: 'Disclosures' },
  { id: 'kyc', label: 'KYC' },
  { id: 'account_open', label: 'Account open' },
  { id: 'funding', label: 'Funding' },
]

type Glyph =
  | 'funnel'
  | 'clock'
  | 'alert'
  | 'calendar'
  | 'agents'
  | 'hours'
  | 'signals'
  | 'gate'
  | 'layers'
  | 'shield'
  | 'trend'
  | 'heirs'

type Bar = { label: string; note?: string; pct: number; tone?: 'ok' | 'warn' | 'danger' | 'neutral' }
type FunnelPerson = { id: string; name: string; note: string; blocked: boolean }
type Visual =
  | { kind: 'bars'; caption: string; bars: Bar[] }
  | { kind: 'list'; caption: string; rows: { title: string; detail: string }[] }
  | { kind: 'funnel'; caption: string; stages: { id: string; label: string; people: FunnelPerson[] }[] }

type BookMetric = {
  id: string
  short: string
  label: string
  value: string
  glyph: Glyph
  x: number
  story: string
  visuals: Visual[]
}

function MetricGlyph({ kind }: { kind: Glyph }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'funnel') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5h16l-6 7v5l-4 2v-7z" {...common} />
      </svg>
    )
  }
  if (kind === 'clock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" {...common} />
        <path d="M12 8v4l3 2" {...common} />
      </svg>
    )
  }
  if (kind === 'alert') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4l8 14H4z" {...common} />
        <path d="M12 10v4M12 16.5v.5" {...common} />
      </svg>
    )
  }
  if (kind === 'calendar') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="6" width="16" height="14" rx="2" {...common} />
        <path d="M8 4v4M16 4v4M4 10h16" {...common} />
      </svg>
    )
  }
  if (kind === 'agents') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3" {...common} />
        <path d="M6 19c1.2-3 3.2-4.5 6-4.5S16.8 16 18 19" {...common} />
        <circle cx="5" cy="9" r="2" {...common} />
        <circle cx="19" cy="9" r="2" {...common} />
      </svg>
    )
  }
  if (kind === 'hours') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="13" r="7" {...common} />
        <path d="M9 4h6M12 4v2M12 13l-3 2" {...common} />
      </svg>
    )
  }
  if (kind === 'signals') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 16c0-3.3 2.7-6 6-6s6 2.7 6 6" {...common} />
        <path d="M12 4v2M5 8l1.5 1.5M19 8l-1.5 1.5" {...common} />
        <path d="M10 16h4" {...common} />
      </svg>
    )
  }
  if (kind === 'gate') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 20V6h12v14" {...common} />
        <path d="M6 12h12M12 12v8" {...common} />
      </svg>
    )
  }
  if (kind === 'layers') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4l8 4-8 4-8-4zM4 12l8 4 8-4M4 16l8 4 8-4" {...common} />
      </svg>
    )
  }
  if (kind === 'shield') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3l7 3v6c0 4.5-3 7-7 9-4-2-7-4.5-7-9V6z" {...common} />
        <path d="M9 12l2 2 4-4" {...common} />
      </svg>
    )
  }
  if (kind === 'trend') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16l5-5 3 3 8-8" {...common} />
        <path d="M14 6h6v6" {...common} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="3" {...common} />
      <circle cx="16" cy="10" r="2.4" {...common} />
      <path d="M4 19c1-3 3-4.5 5-4.5s4 1.5 5 4.5M14 19c.4-2 1.6-3 3-3 1 0 2 .6 3 2" {...common} />
    </svg>
  )
}

function whenLabel(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function buildMetrics(households: Household[], exceptions: ExceptionItem[]): BookMetric[] {
  const firm = Object.fromEntries(metrics.map((m) => [m.label, m]))
  const pipelineStages = NEW_CLIENT_PIPE.map((stage) => ({
    id: stage.id,
    label: stage.label,
    people: households
      .filter((household) => household.stage === stage.id)
      .map((household) => ({
        id: household.id,
        name: household.name,
        note: household.nextClientTouch,
        blocked: household.stages.some((item) => item.id === household.stage && item.status === 'blocked'),
      })),
  }))
  const pipelineCount = pipelineStages.reduce((sum, stage) => sum + stage.people.length, 0)
  const weekMeetings = meetings
    .filter((m) => m.status === 'scheduled')
    .filter((m) => {
      const when = new Date(m.when)
      return when >= WEEK_START && when <= WEEK_END
    })
    .sort((a, b) => a.when.localeCompare(b.when))
  const agentTotal = households.reduce((n, h) => n + h.activeAgents.length, 0)
  const busiest = Math.max(...households.map((h) => h.activeAgents.length), 1)
  const blocked = households.flatMap((h) =>
    h.stages.filter((s) => s.status === 'blocked').map((s) => ({ household: h.name, label: s.label, why: s.unblock?.whyBlocked })),
  )
  const heirBars: Bar[] = allHandoffs().map((profile) => {
    const score = compositeScore(profile)
    const weak = weakestPillar(profile)
    const household = households.find((item) => item.id === profile.householdId)
    return {
      label: household?.name.split(' ')[0] ?? profile.principal.split(' ')[0],
      note: `${score} · ${weak.label}`,
      pct: score,
      tone: score < 45 ? 'danger' : score < 80 ? 'warn' : 'ok',
    }
  })

  const time = firm['Median time-to-funded']
  const nigo = firm['NIGO rate']
  const hours = firm['Hours I saved this week']
  const wallet = firm['90-day consolidation']
  const audit = firm['Audit-ready packs']
  const aum = firm['Transition AUM retained']
  const heirs = firm['Estate / heir AUM retained']

  return [
    {
      id: 'pipeline',
      short: 'Pipeline',
      label: 'New clients',
      value: String(pipelineCount),
      glyph: 'funnel',
      x: 7,
      story: 'New clients still on the way in, from the first conversation through funding. Open a name to see that record.',
      visuals: [
        {
          kind: 'funnel',
          caption: 'New client funnel',
          stages: pipelineStages,
        },
      ],
    },
    {
      id: 'time',
      short: 'Time',
      label: time.label,
      value: time.value,
      glyph: 'clock',
      x: 15,
      story: 'Days from a complete file to money in the account. The short bar is this book.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Days to Funded',
          bars: [
            { label: 'Manual', note: '22 days', pct: 100, tone: 'warn' },
            { label: 'This book', note: time.value, pct: 19, tone: 'ok' },
          ],
        },
      ],
    },
    {
      id: 'nigo',
      short: 'NIGO',
      label: nigo.label,
      value: nigo.value,
      glyph: 'alert',
      x: 23,
      story: 'Share of transfers sent back not-in-good-order. Industry still sits near a quarter of files.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Not in Good Order',
          bars: [
            { label: 'Industry', note: '25%', pct: 100, tone: 'danger' },
            { label: 'This book', note: nigo.value, pct: 7, tone: 'ok' },
          ],
        },
      ],
    },
    {
      id: 'meetings',
      short: 'Meets',
      label: 'Meetings this week',
      value: String(weekMeetings.length),
      glyph: 'calendar',
      x: 34,
      story: 'Scheduled conversations from today through Wednesday. Each one is already on a household.',
      visuals: [
        {
          kind: 'list',
          caption: 'This Week',
          rows: weekMeetings.map((m) => ({
            title: whenLabel(m.when),
            detail: `${households.find((h) => h.id === m.householdId)?.name ?? 'Household'} — ${m.title}`,
          })),
        },
      ],
    },
    {
      id: 'agents',
      short: 'Agents',
      label: 'Agents at work',
      value: String(agentTotal),
      glyph: 'agents',
      x: 42,
      story: 'Named agents running on the book right now, counted by household.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Who Is Running',
          bars: households.map((h) => ({
            label: h.name.split(' ')[0],
            note: h.activeAgents.map((a) => a.name.replace(' Agent', '')).join(', ') || 'None',
            pct: Math.round((h.activeAgents.length / busiest) * 100),
            tone: 'neutral',
          })),
        },
      ],
    },
    {
      id: 'hours',
      short: 'Hours',
      label: hours.label,
      value: hours.value,
      glyph: 'hours',
      x: 50,
      story: 'Advisor time the agents returned this week. It comes out of admin and goes back to clients.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Where the Week Went',
          bars: [
            { label: 'Was admin', note: 'Same 6.5 hrs', pct: 100, tone: 'warn' },
            { label: 'Now client time', note: hours.value, pct: 100, tone: 'ok' },
          ],
        },
      ],
    },
    {
      id: 'signals',
      short: 'Signals',
      label: 'Open signals',
      value: String(exceptions.length),
      glyph: 'signals',
      x: 58,
      story: 'Work that still needs a person. Longer bars are the ones that can stop a transfer.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Needs You',
          bars: exceptions.map((ex) => ({
            label: ex.household,
            note: ex.priority,
            pct: ex.priority === 'critical' ? 100 : ex.priority === 'high' ? 72 : 46,
            tone: ex.priority === 'critical' ? 'danger' : ex.priority === 'high' ? 'warn' : 'neutral',
          })),
        },
      ],
    },
    {
      id: 'blocked',
      short: 'Gates',
      label: 'Blocked gates',
      value: String(blocked.length),
      glyph: 'gate',
      x: 66,
      story: 'Stages that cannot move until someone clears the gate.',
      visuals: [
        {
          kind: 'list',
          caption: 'Waiting',
          rows: blocked.map((b) => ({
            title: b.household,
            detail: b.why ? `${b.label}. ${b.why}` : b.label,
          })),
        },
      ],
    },
    {
      id: 'wallet',
      short: 'Wallet',
      label: wallet.label,
      value: wallet.value,
      glyph: 'layers',
      x: 76,
      story: 'How much more of the household wallet is here ninety days after funding.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Share of Wallet',
          bars: [
            { label: 'At funding', note: '1.0×', pct: 42, tone: 'neutral' },
            { label: 'After 90 days', note: wallet.value, pct: 100, tone: 'ok' },
          ],
        },
      ],
    },
    {
      id: 'audit',
      short: 'Audit',
      label: audit.label,
      value: audit.value,
      glyph: 'shield',
      x: 83,
      story: 'Every completed step can show who did it and which record it wrote.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Packs with Lineage',
          bars: [{ label: 'This book', note: audit.value, pct: 100, tone: 'ok' }],
        },
      ],
    },
    {
      id: 'aum',
      short: 'AUM',
      label: aum.label,
      value: aum.value,
      glyph: 'trend',
      x: 90,
      story: 'Assets that stayed through a move from another firm.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Retained at Transition',
          bars: [
            { label: 'Breakaway norm', note: '78–89%', pct: 84, tone: 'warn' },
            { label: 'This book', note: aum.value, pct: 94, tone: 'ok' },
          ],
        },
      ],
    },
    {
      id: 'heirs',
      short: 'Heirs',
      label: heirs.label,
      value: heirs.value,
      glyph: 'heirs',
      x: 96,
      story: 'Assets still here after a death or transfer. The second chart is household handoff readiness. A score under 80 is still forming. The note is the weakest pillar.',
      visuals: [
        {
          kind: 'bars',
          caption: 'Kept after Transfer',
          bars: [
            { label: 'Industry', note: '~50–70%', pct: 60, tone: 'warn' },
            { label: 'This book', note: heirs.value, pct: 91, tone: 'ok' },
          ],
        },
        {
          kind: 'bars',
          caption: 'Handoff Readiness by Household',
          bars: heirBars,
        },
      ],
    },
  ]
}

function MetricVisual({
  visual,
  onOpenHousehold,
}: {
  visual: Visual
  onOpenHousehold?: (id: string) => void
}) {
  if (visual.kind === 'funnel') {
    return (
      <div className="pipe-funnel-wrap">
        <div className="modal-actions-title">{visual.caption}</div>
        <div className="pipe-funnel">
          {visual.stages.map((stage, index) => (
            <div
              key={stage.id}
              className={`pipe-stage ${stage.people.length ? 'has-people' : ''} ${stage.people.some((person) => person.blocked) ? 'is-blocked' : ''}`}
              style={{ width: `${100 - index * 8}%` }}
            >
              <div className="pipe-stage-head">
                <strong>{stage.label}</strong>
                <span>{stage.people.length}</span>
              </div>
              {stage.people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className="pipe-person"
                  onClick={() => onOpenHousehold?.(person.id)}
                >
                  <span>{person.name}</span>
                  <span>{person.blocked ? 'Blocked' : person.note}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }
  if (visual.kind === 'list') {
    return (
      <div className="book-meter">
        <div className="modal-actions-title">{visual.caption}</div>
        <ol className="book-metric-list">
          {visual.rows.map((row) => (
            <li key={`${row.title}-${row.detail}`}>
              <strong>{row.title}</strong>
              <span>{row.detail}</span>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  return (
    <div className="book-meter">
      <div className="modal-actions-title">{visual.caption}</div>
      {visual.bars.map((bar) => (
        <div className="book-meter-row" key={`${bar.label}-${bar.note ?? ''}`}>
          <div className="book-meter-label">
            <strong>{bar.label}</strong>
            {bar.note && <span>{bar.note}</span>}
          </div>
          <div className="book-meter-track" aria-hidden="true">
            <div className={`book-meter-fill tone-${bar.tone ?? 'ok'}`} style={{ width: `${Math.max(4, bar.pct)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function BookPulse({
  households,
  exceptions,
  onOpenHousehold,
}: {
  households: Household[]
  exceptions: ExceptionItem[]
  onOpenHousehold: (id: string) => void
}) {
  const items = buildMetrics(households, exceptions)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = items.find((item) => item.id === openId) ?? null

  return (
    <div className="pulse-panel">
      <div className="likeness-kicker">Book Pulse</div>
      <p className="muted" style={{ margin: '4px 0 12px' }}>
        A scoreboard for the whole book. Select a tile for the picture behind the number.
      </p>
      <div className="book-board">
        {(
          [
            { title: 'Coming in', ids: ['pipeline', 'time', 'nigo'] },
            { title: 'This week', ids: ['meetings', 'agents', 'hours', 'signals', 'blocked'] },
            { title: 'Kept', ids: ['wallet', 'audit', 'aum', 'heirs'] },
          ] as const
        ).map((zone) => (
          <section key={zone.title} className="book-column">
            <h4>{zone.title}</h4>
            <div className="book-tiles">
              {zone.ids.map((id) => {
                const item = items.find((metric) => metric.id === id)
                if (!item) return null
                const fill =
                  (
                    {
                      pipeline: 60,
                      time: 81,
                      nigo: 93,
                      meetings: 70,
                      agents: 80,
                      hours: 72,
                      signals: 40,
                      blocked: 30,
                      wallet: 100,
                      audit: 100,
                      aum: 94,
                      heirs: 91,
                    } as Record<string, number>
                  )[item.id] ?? 50
                return (
                  <button key={item.id} type="button" className="book-tile" onClick={() => setOpenId(item.id)}>
                    <span className="book-tile-fill" style={{ height: `${fill}%` }} />
                    <span className="book-metric-icon">
                      <MetricGlyph kind={item.glyph} />
                    </span>
                    <strong>{item.value}</strong>
                    <span>{item.short}</span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {open && (
        <div className="modal-backdrop" role="presentation" onClick={() => setOpenId(null)}>
          <div
            className="modal-card book-metric-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="book-metric-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="book-metric-head">
                <span className="book-metric-icon">
                  <MetricGlyph kind={open.glyph} />
                </span>
                <div>
                  <div className="muted">Book Pulse</div>
                  <h2 id="book-metric-title">
                    {open.label} · {open.value}
                  </h2>
                </div>
              </div>
              <button type="button" className="btn" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
            <p className="book-metric-story">{open.story}</p>
            {open.visuals.map((visual) => (
              <MetricVisual key={visual.caption} visual={visual} onOpenHousehold={onOpenHousehold} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
