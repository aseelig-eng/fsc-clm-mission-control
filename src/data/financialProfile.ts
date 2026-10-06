// Household financial profile + the planning engines that read it.
//
// One profile per household feeds cash-flow projection (#3), the seeded Monte
// Carlo (#4), insurance needs analysis (#5), goals-based reporting (#7) and the
// financial well-being score (#8). Data is entered once here and read
// everywhere — nothing in the planning views keeps its own copy.

import type { PlanGoal, PlanState, PortfolioState } from './advice'
import { goalProgress } from './advice'

export interface Debt {
  label: string
  balance: number
  rate: number
}

export interface FinancialProfile {
  householdId: string
  primaryName: string
  primaryAge: number
  spouseName: string | null
  spouseAge: number | null
  retireAge: number
  planToAge: number
  /** Gross earned household income today. */
  earnedIncome: number
  /** Annual savings into investable accounts while working. */
  annualSavings: number
  /** Living spend today (pre-retirement). */
  spending: number
  /** Living spend in retirement, today's dollars. */
  retireSpending: number
  socialSecurity: number
  ssClaimAge: number
  pension: number
  /** Investable assets (managed + held away, ex-checking). */
  investable: number
  /** Liquid cash outside the portfolio. */
  emergencyFund: number
  debts: Debt[]
  dependents: number
  /** Children's education still to fund (today's dollars). */
  educationNeed: number
  effectiveTaxRate: number
  inflation: number
  insurance: {
    lifeCover: number
    /** Monthly disability benefit in force. */
    disabilityMonthly: number
    ltc: boolean
    umbrella: number
    /** Where existing cover sits (Insurance Desk line / outside). */
    source: string
  }
  estate: {
    will: boolean
    poa: boolean
    healthcareDirective: boolean
    beneficiariesCurrent: boolean
    trust: boolean
  }
  /** Quarterly well-being history (oldest → newest), for the trend line. */
  wellbeingHistory: { quarter: string; score: number }[]
  /** Funded % per goal at the last review, for "trend since last review". */
  lastReview: { date: string; funded: Record<string, number> }
}

export const initialProfiles: Record<string, FinancialProfile> = {
  h0: {
    householdId: 'h0',
    primaryName: 'Elena Vasquez',
    primaryAge: 47,
    spouseName: null,
    spouseAge: null,
    retireAge: 60,
    planToAge: 95,
    earnedIncome: 640000,
    annualSavings: 120000,
    spending: 260000,
    retireSpending: 240000,
    socialSecurity: 44000,
    ssClaimAge: 67,
    pension: 0,
    investable: 4600000,
    emergencyFund: 722400,
    debts: [],
    dependents: 2,
    educationNeed: 320000,
    effectiveTaxRate: 0.31,
    inflation: 0.025,
    insurance: { lifeCover: 2000000, disabilityMonthly: 15000, ltc: false, umbrella: 5000000, source: 'Insurance Desk · R. Okafor' },
    estate: { will: true, poa: false, healthcareDirective: false, beneficiariesCurrent: true, trust: false },
    wellbeingHistory: [
      { quarter: 'Q4 25', score: 66 },
      { quarter: 'Q1 26', score: 68 },
      { quarter: 'Q2 26', score: 70 },
      { quarter: 'Q3 26', score: 71 },
    ],
    lastReview: { date: '2026-06-30', funded: {} },
  },
  h1: {
    householdId: 'h1',
    primaryName: 'Maya Chen',
    primaryAge: 34,
    spouseName: null,
    spouseAge: null,
    retireAge: 60,
    planToAge: 95,
    earnedIncome: 185000,
    annualSavings: 30000,
    spending: 96000,
    retireSpending: 90000,
    socialSecurity: 32000,
    ssClaimAge: 67,
    pension: 0,
    investable: 496000,
    emergencyFund: 24300,
    debts: [
      { label: 'Residential mortgage', balance: 412000, rate: 0.059 },
      { label: 'Car loan', balance: 18500, rate: 0.064 },
    ],
    dependents: 0,
    educationNeed: 0,
    effectiveTaxRate: 0.26,
    inflation: 0.025,
    insurance: { lifeCover: 370000, disabilityMonthly: 4000, ltc: false, umbrella: 0, source: 'Employer group plan (held away)' },
    estate: { will: false, poa: false, healthcareDirective: false, beneficiariesCurrent: false, trust: false },
    wellbeingHistory: [
      { quarter: 'Q4 25', score: 48 },
      { quarter: 'Q1 26', score: 51 },
      { quarter: 'Q2 26', score: 55 },
      { quarter: 'Q3 26', score: 57 },
    ],
    lastReview: { date: '2026-06-30', funded: { 'maya-growth': 8, 'maya-home': 0 } },
  },
  h2: {
    householdId: 'h2',
    primaryName: 'Robert Whitfield',
    primaryAge: 68,
    spouseName: 'Eleanor Whitfield',
    spouseAge: 65,
    retireAge: 68,
    planToAge: 95,
    earnedIncome: 0,
    annualSavings: 0,
    spending: 180000,
    retireSpending: 180000,
    socialSecurity: 62000,
    ssClaimAge: 68,
    pension: 24000,
    investable: 5020000,
    emergencyFund: 180000,
    debts: [],
    dependents: 0,
    educationNeed: 0,
    effectiveTaxRate: 0.24,
    inflation: 0.025,
    insurance: { lifeCover: 3000000, disabilityMonthly: 0, ltc: false, umbrella: 0, source: 'Insurance Desk · whole life' },
    estate: { will: true, poa: true, healthcareDirective: true, beneficiariesCurrent: false, trust: true },
    wellbeingHistory: [
      { quarter: 'Q4 25', score: 70 },
      { quarter: 'Q1 26', score: 71 },
      { quarter: 'Q2 26', score: 69 },
      { quarter: 'Q3 26', score: 72 },
    ],
    lastReview: { date: '2026-06-30', funded: { 'whit-preserve': 0, 'whit-transfer': 0 } },
  },
  h3: {
    householdId: 'h3',
    primaryName: 'Jordan Adams',
    primaryAge: 58,
    spouseName: 'Sam Adams',
    spouseAge: 56,
    retireAge: 62,
    planToAge: 95,
    earnedIncome: 420000,
    annualSavings: 60000,
    spending: 168000,
    retireSpending: 152000,
    socialSecurity: 58000,
    ssClaimAge: 67,
    pension: 0,
    investable: 4210000,
    emergencyFund: 96000,
    debts: [{ label: 'Home equity line', balance: 60000, rate: 0.081 }],
    dependents: 0,
    educationNeed: 0,
    effectiveTaxRate: 0.29,
    inflation: 0.025,
    insurance: { lifeCover: 1500000, disabilityMonthly: 12000, ltc: false, umbrella: 2000000, source: 'ILIT at the Trust Company' },
    estate: { will: true, poa: true, healthcareDirective: true, beneficiariesCurrent: true, trust: true },
    wellbeingHistory: [
      { quarter: 'Q4 25', score: 77 },
      { quarter: 'Q1 26', score: 79 },
      { quarter: 'Q2 26', score: 80 },
      { quarter: 'Q3 26', score: 82 },
    ],
    lastReview: { date: '2026-06-30', funded: { 'adams-income': 96 } },
  },
  h4: {
    householdId: 'h4',
    primaryName: 'Amara Okonkwo',
    primaryAge: 61,
    spouseName: null,
    spouseAge: null,
    retireAge: 61,
    planToAge: 95,
    earnedIncome: 0,
    annualSavings: 0,
    spending: 70000,
    retireSpending: 70000,
    socialSecurity: 38000,
    ssClaimAge: 62,
    pension: 0,
    investable: 1100000,
    emergencyFund: 53200,
    debts: [],
    dependents: 0,
    educationNeed: 0,
    effectiveTaxRate: 0.18,
    inflation: 0.025,
    insurance: { lifeCover: 0, disabilityMonthly: 0, ltc: false, umbrella: 0, source: 'None on file' },
    estate: { will: false, poa: false, healthcareDirective: false, beneficiariesCurrent: false, trust: false },
    wellbeingHistory: [
      { quarter: 'Q4 25', score: 62 },
      { quarter: 'Q1 26', score: 49 },
      { quarter: 'Q2 26', score: 44 },
      { quarter: 'Q3 26', score: 46 },
    ],
    lastReview: { date: '2026-06-30', funded: { 'oko-estate': 100, 'oko-income': 100 } },
  },
}

// ── Capital-market assumptions (firm CMA, illustrative) ───────────────────
const CMA = {
  equity: { mu: 0.072, sigma: 0.165 },
  fixed: { mu: 0.042, sigma: 0.055 },
  cash: { mu: 0.03, sigma: 0.01 },
  alts: { mu: 0.065, sigma: 0.12 },
}

export function portfolioAssumptions(portfolio: PortfolioState) {
  const sleeves = portfolio.equity + portfolio.fixed + portfolio.cash + portfolio.alts
  // A household with no allocation yet is modeled as a 60/40 placeholder.
  const w =
    sleeves > 0
      ? { equity: portfolio.equity / sleeves, fixed: portfolio.fixed / sleeves, cash: portfolio.cash / sleeves, alts: portfolio.alts / sleeves }
      : { equity: 0.6, fixed: 0.35, cash: 0.05, alts: 0 }
  const mu = w.equity * CMA.equity.mu + w.fixed * CMA.fixed.mu + w.cash * CMA.cash.mu + w.alts * CMA.alts.mu
  // Simple correlation haircut: equity/alts move together, bonds diversify.
  const variance =
    (w.equity * CMA.equity.sigma + w.alts * CMA.alts.sigma) ** 2 + (w.fixed * CMA.fixed.sigma) ** 2 + (w.cash * CMA.cash.sigma) ** 2
  return { mu, sigma: Math.sqrt(variance), weights: w }
}

// ── Cash-flow projection (#3) ─────────────────────────────────────────────

export interface CashFlowYear {
  year: number
  age: number
  phase: 'working' | 'retired'
  earned: number
  socialSecurity: number
  pension: number
  spending: number
  taxes: number
  savings: number
  withdrawal: number
  growth: number
  endBalance: number
  shortfall: number
}

export interface CashFlowOptions {
  /** Override retire age (levers). */
  retireAge?: number
  /** Multiply retirement spending (levers). */
  spendFactor?: number
  /** Extra annual savings (levers). */
  extraSavings?: number
  /** Override return. */
  returnRate?: number
}

const START_YEAR = 2026

export function projectCashFlow(profile: FinancialProfile, portfolio: PortfolioState, options: CashFlowOptions = {}): CashFlowYear[] {
  const retireAge = options.retireAge ?? profile.retireAge
  const spendFactor = options.spendFactor ?? 1
  const extraSavings = options.extraSavings ?? 0
  const r = options.returnRate ?? portfolioAssumptions(portfolio).mu
  const rows: CashFlowYear[] = []
  let balance = profile.investable
  for (let i = 0; profile.primaryAge + i <= profile.planToAge; i += 1) {
    const age = profile.primaryAge + i
    const infl = (1 + profile.inflation) ** i
    const working = age < retireAge
    const earned = working ? profile.earnedIncome * (1.03 ** i) : 0
    const ss = age >= profile.ssClaimAge ? profile.socialSecurity * infl : 0
    const pension = profile.pension * (age >= retireAge ? 1 : 0)
    const spending = (working ? profile.spending : profile.retireSpending * spendFactor) * infl
    const savings = working ? (profile.annualSavings + extraSavings) * infl : 0
    const taxable = earned + ss * 0.85 + pension
    let withdrawal = Math.max(0, spending + savings - (earned + ss + pension) + taxable * profile.effectiveTaxRate)
    // Withdrawals are themselves partly taxable (deferred accounts): gross them up.
    withdrawal = working ? 0 : withdrawal / (1 - profile.effectiveTaxRate * 0.6)
    const taxes = taxable * profile.effectiveTaxRate + (working ? 0 : withdrawal * profile.effectiveTaxRate * 0.6)
    const growth = balance * r
    const contribution = working ? savings : 0
    let next = balance + growth + contribution - withdrawal
    let shortfall = 0
    if (next < 0) {
      shortfall = -next
      next = 0
    }
    rows.push({
      year: START_YEAR + i,
      age,
      phase: working ? 'working' : 'retired',
      earned: Math.round(earned),
      socialSecurity: Math.round(ss),
      pension: Math.round(pension),
      spending: Math.round(spending),
      taxes: Math.round(taxes),
      savings: Math.round(contribution),
      withdrawal: Math.round(withdrawal),
      growth: Math.round(growth),
      endBalance: Math.round(next),
      shortfall: Math.round(shortfall),
    })
    balance = next
  }
  return rows
}

// ── Seeded Monte Carlo (#4) ───────────────────────────────────────────────

/** mulberry32 — tiny deterministic PRNG so the same household always gets the same paths. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(text: string) {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

export interface MonteCarloResult {
  trials: number
  successPct: number
  /** Per-year percentile balances. */
  bands: { age: number; year: number; p10: number; p25: number; p50: number; p75: number; p90: number }[]
  medianEnd: number
  p10End: number
  /** Age at which the 10th-percentile path runs out, if it does. */
  p10DepletionAge: number | null
  assumptions: { mu: number; sigma: number }
}

export function runMonteCarlo(
  profile: FinancialProfile,
  portfolio: PortfolioState,
  options: CashFlowOptions & { trials?: number; stress?: number } = {},
): MonteCarloResult {
  const trials = options.trials ?? 600
  const base = projectCashFlow(profile, portfolio, { ...options, returnRate: 0 })
  const { mu, sigma } = portfolioAssumptions(portfolio)
  const rand = mulberry32(seedFrom(`${profile.householdId}-mc`))
  const gauss = () => {
    // Box–Muller
    const u = Math.max(rand(), 1e-9)
    const v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const years = base.length
  const paths: number[][] = Array.from({ length: years }, () => new Array<number>(trials))
  let successes = 0
  for (let t = 0; t < trials; t += 1) {
    let balance = profile.investable
    let failed = false
    for (let y = 0; y < years; y += 1) {
      const row = base[y]
      // Optional early-horizon stress (e.g. a bear market in the first 3 years).
      const stress = options.stress && y < 3 ? options.stress / 3 : 0
      const ret = mu + sigma * gauss() - stress
      balance = balance * (1 + ret) + row.savings - row.withdrawal
      if (balance <= 0) {
        balance = 0
        failed = true
      }
      paths[y][t] = balance
    }
    if (!failed) successes += 1
  }
  const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]
  const bands = paths.map((values, y) => {
    const sorted = [...values].sort((a, b) => a - b)
    return {
      age: base[y].age,
      year: base[y].year,
      p10: Math.round(pct(sorted, 0.1)),
      p25: Math.round(pct(sorted, 0.25)),
      p50: Math.round(pct(sorted, 0.5)),
      p75: Math.round(pct(sorted, 0.75)),
      p90: Math.round(pct(sorted, 0.9)),
    }
  })
  const depleted = bands.find((band) => band.p10 <= 0)
  return {
    trials,
    successPct: Math.round((successes / trials) * 100),
    bands,
    medianEnd: bands[bands.length - 1]?.p50 ?? 0,
    p10End: bands[bands.length - 1]?.p10 ?? 0,
    p10DepletionAge: depleted ? depleted.age : null,
    assumptions: { mu, sigma },
  }
}

export interface OddsLever {
  id: 'retire_later' | 'spend_less' | 'save_more' | 'delay_ss'
  label: string
  detail: string
  successPct: number
  delta: number
  patch: Partial<FinancialProfile>
}

/** "What moves the odds": each lever re-runs the same seeded simulation with one change. */
export function oddsLevers(profile: FinancialProfile, portfolio: PortfolioState, baseline: number): OddsLever[] {
  const levers: Omit<OddsLever, 'successPct' | 'delta'>[] = []
  if (profile.earnedIncome > 0) {
    levers.push({
      id: 'retire_later',
      label: `Retire at ${profile.retireAge + 2}`,
      detail: 'Two more earning and saving years, two fewer drawdown years.',
      patch: { retireAge: profile.retireAge + 2 },
    })
    levers.push({
      id: 'save_more',
      label: `Save ${fmtK(Math.round(profile.earnedIncome * 0.05))} more a year`,
      detail: 'Five percent of income added to annual savings until retirement.',
      patch: { annualSavings: profile.annualSavings + Math.round(profile.earnedIncome * 0.05) },
    })
  }
  levers.push({
    id: 'spend_less',
    label: `Spend ${fmtK(Math.round(profile.retireSpending * 0.1))} less in retirement`,
    detail: 'Ten percent lower retirement lifestyle spending.',
    patch: { retireSpending: Math.round(profile.retireSpending * 0.9) },
  })
  if (profile.ssClaimAge < 70 && profile.primaryAge < profile.ssClaimAge) {
    const years = 70 - profile.ssClaimAge
    levers.push({
      id: 'delay_ss',
      label: 'Claim Social Security at 70',
      detail: `${years} years of delayed credits (≈8%/yr) for a larger lifetime benefit.`,
      patch: { ssClaimAge: 70, socialSecurity: Math.round(profile.socialSecurity * (1 + 0.08 * years)) },
    })
  }
  return levers
    .map((lever) => {
      const successPct = runMonteCarlo({ ...profile, ...lever.patch }, portfolio).successPct
      return { ...lever, successPct, delta: successPct - baseline }
    })
    .sort((a, b) => b.delta - a.delta)
}

export function fmtK(value: number) {
  const abs = Math.abs(value)
  const sign = value < 0 ? '−' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`
  if (abs >= 1000) return `${sign}$${Math.round(abs / 1000)}k`
  return `${sign}$${Math.round(abs)}`
}

// ── Insurance needs analysis (#5) ─────────────────────────────────────────

export interface ProtectionLine {
  id: 'life' | 'disability' | 'ltc' | 'umbrella'
  label: string
  need: number
  inForce: number
  gap: number
  status: 'covered' | 'gap' | 'n/a'
  method: string
  recommendation: string
}

export function protectionAnalysis(profile: FinancialProfile): ProtectionLine[] {
  const debts = profile.debts.reduce((sum, debt) => sum + debt.balance, 0)
  const yearsToRetire = Math.max(0, profile.retireAge - profile.primaryAge)
  // DIME-style life need: debts + income replacement + mortgage + education + final expenses, less liquid assets earmarked.
  const incomeReplacement = profile.earnedIncome * 0.7 * Math.min(yearsToRetire, 10)
  const survivorIncome = profile.spouseName && profile.earnedIncome === 0 ? profile.retireSpending * 0.4 * 5 : 0
  const lifeNeedGross = debts + incomeReplacement + survivorIncome + profile.educationNeed + 25000
  const offset = profile.dependents > 0 || profile.spouseName ? profile.investable * 0.25 : profile.investable * 0.6
  const lifeNeed = Math.max(0, Math.round(lifeNeedGross - offset))
  const lifeApplies = profile.dependents > 0 || !!profile.spouseName || debts > 0
  const life: ProtectionLine = {
    id: 'life',
    label: 'Life insurance',
    need: lifeApplies ? lifeNeed : 0,
    inForce: profile.insurance.lifeCover,
    gap: lifeApplies ? Math.max(0, lifeNeed - profile.insurance.lifeCover) : 0,
    status: !lifeApplies ? 'n/a' : lifeNeed > profile.insurance.lifeCover ? 'gap' : 'covered',
    method: 'Debts + 70% income × years to retirement (cap 10) + education + final expenses − liquid assets earmarked',
    recommendation: '',
  }
  const disabilityNeedMonthly = profile.earnedIncome > 0 ? Math.round((profile.earnedIncome * 0.6) / 12) : 0
  const disability: ProtectionLine = {
    id: 'disability',
    label: 'Disability income',
    need: disabilityNeedMonthly,
    inForce: profile.insurance.disabilityMonthly,
    gap: Math.max(0, disabilityNeedMonthly - profile.insurance.disabilityMonthly),
    status: disabilityNeedMonthly === 0 ? 'n/a' : disabilityNeedMonthly > profile.insurance.disabilityMonthly ? 'gap' : 'covered',
    method: '60% of gross earned income, monthly, while working',
    recommendation: '',
  }
  const ltcApplies = profile.primaryAge >= 50
  const ltcNeed = ltcApplies ? 3 * 120000 : 0
  const selfFund = profile.investable > 3_000_000
  const ltc: ProtectionLine = {
    id: 'ltc',
    label: 'Long-term care',
    need: ltcNeed,
    inForce: profile.insurance.ltc ? ltcNeed : selfFund ? ltcNeed : 0,
    gap: !ltcApplies || profile.insurance.ltc || selfFund ? 0 : ltcNeed,
    status: !ltcApplies ? 'n/a' : profile.insurance.ltc || selfFund ? 'covered' : 'gap',
    method: '3 years × $120k national median private room; self-funding allowed above $3M investable',
    recommendation: '',
  }
  const netWorth = profile.investable + profile.emergencyFund - debts
  const umbrellaNeed = netWorth >= 1_000_000 ? Math.min(10_000_000, Math.ceil(netWorth / 1_000_000) * 1_000_000) : 1_000_000
  const umbrella: ProtectionLine = {
    id: 'umbrella',
    label: 'Umbrella liability',
    need: umbrellaNeed,
    inForce: profile.insurance.umbrella,
    gap: Math.max(0, umbrellaNeed - profile.insurance.umbrella),
    status: umbrellaNeed > profile.insurance.umbrella ? 'gap' : 'covered',
    method: 'Net worth rounded up to the next $1M, capped at $10M',
    recommendation: '',
  }
  const lines = [life, disability, ltc, umbrella]
  for (const item of lines) {
    item.recommendation =
      item.status === 'gap'
        ? item.id === 'disability'
          ? `Close a ${fmtK(item.gap)}/mo benefit gap — refer to the Insurance Desk for an own-occupation quote.`
          : `Close a ${fmtK(item.gap)} gap — refer to the Insurance Desk for a needs-based review.`
        : item.status === 'covered'
          ? item.id === 'ltc' && !profile.insurance.ltc
            ? 'Self-funding is reasonable at this asset level. Revisit at the annual review.'
            : 'Cover in force meets the modeled need.'
          : 'Not applicable at this life stage.'
  }
  return lines
}

export function protectionScore(lines: ProtectionLine[]) {
  const scored = lines.filter((line) => line.status !== 'n/a')
  if (scored.length === 0) return 100
  const parts = scored.map((line) => (line.need <= 0 ? 1 : Math.min(1, line.inForce / line.need)))
  return Math.round((parts.reduce((sum, part) => sum + part, 0) / parts.length) * 100)
}

// ── Goals-based reporting (#7) ────────────────────────────────────────────

export type GoalTrack = 'on_track' | 'at_risk' | 'off_track' | 'unscored'

export interface GoalReport {
  goal: PlanGoal
  fundedPct: number | null
  projectedPct: number | null
  track: GoalTrack
  sinceLastReview: number | null
  note: string
}

export function goalsReport(plan: PlanState, portfolio: PortfolioState, profile: FinancialProfile): GoalReport[] {
  const { mu } = portfolioAssumptions(portfolio)
  const scored = plan.goals.filter((goal) => goal.targetUsd && goal.targetUsd > 0)
  return plan.goals.map((goal) => {
    const fundedPct = goalProgress(goal)
    if (fundedPct == null || !goal.targetUsd) {
      return { goal, fundedPct: null, projectedPct: null, track: 'unscored', sinceLastReview: null, note: 'No target yet — set one to track it.' }
    }
    const years = Math.max(goal.horizonYears ?? 1, 1)
    // Savings are split evenly across the scored goals still below target.
    const share = scored.length > 0 ? profile.annualSavings / scored.length : 0
    const fv = (goal.fundedUsd ?? 0) * (1 + mu) ** years + (mu > 0 ? share * (((1 + mu) ** years - 1) / mu) : share * years)
    const projectedPct = Math.round((fv / goal.targetUsd) * 100)
    const track: GoalTrack = projectedPct >= 95 ? 'on_track' : projectedPct >= 75 ? 'at_risk' : 'off_track'
    const prior = profile.lastReview.funded[goal.id]
    const sinceLastReview = prior == null ? null : fundedPct - prior
    const note =
      track === 'on_track'
        ? `Projected ${projectedPct}% of target in ${years} yrs at ${(mu * 100).toFixed(1)}% expected return.`
        : track === 'at_risk'
          ? `Projected ${projectedPct}% — a small savings or timing change closes it.`
          : `Projected ${projectedPct}% — needs a funding plan or a revised target.`
    return { goal, fundedPct, projectedPct, track, sinceLastReview, note }
  })
}

export const TRACK_LABEL: Record<GoalTrack, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  off_track: 'Off track',
  unscored: 'Not scored',
}

// ── Financial well-being score (#8) ───────────────────────────────────────

export interface WellbeingPillar {
  id: 'emergency' | 'debt' | 'protection' | 'savings' | 'estate'
  label: string
  score: number
  detail: string
  nextStep: string | null
}

export function wellbeing(profile: FinancialProfile) {
  const monthly = profile.spending / 12
  const months = monthly > 0 ? profile.emergencyFund / monthly : 12
  const emergency = Math.min(100, Math.round((months / 6) * 100))
  const debtTotal = profile.debts.reduce((sum, debt) => sum + debt.balance, 0)
  const nonMortgage = profile.debts.filter((debt) => !/mortgage/i.test(debt.label)).reduce((sum, debt) => sum + debt.balance, 0)
  const incomeBase = profile.earnedIncome + profile.socialSecurity + profile.pension
  const dti = incomeBase > 0 ? debtTotal / incomeBase : 0
  const debt = Math.max(0, Math.min(100, Math.round(100 - dti * 30 - (nonMortgage > 0 ? 8 : 0))))
  const protection = protectionScore(protectionAnalysis(profile))
  let savings: number
  let savingsDetail: string
  if (profile.earnedIncome > 0) {
    const rate = profile.annualSavings / profile.earnedIncome
    savings = Math.min(100, Math.round((rate / 0.15) * 100))
    savingsDetail = `Saving ${(rate * 100).toFixed(0)}% of income (target 15%).`
  } else {
    const draw = Math.max(0, profile.retireSpending - profile.socialSecurity - profile.pension)
    const rate = profile.investable > 0 ? draw / profile.investable : 1
    savings = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, rate - 0.04) * 1500)))
    savingsDetail = `Withdrawing ${(rate * 100).toFixed(1)}% a year (guardrail 4%).`
  }
  const estateItems = [profile.estate.will, profile.estate.poa, profile.estate.healthcareDirective, profile.estate.beneficiariesCurrent]
  const estate = Math.round((estateItems.filter(Boolean).length / estateItems.length) * 100)
  const missingEstate = [
    !profile.estate.will && 'will',
    !profile.estate.poa && 'power of attorney',
    !profile.estate.healthcareDirective && 'healthcare directive',
    !profile.estate.beneficiariesCurrent && 'beneficiary review',
  ].filter(Boolean) as string[]
  const pillars: WellbeingPillar[] = [
    {
      id: 'emergency',
      label: 'Emergency fund',
      score: emergency,
      detail: `${months.toFixed(1)} months of spending in cash (target 6).`,
      nextStep: emergency < 100 ? `Build cash to ${fmtK(monthly * 6)} — ${fmtK(Math.max(0, monthly * 6 - profile.emergencyFund))} to go.` : null,
    },
    {
      id: 'debt',
      label: 'Debt',
      score: debt,
      detail: debtTotal > 0 ? `${fmtK(debtTotal)} owed · ${(dti * 100).toFixed(0)}% of annual income.` : 'No debt on file.',
      nextStep: nonMortgage > 0 ? `Pay down ${fmtK(nonMortgage)} of non-mortgage debt first.` : null,
    },
    {
      id: 'protection',
      label: 'Protection',
      score: protection,
      detail: `${protection}% of the modeled insurance need is in force.`,
      nextStep: protection < 90 ? 'Review the protection gaps with the Insurance Desk.' : null,
    },
    {
      id: 'savings',
      label: profile.earnedIncome > 0 ? 'Savings rate' : 'Sustainable spending',
      score: savings,
      detail: savingsDetail,
      nextStep: savings < 80 ? (profile.earnedIncome > 0 ? 'Raise automatic savings toward 15%.' : 'Trim the draw or build a spending guardrail.') : null,
    },
    {
      id: 'estate',
      label: 'Estate readiness',
      score: estate,
      detail: missingEstate.length === 0 ? 'Will, POA, directive and beneficiaries are current.' : `Missing: ${missingEstate.join(', ')}.`,
      nextStep: missingEstate.length > 0 ? `Complete the ${missingEstate[0]}.` : null,
    },
  ]
  const score = Math.round(pillars.reduce((sum, pillar) => sum + pillar.score, 0) / pillars.length)
  const band = score >= 80 ? 'Thriving' : score >= 65 ? 'Steady' : score >= 50 ? 'Building' : 'Needs attention'
  return { score, band, pillars }
}
