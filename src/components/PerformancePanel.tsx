import { useMemo, useState } from 'react'
import { usd, type FinancialAccount } from '../data/accounts'
import { benchmarkLabel, pct, PERIODS, performanceReport, type PeriodId } from '../data/performance'
import { Sparkline } from './PlanningCharts'

export interface PublishedReport {
  id: string
  name: string
  notes: string
  body: string[]
}

/**
 * Performance reporting (#6). Household and per-account time-weighted (TWR)
 * and money-weighted (IRR) returns over QTD/YTD/1Y/3Y/ITD vs a blended
 * benchmark. The Reporting agent drafts the quarterly client report; the
 * advisor reviews it and publishes it into the Document Vault.
 */
export function PerformancePanel({
  accounts,
  householdName,
  audience,
  published,
  onPublish,
}: {
  accounts: FinancialAccount[]
  householdName: string
  audience: 'advisor' | 'client'
  published?: boolean
  onPublish?: (report: PublishedReport) => void
}) {
  const report = useMemo(() => performanceReport(accounts), [accounts])
  const [period, setPeriod] = useState<PeriodId>('YTD')
  const [draftOpen, setDraftOpen] = useState(false)
  const [commentary, setCommentary] = useState('')
  const hh = report.household.find((stats) => stats.period === period) ?? report.household[0]
  const bench = benchmarkLabel(accounts)
  const q = report.household.find((stats) => stats.period === 'QTD')!
  const ytd = report.household.find((stats) => stats.period === 'YTD')!

  if (report.byAccount.length === 0) {
    return <p className="muted">No invested accounts to report on yet.</p>
  }

  const agentCommentary = () =>
    [
      `${householdName} returned ${pct(q.twr)} time-weighted in Q3 2026 vs ${pct(q.benchmark)} for the benchmark (${bench}), ${q.excess >= 0 ? 'ahead by' : 'behind by'} ${pct(Math.abs(q.excess)).replace('+', '')}.`,
      `Year to date the portfolio is ${pct(ytd.twr)} (benchmark ${pct(ytd.benchmark)}). Your personal, money-weighted return is ${pct(ytd.mwr)} — it differs from the time-weighted figure because of the timing of ${ytd.netFlows >= 0 ? 'deposits' : 'withdrawals'} (${usd(Math.abs(ytd.netFlows))} net).`,
      `Investment gain this year: ${usd(ytd.gain)}. Ending value ${usd(ytd.endValue)}.`,
      'No changes to your investment policy are recommended this quarter. We will review allocation and goals at your next meeting.',
    ].join('\n\n')

  return (
    <div className="perf-panel">
      <div className="perf-head">
        <div className="portal-ranges" role="tablist" aria-label="Reporting period">
          {PERIODS.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={period === id} className={period === id ? 'active' : ''} onClick={() => setPeriod(id)}>
              {id}
            </button>
          ))}
        </div>
        <span className="muted">As of 2026-09-30 · net of fees · benchmark {bench}</span>
      </div>
      <div className="plan-kpis perf-kpis">
        <div className={hh.twr >= 0 ? 'good' : 'bad'}>
          <strong>{pct(hh.twr)}</strong>
          <span>Time-weighted{period === '3Y' || period === 'ITD' ? ' (ann.)' : ''}</span>
        </div>
        <div>
          <strong>{pct(hh.mwr)}</strong>
          <span>{audience === 'client' ? 'Your personal return' : 'Money-weighted (IRR)'}</span>
        </div>
        <div>
          <strong>{pct(hh.benchmark)}</strong>
          <span>Benchmark</span>
        </div>
        <div className={hh.excess >= 0 ? 'good' : 'bad'}>
          <strong>{pct(hh.excess)}</strong>
          <span>vs benchmark</span>
        </div>
        <div>
          <strong>{usd(hh.gain)}</strong>
          <span>Investment gain</span>
        </div>
      </div>
      <div className="perf-chart">
        <Sparkline values={report.curve.map((point) => point.twrIndex)} compare={report.curve.map((point) => point.benchIndex)} label="Growth of 100 vs benchmark" />
        <div className="plan-legend">
          <span className="lg spark-m">Portfolio (growth of $100)</span>
          <span className="lg spark-c">Benchmark</span>
          <span className="muted">
            {report.curve[0].label} – {report.curve[report.curve.length - 1].label}
          </span>
        </div>
      </div>
      <table className="plan-table perf-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Value</th>
            {PERIODS.map((id) => (
              <th key={id} className={id === period ? 'sel' : ''}>
                {id}
              </th>
            ))}
            <th>{audience === 'client' ? 'Personal' : 'IRR'} ({period})</th>
          </tr>
        </thead>
        <tbody>
          {report.byAccount.map(({ account, stats }) => (
            <tr key={account.id}>
              <td>
                {account.institution} {account.name} ···{account.mask}
                {account.custody === 'held-away' && <em className="perf-away"> held away</em>}
              </td>
              <td>{usd(stats[0].endValue)}</td>
              {stats.map((s) => (
                <td key={s.period} className={`${s.period === period ? 'sel' : ''} ${s.twr >= 0 ? 'up' : 'down'}`}>
                  {pct(s.twr)}
                </td>
              ))}
              <td>{pct(stats.find((s) => s.period === period)!.mwr)}</td>
            </tr>
          ))}
          <tr className="perf-total">
            <td>Household</td>
            <td>{usd(report.household[0].endValue)}</td>
            {report.household.map((s) => (
              <td key={s.period} className={`${s.period === period ? 'sel' : ''} ${s.twr >= 0 ? 'up' : 'down'}`}>
                {pct(s.twr)}
              </td>
            ))}
            <td>{pct(hh.mwr)}</td>
          </tr>
        </tbody>
      </table>
      {audience === 'advisor' && onPublish && (
        <div className="perf-report">
          {published ? (
            <p className="perf-published">Q3 2026 performance report published to the Document Vault and the client portal.</p>
          ) : !draftOpen ? (
            <button
              type="button"
              className="msg-draft-cta"
              onClick={() => {
                setCommentary(agentCommentary())
                setDraftOpen(true)
              }}
            >
              <span className="agent">Reporting agent</span> drafted the Q3 2026 quarterly report — review it
            </button>
          ) : (
            <div className="perf-draft">
              <h4>Q3 2026 Quarterly Performance Report — {householdName}</h4>
              <p className="muted">Includes: performance summary, account table, allocation, benchmark disclosure, ADV 2A fee note. Edit the commentary, then approve.</p>
              <textarea rows={8} aria-label="Report commentary" value={commentary} onChange={(e) => setCommentary(e.target.value)} />
              <div className="msg-compose-actions">
                <button type="button" className="btn sm" onClick={() => setDraftOpen(false)}>
                  Discard
                </button>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => {
                    onPublish({
                      id: 'qr-2026q3',
                      name: 'Q3 2026 Quarterly Performance Report',
                      notes: `TWR QTD ${pct(q.twr)} vs ${pct(q.benchmark)} · approved by advisor`,
                      body: commentary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
                    })
                    setDraftOpen(false)
                  }}
                >
                  Approve &amp; publish
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <p className="muted perf-disclosure">
        Time-weighted returns remove the effect of deposits and withdrawals and are used to compare against the benchmark. Money-weighted returns reflect the timing of your cash flows. Past performance does not guarantee future results.
      </p>
    </div>
  )
}
