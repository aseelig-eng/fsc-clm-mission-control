import { useMemo } from 'react'
import type { PlanState, PortfolioState } from '../data/advice'
import { goalsReport, TRACK_LABEL, wellbeing, type FinancialProfile } from '../data/financialProfile'
import { Sparkline } from './PlanningCharts'

/** Goals-based reporting (#7): funded %, projected %, on/at-risk/off track, change since last review. */
export function GoalsReport({
  plan,
  portfolio,
  profile,
  audience,
}: {
  plan: PlanState
  portfolio: PortfolioState
  profile: FinancialProfile
  audience: 'advisor' | 'client'
}) {
  const rows = useMemo(() => goalsReport(plan, portfolio, profile), [plan, portfolio, profile])
  if (rows.length === 0) {
    return (
      <section className="outcome-card">
        <h4>{audience === 'client' ? 'Your goals' : 'Goals progress'}</h4>
        <p className="muted">{audience === 'client' ? 'Your advisor will add goals after your first planning conversation.' : 'No goals captured yet — run discovery first.'}</p>
      </section>
    )
  }
  return (
    <section className="outcome-card goals-report">
      <div className="outcome-head">
        <h4>{audience === 'client' ? 'How your goals are tracking' : 'Goals progress'}</h4>
        <span className="muted">Since last review · {profile.lastReview.date}</span>
      </div>
      <ul>
        {rows.map((row) => (
          <li key={row.goal.id} className={`goal-row track-${row.track}`}>
            <div className="goal-row-head">
              <strong>{row.goal.name}</strong>
              <span className={`goal-track t-${row.track}`}>{TRACK_LABEL[row.track]}</span>
            </div>
            {row.fundedPct != null && (
              <div className="goal-bars" aria-label={`${row.fundedPct}% funded, projected ${row.projectedPct}%`}>
                <span className="goal-proj" style={{ width: `${Math.min(100, row.projectedPct ?? 0)}%` }} />
                <span className="goal-fund" style={{ width: `${Math.min(100, row.fundedPct)}%` }} />
              </div>
            )}
            <div className="goal-row-meta">
              {row.fundedPct != null ? `${row.fundedPct}% funded today` : 'No target'}
              {row.goal.horizonYears != null && ` · ${row.goal.horizonYears} yrs`}
              {row.sinceLastReview != null && (
                <span className={row.sinceLastReview > 0 ? 'up' : row.sinceLastReview < 0 ? 'down' : ''}>
                  {' '}
                  · {row.sinceLastReview > 0 ? '▲' : row.sinceLastReview < 0 ? '▼' : '—'} {Math.abs(row.sinceLastReview)} pts
                </span>
              )}
            </div>
            <p className="muted">{row.note}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Financial well-being (#8): 5-pillar score, quarterly trend, and the next best step per pillar. */
export function WellbeingCard({
  profile,
  audience,
  onStep,
  stepsTaken,
}: {
  profile: FinancialProfile
  audience: 'advisor' | 'client'
  onStep?: (pillarId: string, pillarLabel: string, step: string) => void
  stepsTaken?: Set<string>
}) {
  const wb = useMemo(() => wellbeing(profile), [profile])
  const history = [...profile.wellbeingHistory.map((point) => point.score), wb.score]
  const prior = profile.wellbeingHistory[profile.wellbeingHistory.length - 1]?.score ?? wb.score
  const delta = wb.score - prior
  return (
    <section className="outcome-card wellbeing-card">
      <div className="outcome-head">
        <h4>{audience === 'client' ? 'Your financial well-being' : 'Financial well-being'}</h4>
        <span className={`wb-band b-${wb.band.replace(/\s+/g, '-').toLowerCase()}`}>{wb.band}</span>
      </div>
      <div className="wb-top">
        <div className="wb-score">
          <strong>{wb.score}</strong>
          <span>/100</span>
          <em className={delta > 0 ? 'up' : delta < 0 ? 'down' : ''}>
            {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)} vs {profile.wellbeingHistory[profile.wellbeingHistory.length - 1]?.quarter ?? 'last'}
          </em>
        </div>
        <div className="wb-trend">
          <Sparkline values={history} label="Well-being score trend" />
          <span className="muted">{[...profile.wellbeingHistory.map((p) => p.quarter), 'Now'].join(' · ')}</span>
        </div>
      </div>
      <ul className="wb-pillars">
        {wb.pillars.map((pillar) => {
          const key = `${profile.householdId}-${pillar.id}`
          return (
            <li key={pillar.id}>
              <div className="wb-pillar-head">
                <span>{pillar.label}</span>
                <strong>{pillar.score}</strong>
              </div>
              <div className="wb-bar">
                <span className={pillar.score >= 80 ? 'good' : pillar.score >= 50 ? 'ok' : 'weak'} style={{ width: `${pillar.score}%` }} />
              </div>
              <div className="muted wb-detail">{pillar.detail}</div>
              {pillar.nextStep && (
                <div className="wb-step">
                  <span>Next: {pillar.nextStep}</span>
                  {onStep &&
                    (stepsTaken?.has(key) ? (
                      <em>{audience === 'advisor' ? 'Task created' : 'Sent to your advisor'}</em>
                    ) : (
                      <button type="button" className="btn sm ghost" onClick={() => onStep(pillar.id, pillar.label, pillar.nextStep!)}>
                        {audience === 'advisor' ? 'Create task' : 'Ask my advisor'}
                      </button>
                    ))}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
