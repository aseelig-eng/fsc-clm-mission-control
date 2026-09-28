import { useState } from 'react'
import {
  accountBalance,
  accountTotals,
  usd,
  type FinancialAccount,
  type LedgerTxn,
} from '../data/accounts'
import { goalProgress, type PlanGoal } from '../data/advice'
import { AccountBook } from './AccountBook'

type RangeId = '1D' | '1W' | '1M' | '1Y' | 'All'
type ActivityFilter = 'all' | 'transfer' | 'trade' | 'income'

const RANGES: RangeId[] = ['1D', '1W', '1M', '1Y', 'All']

function performanceSeries(total: number, range: RangeId) {
  const points = range === '1D' ? 16 : range === '1W' ? 7 : range === '1M' ? 18 : range === '1Y' ? 12 : 20
  const drift = range === '1D' ? 0.006 : range === '1W' ? 0.014 : range === '1M' ? 0.028 : range === '1Y' ? 0.08 : 0.18
  const values: number[] = []
  for (let i = 0; i < points; i += 1) {
    const t = points <= 1 ? 1 : i / (points - 1)
    const wave = Math.sin(i * 1.3 + total / 100000) * total * 0.006
    values.push(Math.max(0, total * (1 - drift + drift * t) + wave))
  }
  if (values.length > 0) values[values.length - 1] = total
  return values
}

function chartPath(values: number[]) {
  if (values.length === 0) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100
      const y = 32 - ((value - min) / span) * 26
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function activityBucket(type: LedgerTxn['type']): ActivityFilter {
  if (type === 'Transfer' || type === 'Contribution') return 'transfer'
  if (type === 'Buy' || type === 'Sell' || type === 'Fee') return 'trade'
  return 'income'
}

function ActivityList({
  rows,
}: {
  rows: { id: string; date: string; type: string; description: string; amount: number; account: FinancialAccount }[]
}) {
  if (rows.length === 0) return null
  return (
    <ul className="portal-activity">
      {rows.map((row) => (
        <li key={row.id}>
          <span>
            <strong>{row.description}</strong>
            <em>
              {row.date} · {row.account.institution} ···{row.account.mask} · {row.type}
            </em>
          </span>
          <strong className={row.amount >= 0 ? 'up' : 'down'}>
            {row.amount >= 0 ? '+' : '−'}
            {usd(Math.abs(row.amount))}
          </strong>
        </li>
      ))}
    </ul>
  )
}

/**
 * The single portfolio experience shared between the investor portal and the
 * advisor Record page, so both sides look at exactly the same view. Account
 * add/connect actions are optional — the advisor view omits them.
 */
export function PortfolioOverview({
  accounts,
  goals,
  targetEquity,
  onConnect,
  onAddManually,
}: {
  accounts: FinancialAccount[]
  goals: PlanGoal[]
  targetEquity: number | null
  onConnect?: () => void
  onAddManually?: () => void
}) {
  const [range, setRange] = useState<RangeId>('1M')
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all')
  const [openAccountId, setOpenAccountId] = useState<string | null>(null)

  const totals = accountTotals(accounts)
  const series = performanceSeries(totals.total, range)
  const seriesStart = series[0] ?? totals.total
  const change = totals.total - seriesStart
  const changePct = seriesStart === 0 ? 0 : (change / seriesStart) * 100
  const up = change >= 0

  const positions = [
    ...accounts
      .reduce((map, account) => {
        for (const holding of account.holdings) {
          if (holding.symbol === 'CASH') continue
          const row = map.get(holding.symbol) ?? { symbol: holding.symbol, name: holding.name, value: 0, shares: 0 }
          row.value += holding.value
          row.shares += holding.shares
          map.set(holding.symbol, row)
        }
        return map
      }, new Map<string, { symbol: string; name: string; value: number; shares: number }>())
      .values(),
  ].sort((a, b) => b.value - a.value)

  const activity = accounts
    .flatMap((account) => account.transactions.map((txn) => ({ ...txn, account })))
    .sort((a, b) => b.date.localeCompare(a.date))
  const visibleActivity = activity.filter((item) => activityFilter === 'all' || activityBucket(item.type) === activityFilter)
  const openAccount = accounts.find((account) => account.id === openAccountId) ?? null

  const investedTotal = accounts.reduce(
    (sum, account) => sum + account.holdings.reduce((inner, holding) => inner + holding.value, 0),
    0,
  )
  const allocation = [
    ...accounts
      .reduce((map, account) => {
        for (const holding of account.holdings) {
          const key = holding.assetClass || 'Other'
          map.set(key, (map.get(key) ?? 0) + holding.value)
        }
        return map
      }, new Map<string, number>())
      .entries(),
  ]
    .map(([label, value]) => ({ label, value, pct: investedTotal > 0 ? (value / investedTotal) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
  const equityPct = allocation
    .filter((slice) => /equity|stock/i.test(slice.label))
    .reduce((sum, slice) => sum + slice.pct, 0)
  const drift = targetEquity == null ? null : Math.round(equityPct - targetEquity)

  return (
    <div className="portal-home juniper">
      <div className="portal-grid">
        <section className="portal-section portal-perf span-2">
          <div className="portal-section-head">
            <div>
              <h3>Portfolio value over time</h3>
              <p className={`portal-change ${up ? 'up' : 'down'}`}>
                {usd(totals.total)} · {up ? '+' : '−'}
                {usd(Math.abs(change))} ({up ? '+' : '−'}
                {Math.abs(changePct).toFixed(1)}%) · {range}
              </p>
            </div>
            <div className="portal-ranges" role="tablist" aria-label="Performance range">
              {RANGES.map((item) => (
                <button key={item} type="button" role="tab" aria-selected={range === item} className={range === item ? 'active' : ''} onClick={() => setRange(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <svg className={`portal-chart ${up ? 'up' : 'down'}`} viewBox="0 0 100 36" preserveAspectRatio="none" role="img" aria-label={`Portfolio value, ${range}`}>
            <defs>
              <linearGradient id="portal-perf-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${chartPath(series)} L100,36 L0,36 Z`} fill="url(#portal-perf-fill)" stroke="none" />
            <path d={chartPath(series)} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
          </svg>
        </section>

        <section className="portal-section span-2">
          <div className="portal-section-head">
            <h3>Accounts</h3>
            {(onConnect || onAddManually) && (
              <div className="portal-add">
                {onConnect && (
                  <button type="button" className="btn" onClick={onConnect}>
                    Connect
                  </button>
                )}
                {onAddManually && (
                  <button type="button" className="btn" onClick={onAddManually}>
                    Add manually
                  </button>
                )}
              </div>
            )}
          </div>
          {accounts.length === 0 && <p className="muted">No accounts yet. Connect one you hold elsewhere, or add it by hand.</p>}
          <div className="portal-account-grid">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                className={`portal-account-card ${openAccountId === account.id ? 'open' : ''} ${account.custody}`}
                onClick={() => setOpenAccountId((current) => (current === account.id ? null : account.id))}
              >
                <span>{account.institution} ···{account.mask}</span>
                <strong>{usd(accountBalance(account))}</strong>
                <em>
                  {account.custody === 'managed' ? 'Managed' : 'Held away'} · {account.name}
                  {account.review === 'pending' ? ' · waiting on your advisor' : ''}
                </em>
              </button>
            ))}
          </div>
          {openAccount && <AccountBook accounts={[openAccount]} />}
        </section>

        {positions.length > 0 && (
          <section className="portal-section">
            <h3>Positions</h3>
            <ul className="portal-positions">
              {positions.map((position) => (
                <li key={position.symbol}>
                  <span className="sym">{position.symbol}</span>
                  <span>
                    <strong>{position.name}</strong>
                    <em>
                      {position.shares.toLocaleString()} shares
                      {totals.total > 0 ? ` · ${Math.round((position.value / totals.total) * 100)}%` : ''}
                    </em>
                  </span>
                  <strong>{usd(position.value)}</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {allocation.length > 0 && (
          <section className="portal-section">
            <div className="portal-section-head">
              <h3>Asset allocation</h3>
              {drift != null && (
                <span className={`portal-drift ${Math.abs(drift) >= 5 ? 'off' : 'on'}`}>
                  {Math.abs(drift) < 1
                    ? 'On your target mix'
                    : `${Math.abs(drift)}% ${drift > 0 ? 'over' : 'under'} target equity`}
                </span>
              )}
            </div>
            <div className="portal-allocbar" role="img" aria-label="Asset allocation by class">
              {allocation.map((slice) => (
                <span
                  key={slice.label}
                  className={`portal-allocseg alloc-${slice.label.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                  style={{ width: `${slice.pct}%` }}
                  title={`${slice.label} · ${Math.round(slice.pct)}%`}
                />
              ))}
            </div>
            <ul className="portal-alloclist">
              {allocation.map((slice) => (
                <li key={slice.label}>
                  <span className={`portal-allocdot alloc-${slice.label.toLowerCase().replace(/[^a-z]+/g, '-')}`} aria-hidden="true" />
                  <span className="portal-alloclabel">{slice.label}</span>
                  <span className="portal-allocpct">{Math.round(slice.pct)}%</span>
                  <strong>{usd(slice.value)}</strong>
                </li>
              ))}
            </ul>
            {targetEquity != null && (
              <p className="muted portal-alloc-note">
                Your investment policy targets {targetEquity}% equity. Your advisor rebalances when the mix drifts past the guardrail.
              </p>
            )}
          </section>
        )}

        {goals.length > 0 && (
          <section className="portal-section">
            <h3>Goals</h3>
            <div className="portal-goals">
              {goals.map((goal) => {
                const progress = goalProgress(goal)
                return (
                  <div key={goal.id}>
                    <strong>{goal.name}</strong>
                    <span>{progress == null ? 'No target yet' : `${progress}% funded`}</span>
                    {progress != null && (
                      <div className="portal-pot">
                        <span style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section className="portal-section span-2">
          <div className="portal-section-head">
            <h3>Activity</h3>
            <div className="portal-ranges" role="tablist" aria-label="Activity type">
              {(
                [
                  ['all', 'All'],
                  ['transfer', 'Transfers'],
                  ['trade', 'Trades'],
                  ['income', 'Income'],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" role="tab" aria-selected={activityFilter === id} className={activityFilter === id ? 'active' : ''} onClick={() => setActivityFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ActivityList rows={visibleActivity} />
          {visibleActivity.length === 0 && <p className="muted">Nothing in this view yet.</p>}
        </section>
      </div>
    </div>
  )
}
