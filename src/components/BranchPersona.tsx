import { useMemo, useState } from 'react'
import { usd } from '../data/accounts'
import type { Invoice } from '../data/billing'
import {
  ADVISORS, BRANCHES, CE_REQUIRED_HOURS, COURSES, ENSEMBLES, FIRM, PAYOUT_GRID, RECRUIT_STAGES, SERVICE_MODEL,
  advisorRollup, householdEconomics, retentionEstimate, statementFor,
  type HelpTicket, type HouseholdFacts, type Recruit, type RecruitStage,
} from '../data/firm'
import { fmtK } from '../data/financialProfile'

type Tab = 'hierarchy' | 'practice' | 'comp' | 'recruiting' | 'training' | 'office'

export function BranchPersona({
  facts, invoices, recruits, completed, tickets, deflected,
  onMoveRecruit, onPlan, onResolve, onRemind,
}: {
  facts: HouseholdFacts[]
  invoices: Invoice[]
  recruits: Recruit[]
  completed: Record<string, string[]>
  tickets: HelpTicket[]
  deflected: number
  onMoveRecruit: (id: string, stage: RecruitStage) => void
  onPlan: (id: string) => void
  onResolve: (id: string, answer: string) => void
  onRemind: (advisor: string, course: string) => void
}) {
  const [tab, setTab] = useState<Tab>('hierarchy')
  const [branchId, setBranchId] = useState('br-sf')
  const [stmtId, setStmtId] = useState('adv-doyle')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const all = useMemo(() => advisorRollup(facts, invoices), [facts, invoices])
  const inBranch = all.filter((a) => a.advisor.branchId === branchId)
  const sum = (rows: typeof all, k: 'aum' | 'revenue' | 'clients') => rows.reduce((s, r) => s + r[k], 0)
  const stmt = statementFor(ADVISORS.find((a) => a.id === stmtId)!, all)
  const openTickets = tickets.filter((t) => t.status === 'open')
  const tabs: [Tab, string][] = [['hierarchy', 'Hierarchy'], ['practice', 'Practice management'], ['comp', 'Compensation'], ['recruiting', 'Recruiting'], ['training', 'Training'], ['office', `Home office (${openTickets.length})`]]
  const row = (r: (typeof all)[number]) => (
    <tr key={r.advisor.id}>
      <td>{r.advisor.name} <span className="muted">{r.advisor.role}</span></td>
      <td>{r.clients}</td><td>{fmtK(r.aum)}</td><td>{usd(r.revenue)}</td>
      <td><div className="util-bar" title={`${Math.round(r.utilization * 100)}% of capacity`}><i className={r.utilization > 0.9 ? 'hot' : ''} style={{ width: `${Math.min(100, r.utilization * 100)}%` }} /></div></td>
    </tr>
  )
  return (
    <div className="persona-page">
      <div className="hero-banner"><h1>Branch &amp; Practice Management</h1><p>{FIRM} · structure, capacity, compensation, recruiting and development in one place.</p></div>
      <div className="planning-tabs" role="tablist" aria-label="Branch">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'hierarchy' && (
        <div className="panel"><div className="panel-header"><span>Firm → branch → ensemble → advisor</span>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} aria-label="Branch">{BRANCHES.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          <div className="panel-body">
            <div className="plan-kpis">
              <div><strong>{fmtK(sum(all, 'aum'))}</strong><span>Firm AUM</span></div>
              <div><strong>{fmtK(sum(inBranch, 'aum'))}</strong><span>Branch AUM</span></div>
              <div><strong>{sum(inBranch, 'clients')}</strong><span>Branch clients</span></div>
              <div><strong>{usd(sum(inBranch, 'revenue'))}</strong><span>Branch annual revenue</span></div>
            </div>
            <table className="plan-table"><thead><tr><th>Advisor</th><th>Clients</th><th>AUM</th><th>Revenue</th><th>Capacity</th></tr></thead><tbody>
              {ENSEMBLES.filter((e) => e.branchId === branchId).map((e) => {
                const members = inBranch.filter((a) => a.advisor.ensembleId === e.id)
                return [
                  <tr key={e.id} className="perf-total"><td>{e.name} <span className="muted">split {e.leadPct}/{100 - e.leadPct} on shared households</span></td><td>{sum(members, 'clients')}</td><td>{fmtK(sum(members, 'aum'))}</td><td>{usd(sum(members, 'revenue'))}</td><td /></tr>,
                  ...members.map(row),
                ]
              })}
              {inBranch.filter((a) => !a.advisor.ensembleId).map(row)}
            </tbody></table>
          </div></div>
      )}

      {tab === 'practice' && (
        <div className="panel"><div className="panel-header"><span>Segmentation, service model and profitability</span></div><div className="panel-body">
          <div className="plan-kpis">{(['A', 'B', 'C'] as const).map((s) => <div key={s}><strong>{s}</strong><span>{SERVICE_MODEL[s].touches} touches/yr · {SERVICE_MODEL[s].label}</span></div>)}</div>
          <table className="plan-table"><thead><tr><th>Household</th><th>Segment</th><th>Touches done / required</th><th>Revenue</th><th>Cost to serve</th><th>Margin</th></tr></thead><tbody>
            {facts.filter((f) => f.id !== 'h0').map((f) => { const e = householdEconomics(f, invoices); return (
              <tr key={f.id}><td>{f.name}</td><td>{e.seg}</td><td className={e.onModel ? 'up' : 'down'}>{e.done} / {e.model.touches} {e.onModel ? '' : '· behind model'}</td><td>{usd(e.revenue)}</td><td>{usd(e.cost)}</td><td className={e.margin >= 0 ? 'up' : 'down'}>{usd(e.margin)}</td></tr>) })}
          </tbody></table>
          <h5>Advisor capacity</h5>
          <table className="plan-table"><thead><tr><th>Advisor</th><th>Clients</th><th>AUM</th><th>Revenue</th><th>Capacity</th></tr></thead><tbody>{all.map(row)}</tbody></table>
          <p className="muted perf-disclosure">Cost to serve = service-model hours × ${150}/hr. Revenue is advisory plus planning, subscription and hourly fees.</p>
        </div></div>
      )}

      {tab === 'comp' && (
        <div className="panel"><div className="panel-header"><span>Compensation statement</span>
          <select value={stmtId} onChange={(e) => setStmtId(e.target.value)} aria-label="Advisor">{ADVISORS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          <div className="panel-body"><div className="billing-cols"><section>
            <h5>{stmt.month}</h5>
            <ul className="bill-list">
              <li><span>Advisory fees</span><strong>{usd(stmt.advisory)}</strong></li>
              <li><span>Planning, subscription and hourly fees</span><strong>{usd(stmt.planning)}</strong></li>
              <li><span>Gross revenue</span><strong>{usd(stmt.gross)}</strong></li>
              <li><span>Shared with ensemble lead</span><strong>−{usd(stmt.sharedOut)}</strong></li>
              <li><span>Received from associates</span><strong>+{usd(stmt.sharedIn)}</strong></li>
              <li><span>Credited revenue</span><strong>{usd(stmt.credited)}</strong></li>
              <li><span>Payout rate ({Math.round(stmt.rate * 100)}%)</span><strong>{usd(stmt.payout)}</strong></li>
            </ul></section><section>
            <h5>Payout grid (annualized credited revenue)</h5>
            <table className="plan-table"><thead><tr><th>From</th><th>Payout</th></tr></thead><tbody>{PAYOUT_GRID.map((g) => <tr key={g.from} className={g.rate === stmt.rate ? 'sel' : ''}><td>{usd(g.from)}</td><td>{Math.round(g.rate * 100)}%</td></tr>)}</tbody></table>
            <p className="muted">No product commissions: revenue is fee-based only.</p></section></div></div></div>
      )}

      {tab === 'recruiting' && (
        <div className="panel"><div className="panel-header"><span>Recruit pipeline</span><span className="muted">{fmtK(recruits.reduce((s, r) => s + retentionEstimate(r), 0))} expected transition AUM</span></div><div className="panel-body">
          {recruits.map((r) => (
            <div key={r.id} className="campaign-card">
              <div className="campaign-head"><div><strong>{r.name}</strong> <span className="muted">from {r.from} · book {fmtK(r.bookAum)}</span></div>
                <select aria-label={`Stage for ${r.name}`} value={r.stage} onChange={(e) => onMoveRecruit(r.id, e.target.value as RecruitStage)}>{RECRUIT_STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
              <div className="muted">Expected to transition {fmtK(retentionEstimate(r))} ({Math.round((retentionEstimate(r) / r.bookAum) * 100)}% of book) · Broker Protocol {r.protocol ? 'member firm' : 'not confirmed'}</div>
              {r.plan ? <ol>{r.plan.map((p) => <li key={p.step}>{p.step} <span className="muted">· {p.owner}</span></li>)}</ol> : <div className="trade-actions"><button type="button" className="btn primary sm" onClick={() => onPlan(r.id)}>Have the Transition Agent draft the plan</button></div>}
            </div>
          ))}</div></div>
      )}

      {tab === 'training' && (
        <div className="panel"><div className="panel-header"><span>Learning plans and CE credit</span></div><div className="panel-body"><table className="plan-table"><thead><tr><th>Advisor</th>{COURSES.map((c) => <th key={c.id}>{c.title}<div className="muted">{c.kind} · due {c.due}</div></th>)}<th>CE hours</th></tr></thead><tbody>
          {ADVISORS.filter((a) => a.branchId === branchId).map((a) => { const done = completed[a.id] ?? []; const ce = COURSES.filter((c) => c.kind === 'CE' && done.includes(c.id)).reduce((s, c) => s + c.hours, 0); return (
            <tr key={a.id}><td>{a.name}</td>{COURSES.map((c) => <td key={c.id}>{done.includes(c.id) ? <span className="up">Done</span> : <button type="button" className="btn sm" onClick={() => onRemind(a.name, c.title)}>Remind</button>}</td>)}<td>{ce} / {CE_REQUIRED_HOURS}</td></tr>) })}
        </tbody></table></div></div>
      )}

      {tab === 'office' && (
        <div className="panel"><div className="panel-header"><span>Advisor help desk · home office view</span><span className="muted">{deflected} questions answered by the knowledge base</span></div><div className="panel-body"><ul className="bill-list">
          {tickets.map((t) => (
            <li key={t.id}><div><strong>{ADVISORS.find((a) => a.id === t.advisorId)?.name}</strong> · {t.category}<div>{t.question}</div>{t.answer && <div className="muted">Answer: {t.answer}</div>}</div>
              <div className="bill-right">{t.status === 'open' ? (<><input aria-label="Answer" placeholder="Answer" value={answers[t.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [t.id]: e.target.value })} /><button type="button" className="btn primary sm" disabled={!(answers[t.id] ?? '').trim()} onClick={() => onResolve(t.id, answers[t.id])}>Resolve</button></>) : <span className="badge done">Resolved</span>}</div></li>))}
        </ul></div></div>
      )}
    </div>
  )
}
