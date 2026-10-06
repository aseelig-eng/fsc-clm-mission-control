import { useState } from 'react'
import { usd } from '../data/accounts'
import type { Campaign } from '../data/growth'
import type { TradeTicket } from '../data/trading'
import type { MessageThread } from '../data/messages'
import type { ExceptionItem } from '../data/types'
import type { AuditEntry } from '../useFirm'

export function CompliancePersona({
  tickets,
  campaigns,
  threads,
  exceptions,
  reviewed,
  audit,
  nameOf,
  onDecideCampaign,
  onReview,
}: {
  tickets: TradeTicket[]
  campaigns: Campaign[]
  threads: MessageThread[]
  exceptions: ExceptionItem[]
  reviewed: Set<string>
  audit: AuditEntry[]
  nameOf: (id: string) => string
  onDecideCampaign: (id: string, approve: boolean, note?: string) => void
  onReview: (key: string, area: string, subject: string, decision: string, note?: string) => void
}) {
  const [tab, setTab] = useState<'queue' | 'audit'>('queue')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const pendingMkt = campaigns.filter((c) => c.status === 'pending_compliance')
  const filled = tickets.filter((t) => (t.status === 'filled' || t.status === 'working') && !reviewed.has(`trade-${t.id}`))
  const flagged = threads.flatMap((t) => t.messages.filter((m) => m.flags && m.flags.length && !reviewed.has(`msg-${m.id}`)).map((m) => ({ t, m })))
  const exc = exceptions.filter((e) => !reviewed.has(`exc-${e.id}`))
  const total = pendingMkt.length + filled.length + flagged.length + exc.length
  const note = (k: string) => notes[k] ?? ''
  const noteBox = (k: string) => (
    <input className="comp-note" placeholder="Reviewer note" aria-label="Reviewer note" value={note(k)} onChange={(e) => setNotes({ ...notes, [k]: e.target.value })} />
  )
  const exportPack = () => {
    const text = audit.map((a) => `${a.at}\t${a.actor}\t${a.area}\t${a.subject}\t${a.decision}\t${a.note ?? ''}`).join('\n')
    const url = URL.createObjectURL(new Blob([`Exam evidence pack\nTime\tActor\tArea\tSubject\tDecision\tNote\n${text}\n`], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'exam-evidence-pack.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="persona-page">
      <div className="hero-banner">
        <h1>Compliance &amp; Supervision</h1>
        <p>Everything that needs a principal’s eyes: marketing, trades, communications and agent exceptions, with an audit trail behind every decision.</p>
      </div>
      <div className="plan-kpis">
        <div className={total ? 'bad' : 'good'}><strong>{total}</strong><span>Items awaiting review</span></div>
        <div><strong>{pendingMkt.length}</strong><span>Marketing (2210)</span></div>
        <div><strong>{filled.length}</strong><span>Trade reviews</span></div>
        <div><strong>{flagged.length}</strong><span>Flagged communications</span></div>
        <div><strong>{audit.length}</strong><span>Decisions logged</span></div>
      </div>
      <div className="planning-tabs" role="tablist" aria-label="Compliance">
        <button type="button" role="tab" aria-selected={tab === 'queue'} className={tab === 'queue' ? 'active' : ''} onClick={() => setTab('queue')}>Supervision queue</button>
        <button type="button" role="tab" aria-selected={tab === 'audit'} className={tab === 'audit' ? 'active' : ''} onClick={() => setTab('audit')}>Audit trail</button>
      </div>
      {tab === 'queue' && (
        <div className="comp-grid">
          <section className="panel"><div className="panel-header"><span>Marketing approval · FINRA 2210</span></div><div className="panel-body">
            {pendingMkt.length === 0 && <p className="muted">No campaigns waiting.</p>}
            {pendingMkt.map((c) => (
              <div key={c.id} className="campaign-card">
                <strong>{c.subject}</strong>
                <span className="muted">{c.audience.length} households</span>
                <p className="campaign-body">{c.body}</p>
                {c.flags.length > 0 && <div className="campaign-flags"><strong>Lexicon flags</strong><ul>{c.flags.map((f) => <li key={f}>{f}</li>)}</ul></div>}
                {noteBox(c.id)}
                <div className="trade-actions">
                  <button type="button" className="btn sm" onClick={() => { onDecideCampaign(c.id, false, note(c.id) || c.flags.join('; ')); onReview(`mkt-${c.id}`, 'Marketing', c.subject, 'Returned', note(c.id)) }}>Return</button>
                  <button type="button" className="btn primary sm" disabled={c.flags.length > 0} onClick={() => { onDecideCampaign(c.id, true, note(c.id)); onReview(`mkt-${c.id}`, 'Marketing', c.subject, 'Approved', note(c.id)) }}>Approve</button>
                </div>
              </div>
            ))}
          </div></section>
          <section className="panel"><div className="panel-header"><span>Trade review</span></div><div className="panel-body">
            {filled.length === 0 && <p className="muted">No trades to review.</p>}
            {filled.map((t) => (
              <div key={t.id} className="campaign-card">
                <strong>{nameOf(t.householdId)} · {t.orders.length} orders</strong>
                <span className="muted">{t.reason} · est. tax {usd(t.netTax)} · {t.status}</span>
                {t.warnings.map((w) => <div key={w} className="campaign-flags">{w}</div>)}
                {t.blocked.map((b) => <div key={b.symbol} className="campaign-flags">Restricted {b.symbol} excluded</div>)}
                {noteBox(t.id)}
                <div className="trade-actions"><button type="button" className="btn primary sm" onClick={() => onReview(`trade-${t.id}`, 'Trading', `${nameOf(t.householdId)} rebalance`, 'Reviewed, no exception', note(t.id))}>Mark reviewed</button></div>
              </div>
            ))}
          </div></section>
          <section className="panel"><div className="panel-header"><span>Communications surveillance</span></div><div className="panel-body">
            {flagged.length === 0 && <p className="muted">No flagged messages.</p>}
            {flagged.map(({ t, m }) => (
              <div key={m.id} className="campaign-card">
                <strong>{nameOf(t.householdId)} · {t.subject}</strong>
                <p className="campaign-body">“{m.body}”</p>
                <div className="campaign-flags">{m.flags!.join('; ')}</div>
                {noteBox(m.id)}
                <div className="trade-actions">
                  <button type="button" className="btn sm" onClick={() => onReview(`msg-${m.id}`, 'Communications', `${m.name}: ${t.subject}`, 'Escalated to advisor for correction', note(m.id))}>Escalate</button>
                  <button type="button" className="btn primary sm" onClick={() => onReview(`msg-${m.id}`, 'Communications', `${m.name}: ${t.subject}`, 'Cleared', note(m.id))}>Clear</button>
                </div>
              </div>
            ))}
          </div></section>
          <section className="panel"><div className="panel-header"><span>Agent exceptions</span></div><div className="panel-body">
            {exc.slice(0, 6).map((e) => (
              <div key={e.id} className="campaign-card">
                <strong>{e.title}</strong>
                <span className="muted">{e.household} · {e.priority}</span>
                <p className="campaign-body">{e.reason}</p>
                <div className="trade-actions"><button type="button" className="btn sm" onClick={() => onReview(`exc-${e.id}`, 'Exceptions', e.title, 'Acknowledged for exam file')}>Acknowledge</button></div>
              </div>
            ))}
          </div></section>
        </div>
      )}
      {tab === 'audit' && (
        <div className="panel"><div className="panel-header"><span>Audit trail</span><button type="button" className="btn sm" onClick={exportPack}>Export exam evidence pack</button></div>
          <div className="panel-body"><table className="plan-table"><thead><tr><th>Time</th><th>Actor</th><th>Area</th><th>Subject</th><th>Decision</th><th>Note</th></tr></thead>
            <tbody>{audit.map((a) => <tr key={a.id}><td>{a.at}</td><td>{a.actor}</td><td>{a.area}</td><td>{a.subject}</td><td>{a.decision}</td><td>{a.note}</td></tr>)}</tbody></table></div></div>
      )}
    </div>
  )
}
