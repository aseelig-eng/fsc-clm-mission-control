import { useState } from 'react'
import { usd } from '../data/accounts'
import {
  CONTENT,
  LEAD_STAGES,
  scoreLead,
  SEGMENT_FOR_CONTENT,
  SOURCE_LABEL,
  type Campaign,
  type Lead,
  type LeadStage,
  type Nudge,
  type Opportunity,
  type Segment,
} from '../data/growth'

type GrowthTab = 'pipeline' | 'campaigns' | 'opportunities' | 'insights'

const STATUS: Record<Campaign['status'], [string, string]> = {
  draft: ['Draft', 'medium'],
  pending_compliance: ['With Compliance', 'needs'],
  approved: ['Approved', 'done'],
  sent: ['Sent', 'done'],
  rejected: ['Returned', 'critical'],
}

export function GrowthPanel({
  leads,
  campaigns,
  segments,
  opportunities,
  nudges,
  nameOf,
  onMove,
  onConvert,
  onCreateCampaign,
  onEdit,
  onSubmit,
  onOpenCompliance,
  onSend,
  onOpportunity,
  onNudge,
  onDismiss,
}: {
  leads: Lead[]
  campaigns: Campaign[]
  segments: Segment[]
  opportunities: Opportunity[]
  nudges: Nudge[]
  nameOf: (id: string) => string
  onMove: (id: string, stage: LeadStage) => void
  onConvert: (lead: Lead) => void
  onCreateCampaign: (contentId: string, segment: Segment) => void
  onEdit: (id: string, body: string) => void
  onSubmit: (id: string) => void
  onOpenCompliance: () => void
  onSend: (id: string) => void
  onOpportunity: (opportunity: Opportunity) => void
  onNudge: (nudge: Nudge) => void
  onDismiss: (id: string) => void
}) {
  const [tab, setTab] = useState<GrowthTab>('pipeline')
  const [contentId, setContentId] = useState(CONTENT[0].id)
  const open = leads.filter((l) => l.stage !== 'won' && l.stage !== 'lost')
  const pipeline = open.reduce((s, l) => s + l.estAssets, 0)
  return (
    <div className="panel growth">
      <div className="panel-header">
        <span>Growth</span>
        <span className="muted">
          {open.length} open leads · {usd(pipeline)} pipeline
        </span>
      </div>
      <div className="panel-body">
        <div className="planning-tabs" role="tablist" aria-label="Growth">
          {(
            [
              ['pipeline', 'Pipeline'],
              ['campaigns', 'Campaigns'],
              ['opportunities', `Opportunities (${opportunities.length})`],
              ['insights', `Predictive insights (${nudges.length})`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'pipeline' && (
          <div className="lead-board">
            {LEAD_STAGES.map((stage) => {
              const col = leads.filter((l) => l.stage === stage.id)
              return (
                <div key={stage.id} className="lead-col">
                  <div className="lead-col-head">
                    {stage.label} <span className="muted">{col.length}</span>
                  </div>
                  {col.map((lead) => {
                    const { score, reasons } = scoreLead(lead)
                    return (
                      <div key={lead.id} className="lead-card">
                        <div className="lead-top">
                          <strong>{lead.name}</strong>
                          <span className={`lead-score ${score >= 75 ? 'hot' : score >= 55 ? 'warm' : ''}`} title={reasons.join('\n')}>
                            {score}
                          </span>
                        </div>
                        <div className="muted">
                          {usd(lead.estAssets)} · {SOURCE_LABEL[lead.source]}
                        </div>
                        <div className="muted">{lead.sourceDetail}</div>
                        <div className="lead-note">{lead.note}</div>
                        <details>
                          <summary className="muted">Why {score}?</summary>
                          <ul className="lead-why">
                            {reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </details>
                        {stage.id !== 'won' && stage.id !== 'lost' && (
                          <div className="lead-actions">
                            <select aria-label={`Move ${lead.name}`} value={lead.stage} onChange={(e) => onMove(lead.id, e.target.value as LeadStage)}>
                              {LEAD_STAGES.filter((s) => s.id !== 'won').map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            {lead.stage === 'proposal' && (
                              <button type="button" className="btn primary sm" onClick={() => onConvert(lead)}>
                                Won: convert
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'campaigns' && (
          <div className="campaigns">
            <div className="campaign-new">
              <label>
                Content{' '}
                <select value={contentId} onChange={(e) => setContentId(e.target.value)}>
                  {CONTENT.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.kind}: {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <span className="muted">
                Audience: {segments.find((s) => s.id === SEGMENT_FOR_CONTENT[contentId])?.label} (
                {segments.find((s) => s.id === SEGMENT_FOR_CONTENT[contentId])?.householdIds.length ?? 0} households)
              </span>
              <button
                type="button"
                className="btn primary sm"
                disabled={!segments.find((s) => s.id === SEGMENT_FOR_CONTENT[contentId])?.householdIds.length}
                onClick={() => {
                  const seg = segments.find((s) => s.id === SEGMENT_FOR_CONTENT[contentId])
                  if (seg) onCreateCampaign(contentId, seg)
                }}
              >
                Have the agent draft a campaign
              </button>
            </div>
            {campaigns.map((c) => {
              const [label, tone] = STATUS[c.status]
              const editable = c.status === 'draft' || c.status === 'rejected'
              return (
                <div key={c.id} className="campaign-card">
                  <div className="campaign-head">
                    <div>
                      <strong>{c.subject}</strong>
                      <div className="muted">
                        {segments.find((s) => s.id === c.segmentId)?.label} · {c.audience.length || c.stats.sent} households · {c.createdAt}
                      </div>
                    </div>
                    <span className={`badge ${tone}`}>{label}</span>
                  </div>
                  {editable ? (
                    <textarea rows={7} value={c.body} aria-label="Campaign copy" onChange={(e) => onEdit(c.id, e.target.value)} />
                  ) : (
                    <p className="campaign-body">{c.body}</p>
                  )}
                  {c.flags.length > 0 && (
                    <div className="campaign-flags">
                      <strong>FINRA 2210 flags</strong>
                      <ul>
                        {c.flags.map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.reviewNote && <div className="campaign-flags">Compliance: {c.reviewNote}</div>}
                  {c.status === 'sent' && (
                    <div className="plan-kpis">
                      <div><strong>{c.stats.sent}</strong><span>Sent</span></div>
                      <div><strong>{c.stats.opens}</strong><span>Opens</span></div>
                      <div><strong>{c.stats.replies}</strong><span>Replies</span></div>
                      <div><strong>{c.stats.meetings}</strong><span>Meetings booked</span></div>
                    </div>
                  )}
                  <div className="trade-actions">
                    {editable && (
                      <button type="button" className="btn primary sm" onClick={() => onSubmit(c.id)}>
                        Submit for compliance review
                      </button>
                    )}
                    {c.status === 'pending_compliance' && (
                      <>
                        <span className="muted">Waiting on Compliance</span>
                        <button type="button" className="btn sm" onClick={onOpenCompliance}>
                          Open Compliance view
                        </button>
                      </>
                    )}
                    {c.status === 'approved' && (
                      <button type="button" className="btn primary sm" onClick={() => onSend(c.id)}>
                        Send to {c.audience.length} households
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'opportunities' && (
          <ul className="bill-list">
            {opportunities.length === 0 && <li className="muted">No opportunities found.</li>}
            {opportunities.map((o) => (
              <li key={o.id}>
                <div>
                  <strong>{nameOf(o.householdId)}</strong> · {o.title}
                  <div className="muted">{o.detail}</div>
                </div>
                <div className="bill-right">
                  <span className="opp-value">{o.value > 0 ? `${usd(o.value)} ${o.valueLabel}` : o.valueLabel}</span>
                  <button type="button" className="btn sm" onClick={() => onOpportunity(o)}>
                    {o.action}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {tab === 'insights' && (
          <ul className="bill-list">
            {nudges.length === 0 && <li className="muted">Nothing to flag right now.</li>}
            {nudges.map((n) => (
              <li key={n.id}>
                <div>
                  <span className="agent">Insight agent</span> <strong>{nameOf(n.householdId)}</strong> · {n.title}
                  <div className="muted">Why: {n.reasoning}</div>
                </div>
                <div className="bill-right">
                  <button type="button" className="btn primary sm" onClick={() => onNudge(n)}>
                    {n.action}
                  </button>
                  <button type="button" className="btn sm" onClick={() => onDismiss(n.id)}>
                    Dismiss
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
