import { useMemo, useState } from 'react'
import { accountBalance, usd, type FinancialAccount } from '../data/accounts'
import type { RiskLevel } from '../data/advice'
import { ADVISOR_FEE_BPS, allInBps, MODELS, modelFit, type Program } from '../data/models'
import { distributionPlan, FILL_TO, HEIR_RATE } from '../data/distribution'
import type { PortfolioState } from '../data/advice'
import { fmtK, type FinancialProfile } from '../data/financialProfile'

/** Model marketplace (#10): strategist models, fit, fee impact, assign to a managed account. */
export function ModelMarketplace({
  accounts,
  risk,
  programs,
  onAssign,
  onRemove,
  canAssign = true,
}: {
  accounts: FinancialAccount[]
  risk: RiskLevel | ''
  programs: Record<string, Program>
  onAssign: (account: FinancialAccount, modelId: string) => void
  onRemove: (accountId: string) => void
  canAssign?: boolean
}) {
  const managed = accounts.filter((a) => a.custody === 'managed' && a.holdings.length > 0 && !/frozen|tod claim/i.test(a.status))
  const [accountId, setAccountId] = useState(managed[0]?.id ?? '')
  const account = managed.find((a) => a.id === accountId) ?? managed[0]
  const balance = account ? accountBalance(account) : 0
  const fits = useMemo(
    () =>
      account
        ? MODELS.map((m) => modelFit(m, { balance, accountType: account.type, risk })).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score)
        : [],
    [account, balance, risk],
  )
  if (!account) return <p className="muted">No managed accounts can join a program yet (held-away, frozen or empty accounts are excluded).</p>
  const current = programs[account.id]
  const currentModel = MODELS.find((m) => m.id === current?.modelId)
  const baseBps = ADVISOR_FEE_BPS
  return (
    <div className="models">
      <div className="models-head">
        <label>
          Account{' '}
          <select value={account.id} onChange={(e) => setAccountId(e.target.value)}>
            {managed.map((a) => (
              <option key={a.id} value={a.id}>
                {a.institution} {a.name} ···{a.mask} · {usd(accountBalance(a))}
              </option>
            ))}
          </select>
        </label>
        <span className="muted">
          Client risk tolerance: <strong>{risk || 'not set'}</strong> · current fee: advisory {baseBps} bps
          {currentModel ? ` + ${currentModel.name}` : ''}
        </span>
      </div>
      <div className="model-grid">
        {fits.map(({ model, eligible, blockers, notes }, index) => {
          const total = allInBps(model)
          const delta = ((total - baseBps) * balance) / 10000
          const assigned = current?.modelId === model.id
          return (
            <div key={model.id} className={`model-card ${eligible ? '' : 'ineligible'} ${assigned ? 'assigned' : ''}`}>
              <div className="model-top">
                <div>
                  <strong>{model.name}</strong>
                  <div className="muted">
                    {model.strategist} · {model.vehicle}
                  </div>
                </div>
                {index === 0 && eligible && !assigned && <span className="badge done">Best fit</span>}
                {assigned && <span className="badge running">Assigned</span>}
              </div>
              <p className="muted">{model.summary}</p>
              <dl className="model-facts">
                <div>
                  <dt>Risk band</dt>
                  <dd>{model.riskBand} · {model.equityPct}% equity</dd>
                </div>
                <div>
                  <dt>Minimum</dt>
                  <dd>{usd(model.minimum)}</dd>
                </div>
                <div>
                  <dt>Model + platform fee</dt>
                  <dd>
                    {model.strategistFeeBps} + {model.platformFeeBps} bps
                  </dd>
                </div>
                <div>
                  <dt>All-in with your {baseBps} bps</dt>
                  <dd>
                    {total} bps · +{usd(delta)}/yr
                  </dd>
                </div>
              </dl>
              {blockers.map((b) => (
                <div key={b} className="model-blocker">
                  ✕ {b}
                </div>
              ))}
              {notes.map((n) => (
                <div key={n} className="model-note">
                  {n}
                </div>
              ))}
              {assigned ? (
                <button type="button" className="btn sm" onClick={() => onRemove(account.id)}>
                  Remove from program
                </button>
              ) : (
                <button type="button" className="btn primary sm" disabled={!eligible || !canAssign} title={canAssign ? '' : 'Complete the TAMP / UMA certification in Book → My learning'} onClick={() => onAssign(account, model.id)}>
                  Assign to this account
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** Tax-efficient distribution (#12). */
export function DistributionPanel({
  profile,
  portfolio,
  accounts,
  onTask,
}: {
  profile: FinancialProfile
  portfolio: PortfolioState
  accounts: FinancialAccount[]
  onTask: (subject: string) => void
}) {
  const plan = useMemo(() => distributionPlan(profile, portfolio, accounts), [profile, portfolio, accounts])
  const [which, setWhich] = useState<'naive' | 'optimized'>('optimized')
  if (!plan) return <p className="muted">No investable accounts on file yet, so there is nothing to sequence.</p>
  const strat = plan[which]
  const { buckets } = plan
  const total = buckets.taxable + buckets.deferred + buckets.roth
  const hasDeferred = buckets.deferred > 0
  return (
    <div className="dist-panel">
      <div className="dist-buckets" aria-label="Where the money sits">
        {(
          [
            ['Taxable', buckets.taxable, 'tx'],
            ['Tax-deferred (IRA / 401k)', buckets.deferred, 'df'],
            ['Roth', buckets.roth, 'rt'],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className={`dist-bucket ${cls}`} style={{ flexGrow: Math.max(value / total, 0.04) }}>
            <strong>{fmtK(value)}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="plan-kpis">
        <div className={plan.taxSaved > 0 ? 'good' : ''}>
          <strong>{fmtK(plan.taxSaved)}</strong>
          <span>Lifetime tax saved vs the conventional order</span>
        </div>
        <div className={plan.endGain > 0 ? 'good' : plan.endGain < 0 ? 'bad' : ''}>
          <strong>{plan.endGain >= 0 ? '+' : '-'}{fmtK(Math.abs(plan.endGain))}</strong>
          <span>After-tax legacy at {profile.planToAge} (deferred taxed at {Math.round(HEIR_RATE * 100)}%)</span>
        </div>
        <div>
          <strong>{fmtK(plan.conversionTotal)}</strong>
          <span>Roth conversions, filling to the {Math.round(FILL_TO * 100)}% bracket</span>
        </div>
        <div>
          <strong>{plan.firstRmd ? fmtK(plan.firstRmd.rmd) : '—'}</strong>
          <span>First RMD (age 73), conventional order</span>
        </div>
      </div>
      {!hasDeferred && <p className="muted">There is no tax-deferred money, so no RMDs or conversions apply. The order below is the only lever.</p>}
      <div className="portal-ranges" role="tablist" aria-label="Strategy">
        <button type="button" role="tab" aria-selected={which === 'optimized'} className={which === 'optimized' ? 'active' : ''} onClick={() => setWhich('optimized')}>
          Bracket-filling + Roth conversions
        </button>
        <button type="button" role="tab" aria-selected={which === 'naive'} className={which === 'naive' ? 'active' : ''} onClick={() => setWhich('naive')}>
          Conventional order
        </button>
      </div>
      <p className="muted">
        {strat.label}. Lifetime tax {usd(strat.lifetimeTax)}. Today’s dollars, starting at age {plan.startAge}.
        {strat.runsOutAt ? ` Spending is not fully funded from age ${strat.runsOutAt}.` : ''}
      </p>
      <div className="plan-table-wrap">
        <table className="plan-table">
          <thead>
            <tr>
              <th>Age</th>
              <th>Spending need</th>
              <th>RMD</th>
              <th>Taxable</th>
              <th>Deferred</th>
              <th>Roth</th>
              <th>Roth conversion</th>
              <th>Tax</th>
              <th>Portfolio (after-tax basis)</th>
            </tr>
          </thead>
          <tbody>
            {strat.rows.filter((_, i) => i % 3 === 0 || strat.rows[i].rmd > 0 && i % 3 === 0).map((r) => (
              <tr key={r.age}>
                <td>{r.age}</td>
                <td>{usd(r.need)}</td>
                <td>{r.rmd ? usd(r.rmd) : ''}</td>
                <td>{r.fromTaxable ? usd(r.fromTaxable) : ''}</td>
                <td>{r.fromDeferred ? usd(r.fromDeferred) : ''}</td>
                <td>{r.fromRoth ? usd(r.fromRoth) : ''}</td>
                <td>{r.conversion ? usd(r.conversion) : ''}</td>
                <td>{usd(r.tax)}</td>
                <td>{fmtK(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasDeferred && plan.conversionTotal > 0 && (
        <button
          type="button"
          className="btn primary sm"
          onClick={() => onTask(`Roth conversion plan: convert ${fmtK(plan.conversionTotal)} over the low-bracket years, saving about ${fmtK(plan.taxSaved)} lifetime tax`)}
        >
          Add Roth conversion plan to the work queue
        </button>
      )}
      <p className="muted perf-disclosure">Illustration only. Uses a simplified 2026 federal bracket schedule, constant in real terms, a 40% gain share on taxable withdrawals and no state tax. Not tax advice.</p>
    </div>
  )
}
