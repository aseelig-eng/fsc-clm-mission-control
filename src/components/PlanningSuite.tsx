import { useMemo, useState, type ReactNode } from 'react'
import type { PortfolioState } from '../data/advice'
import {
  fmtK,
  oddsLevers,
  projectCashFlow,
  protectionAnalysis,
  protectionScore,
  runMonteCarlo,
  type FinancialProfile,
  type ProtectionLine,
} from '../data/financialProfile'
import { CashFlowChart, FanChart } from './PlanningCharts'

type SuiteTab = string

/**
 * Record → Planning. Wraps the existing Advice Desk and adds cash-flow
 * projection, a seeded Monte Carlo with "what moves the odds" levers, and an
 * insurance needs analysis. All three read the same household profile; the
 * advisor's edits write back to it, so every view stays in step.
 */
export function PlanningSuite({
  profile,
  portfolio,
  adviceDesk,
  referred,
  onProfile,
  onReferral,
  onNote,
  extraTabs = [],
}: {
  profile: FinancialProfile
  portfolio: PortfolioState
  adviceDesk: ReactNode
  referred: Set<string>
  onProfile: (patch: Partial<FinancialProfile>) => void
  onReferral: (line: ProtectionLine) => void
  onNote: (message: string) => void
  extraTabs?: { id: string; label: string; content: ReactNode }[]
}) {
  const [tab, setTab] = useState<SuiteTab>('advice')
  return (
    <div className="planning-suite">
      <div className="planning-tabs" role="tablist" aria-label="Planning tools">
        {(
          [
            ['advice', 'Plan & portfolio'],
            ['cashflow', 'Cash flow'],
            ['probability', 'Probability of success'],
            ['protection', 'Protection'],
          ] as const
        )
          .concat(extraTabs.map((t) => [t.id, t.label] as never))
          .map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'advice' && adviceDesk}
      {tab === 'cashflow' && <CashFlowPanel profile={profile} portfolio={portfolio} onProfile={onProfile} />}
      {tab === 'probability' && <ProbabilityPanel profile={profile} portfolio={portfolio} onProfile={onProfile} onNote={onNote} />}
      {extraTabs.find((t) => t.id === tab)?.content}
      {tab === 'protection' && <ProtectionPanel profile={profile} referred={referred} onReferral={onReferral} />}
    </div>
  )
}

function NumberField({ label, value, onChange, step = 1000, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="plan-field">
      <span>{label}</span>
      <span className="plan-field-input">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next)) onChange(next)
          }}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  )
}

export function CashFlowPanel({
  profile,
  portfolio,
  onProfile,
  compact = false,
}: {
  profile: FinancialProfile
  portfolio: PortfolioState
  onProfile?: (patch: Partial<FinancialProfile>) => void
  compact?: boolean
}) {
  const rows = useMemo(() => projectCashFlow(profile, portfolio), [profile, portfolio])
  const [showTable, setShowTable] = useState(false)
  const firstShort = rows.find((row) => row.shortfall > 0 || (row.phase === 'retired' && row.endBalance === 0))
  const atRetire = rows.find((row) => row.age === profile.retireAge) ?? rows[0]
  const end = rows[rows.length - 1]
  const firstRetired = rows.find((row) => row.phase === 'retired')
  const drawRate = firstRetired && atRetire ? firstRetired.withdrawal / Math.max(atRetire.endBalance, 1) : 0
  return (
    <div className="advice-card cashflow-card">
      <header>
        <h3>{compact ? 'Your cash flow, year by year' : 'Cash-flow projection'}</h3>
        <p className="muted">
          Income, spending, taxes and portfolio withdrawals from age {profile.primaryAge} to {profile.planToAge}, in nominal dollars at {(profile.inflation * 100).toFixed(1)}% inflation.
        </p>
      </header>
      <div className="plan-kpis">
        <div>
          <strong>{fmtK(atRetire?.endBalance ?? 0)}</strong>
          <span>At retirement (age {profile.retireAge})</span>
        </div>
        <div>
          <strong>{(drawRate * 100).toFixed(1)}%</strong>
          <span>First-year withdrawal rate</span>
        </div>
        <div className={firstShort ? 'bad' : 'good'}>
          <strong>{firstShort ? `Age ${firstShort.age}` : 'None'}</strong>
          <span>First shortfall year</span>
        </div>
        <div>
          <strong>{fmtK(end?.endBalance ?? 0)}</strong>
          <span>Left at {profile.planToAge}</span>
        </div>
      </div>
      <CashFlowChart rows={rows} retireAge={profile.retireAge} />
      <div className="plan-legend">
        <span className="lg work">Working · saving</span>
        <span className="lg retired">Retired · drawing</span>
        <span className="lg short">Shortfall</span>
      </div>
      {!compact && onProfile && (
        <div className="plan-assumptions">
          <h4>Assumptions (edit to re-run)</h4>
          <div className="plan-fields">
            <NumberField label="Retire at" value={profile.retireAge} step={1} suffix="age" onChange={(v) => onProfile({ retireAge: Math.max(profile.primaryAge, Math.min(80, v)) })} />
            <NumberField label="Spending today" value={profile.spending} onChange={(v) => onProfile({ spending: Math.max(0, v) })} />
            <NumberField label="Retirement spending" value={profile.retireSpending} onChange={(v) => onProfile({ retireSpending: Math.max(0, v) })} />
            <NumberField label="Annual savings" value={profile.annualSavings} onChange={(v) => onProfile({ annualSavings: Math.max(0, v) })} />
            <NumberField label="Social Security" value={profile.socialSecurity} onChange={(v) => onProfile({ socialSecurity: Math.max(0, v) })} />
            <NumberField label="Claim SS at" value={profile.ssClaimAge} step={1} suffix="age" onChange={(v) => onProfile({ ssClaimAge: Math.max(62, Math.min(70, v)) })} />
          </div>
        </div>
      )}
      {!compact && (
        <>
          <button type="button" className="btn sm" onClick={() => setShowTable((open) => !open)}>
            {showTable ? 'Hide' : 'Show'} year-by-year table
          </button>
          {showTable && (
            <div className="plan-table-wrap">
              <table className="plan-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Age</th>
                    <th>Earned</th>
                    <th>Soc. Sec.</th>
                    <th>Spending</th>
                    <th>Taxes</th>
                    <th>Saved</th>
                    <th>Withdrawn</th>
                    <th>End balance</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.year} className={row.shortfall > 0 ? 'short' : ''}>
                      <td>{row.year}</td>
                      <td>{row.age}</td>
                      <td>{fmtK(row.earned)}</td>
                      <td>{fmtK(row.socialSecurity)}</td>
                      <td>{fmtK(row.spending)}</td>
                      <td>{fmtK(row.taxes)}</td>
                      <td>{fmtK(row.savings)}</td>
                      <td>{fmtK(row.withdrawal)}</td>
                      <td>{row.shortfall > 0 ? `Short ${fmtK(row.shortfall)}` : fmtK(row.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ProbabilityPanel({
  profile,
  portfolio,
  onProfile,
  onNote,
}: {
  profile: FinancialProfile
  portfolio: PortfolioState
  onProfile: (patch: Partial<FinancialProfile>) => void
  onNote: (message: string) => void
}) {
  const [stress, setStress] = useState(false)
  const result = useMemo(() => runMonteCarlo(profile, portfolio, { stress: stress ? 0.3 : 0 }), [profile, portfolio, stress])
  const levers = useMemo(() => oddsLevers(profile, portfolio, runMonteCarlo(profile, portfolio).successPct), [profile, portfolio])
  const tone = result.successPct >= 80 ? 'good' : result.successPct >= 60 ? 'ok' : 'bad'
  return (
    <div className="advice-card mc-card">
      <header>
        <h3>Probability of success</h3>
        <p className="muted">
          {result.trials} seeded market paths · expected return {(result.assumptions.mu * 100).toFixed(1)}% · volatility {(result.assumptions.sigma * 100).toFixed(1)}% from the current allocation. Success = money lasts to age {profile.planToAge}.
        </p>
      </header>
      <div className="mc-top">
        <div className={`mc-gauge ${tone}`}>
          <strong>{result.successPct}%</strong>
          <span>{tone === 'good' ? 'Confident' : tone === 'ok' ? 'Needs a lever' : 'At risk'}</span>
        </div>
        <div className="plan-kpis">
          <div>
            <strong>{fmtK(result.medianEnd)}</strong>
            <span>Median at {profile.planToAge}</span>
          </div>
          <div className={result.p10DepletionAge ? 'bad' : 'good'}>
            <strong>{result.p10DepletionAge ? `Age ${result.p10DepletionAge}` : 'Never'}</strong>
            <span>Bad-luck (10th pct) runs out</span>
          </div>
        </div>
        <label className="mc-stress">
          <input type="checkbox" checked={stress} onChange={(e) => setStress(e.target.checked)} /> Stress: −30% over the first 3 years
        </label>
      </div>
      <FanChart result={result} />
      <div className="plan-legend">
        <span className="lg fan-o">10th–90th percentile</span>
        <span className="lg fan-i">25th–75th</span>
        <span className="lg fan-m">Median</span>
      </div>
      <h4>What moves the odds</h4>
      <ul className="mc-levers">
        {levers.map((lever) => (
          <li key={lever.id}>
            <span>
              <strong>{lever.label}</strong>
              <em>{lever.detail}</em>
            </span>
            <span className={`mc-delta ${lever.delta > 0 ? 'up' : lever.delta < 0 ? 'down' : ''}`}>
              {lever.delta > 0 ? '+' : ''}
              {lever.delta} pts → {lever.successPct}%
            </span>
            <button
              type="button"
              className="btn sm"
              disabled={lever.delta <= 0}
              onClick={() => {
                onProfile(lever.patch)
                onNote(`Plan updated: ${lever.label}. Probability of success is now ${lever.successPct}%.`)
              }}
            >
              Apply to plan
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ProtectionPanel({
  profile,
  referred,
  onReferral,
}: {
  profile: FinancialProfile
  referred: Set<string>
  onReferral: (line: ProtectionLine) => void
}) {
  const lines = useMemo(() => protectionAnalysis(profile), [profile])
  const score = protectionScore(lines)
  const gaps = lines.filter((line) => line.status === 'gap')
  return (
    <div className="advice-card protect-card">
      <header>
        <h3>Protection — insurance needs analysis</h3>
        <p className="muted">
          Modeled need vs cover in force ({profile.insurance.source}). Gaps are referred to the firm’s Insurance Desk for a licensed review — nothing is sold here.
        </p>
      </header>
      <div className="plan-kpis">
        <div className={score >= 90 ? 'good' : score >= 60 ? '' : 'bad'}>
          <strong>{score}%</strong>
          <span>Of modeled need covered</span>
        </div>
        <div className={gaps.length ? 'bad' : 'good'}>
          <strong>{gaps.length}</strong>
          <span>Gap{gaps.length === 1 ? '' : 's'} found</span>
        </div>
      </div>
      <ul className="protect-lines">
        {lines.map((line) => {
          const key = `${profile.householdId}-${line.id}`
          const unit = line.id === 'disability' ? '/mo' : ''
          const coverPct = line.need > 0 ? Math.min(100, Math.round((line.inForce / line.need) * 100)) : 100
          return (
            <li key={line.id} className={`protect-line st-${line.status}`}>
              <div className="protect-head">
                <strong>{line.label}</strong>
                <span className={`badge ${line.status === 'gap' ? 'high' : line.status === 'covered' ? 'done' : 'medium'}`}>
                  {line.status === 'gap' ? `Gap ${fmtK(line.gap)}${unit}` : line.status === 'covered' ? 'Covered' : 'n/a'}
                </span>
              </div>
              {line.status !== 'n/a' && (
                <>
                  <div className="protect-bar" aria-label={`${coverPct}% covered`}>
                    <span style={{ width: `${coverPct}%` }} />
                  </div>
                  <div className="protect-nums">
                    Need {fmtK(line.need)}
                    {unit} · in force {fmtK(line.inForce)}
                    {unit}
                  </div>
                </>
              )}
              <p className="muted protect-method">{line.method}</p>
              <p>{line.recommendation}</p>
              {line.status === 'gap' &&
                (referred.has(key) ? (
                  <span className="protect-referred">Referred to the Insurance Desk · task created</span>
                ) : (
                  <button type="button" className="btn sm primary" onClick={() => onReferral(line)}>
                    Refer to Insurance Desk
                  </button>
                ))}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
