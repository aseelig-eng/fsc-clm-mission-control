// Performance reporting (#6): time-weighted and money-weighted returns by
// account and household, over standard periods, against a blended benchmark.
//
// Monthly returns are synthetic but deterministic (seeded per account) and are
// driven by each account's real asset mix, so an equity-heavy account behaves
// like one. External cash flows (contributions, transfers in/out) are what make
// TWR and IRR differ — exactly the distinction advisors have to explain.

import { accountBalance, type FinancialAccount } from './accounts'

export type PeriodId = 'QTD' | 'YTD' | '1Y' | '3Y' | 'ITD'
export const PERIODS: PeriodId[] = ['QTD', 'YTD', '1Y', '3Y', 'ITD']

/** Month index 0 = Oct 2023 … 35 = Sep 2026 (36 months of history, as of 2026-09-30). */
const MONTHS = 36
const MONTH_LABELS = Array.from({ length: MONTHS }, (_, i) => {
  const d = new Date(Date.UTC(2023, 9 + i, 1))
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
})

const PERIOD_MONTHS: Record<PeriodId, number> = { QTD: 3, YTD: 9, '1Y': 12, '3Y': 36, ITD: 36 }

function rng(seedText: string) {
  let a = 0
  for (let i = 0; i < seedText.length; i += 1) a = (Math.imul(a ^ seedText.charCodeAt(i), 2654435761) + i) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Shared monthly "market" factor series so every account sees the same market.
const market = (() => {
  const r = rng('market-factor')
  const g = () => Math.sqrt(-2 * Math.log(Math.max(r(), 1e-9))) * Math.cos(2 * Math.PI * r())
  const equity: number[] = []
  const bonds: number[] = []
  for (let i = 0; i < MONTHS; i += 1) {
    equity.push(0.0075 + 0.042 * g())
    bonds.push(0.0028 + 0.012 * g())
  }
  return { equity, bonds }
})()

function mixOf(account: FinancialAccount) {
  const total = accountBalance(account) || 1
  let equity = 0
  let fixed = 0
  let alts = 0
  for (const h of account.holdings) {
    if (/equity|international|stock/i.test(h.assetClass)) equity += h.value
    else if (/fixed|bond/i.test(h.assetClass)) fixed += h.value
    else if (/alt/i.test(h.assetClass)) alts += h.value
  }
  return { equity: equity / total, fixed: fixed / total, alts: alts / total, cash: Math.max(0, 1 - (equity + fixed + alts) / total) }
}

export interface AccountSeries {
  accountId: string
  /** Monthly portfolio returns (decimal). */
  returns: number[]
  /** Monthly external flows (positive = money in). */
  flows: number[]
  /** Month-end market values. */
  values: number[]
  benchmark: number[]
  mix: ReturnType<typeof mixOf>
}

export function accountSeries(account: FinancialAccount): AccountSeries {
  const mix = mixOf(account)
  const r = rng(`acct-${account.id}`)
  const noise = () => (r() - 0.5) * 0.006
  const returns = market.equity.map((eq, i) => mix.equity * eq + mix.fixed * market.bonds[i] + mix.alts * (0.005 + eq * 0.4) + mix.cash * 0.0025 + noise())
  const benchmark = market.equity.map((eq, i) => mix.equity * eq + (mix.fixed + mix.alts) * market.bonds[i] + mix.cash * 0.0025)
  // External flows: seeded periodic contributions + the account's real ledger contributions this year.
  const flows = new Array<number>(MONTHS).fill(0)
  const end = accountBalance(account)
  const contributionMonths = account.type === '401k' ? 'monthly' : account.type === 'roth' || account.type === 'ira' ? 'annual' : 'sporadic'
  for (let i = 0; i < MONTHS; i += 1) {
    if (contributionMonths === 'monthly') flows[i] = Math.round(end * 0.004)
    else if (contributionMonths === 'annual' && i % 12 === 6) flows[i] = Math.round(end * 0.03)
    else if (contributionMonths === 'sporadic' && r() < 0.08) flows[i] = Math.round(end * (r() < 0.6 ? 0.05 : -0.04))
  }
  for (const txn of account.transactions) {
    if (txn.type !== 'Contribution' && !(txn.type === 'Transfer' && txn.amount !== 0)) continue
    const d = new Date(`${txn.date}T00:00:00Z`)
    const idx = (d.getUTCFullYear() - 2023) * 12 + d.getUTCMonth() - 9
    if (idx >= 0 && idx < MONTHS) flows[idx] += txn.amount
  }
  // Walk backwards from today's balance so the series ends on the real number.
  const values = new Array<number>(MONTHS).fill(0)
  values[MONTHS - 1] = end
  for (let i = MONTHS - 1; i > 0; i -= 1) {
    values[i - 1] = Math.max(0, (values[i] - flows[i]) / (1 + returns[i]))
  }
  return { accountId: account.id, returns, flows, values, benchmark, mix }
}

function chain(returns: number[]) {
  return returns.reduce((acc, r) => acc * (1 + r), 1) - 1
}

function annualize(total: number, months: number) {
  if (months <= 12) return total
  return (1 + total) ** (12 / months) - 1
}

/** Money-weighted return (IRR) on monthly flows via bisection; annualized if > 1 year. */
function irr(start: number, flows: number[], end: number, months: number) {
  if (start <= 0 && flows.every((f) => f <= 0)) return 0
  const npv = (rate: number) => {
    let v = -start
    flows.forEach((f, i) => {
      v -= f / (1 + rate) ** (i + 1)
    })
    return v + end / (1 + rate) ** months
  }
  let lo = -0.2
  let hi = 0.2
  for (let k = 0; k < 80; k += 1) {
    const mid = (lo + hi) / 2
    if (npv(mid) > 0) lo = mid
    else hi = mid
  }
  const monthly = (lo + hi) / 2
  const total = (1 + monthly) ** months - 1
  return annualize(total, months)
}

export interface PeriodStats {
  period: PeriodId
  twr: number
  mwr: number
  benchmark: number
  excess: number
  startValue: number
  endValue: number
  netFlows: number
  gain: number
}

function statsFor(series: AccountSeries[], period: PeriodId): PeriodStats {
  const n = PERIOD_MONTHS[period]
  const from = MONTHS - n
  // Household-level: value-weight each month's returns by beginning value.
  const monthly: number[] = []
  const bench: number[] = []
  const flows: number[] = []
  for (let i = from; i < MONTHS; i += 1) {
    let begin = 0
    let weighted = 0
    let wBench = 0
    let flow = 0
    for (const s of series) {
      const b = i === 0 ? s.values[0] / (1 + s.returns[0]) : s.values[i - 1]
      begin += b
      weighted += b * s.returns[i]
      wBench += b * s.benchmark[i]
      flow += s.flows[i]
    }
    monthly.push(begin > 0 ? weighted / begin : 0)
    bench.push(begin > 0 ? wBench / begin : 0)
    flows.push(flow)
  }
  const startValue = series.reduce((sum, s) => sum + (from === 0 ? s.values[0] / (1 + s.returns[0]) : s.values[from - 1]), 0)
  const endValue = series.reduce((sum, s) => sum + s.values[MONTHS - 1], 0)
  const netFlows = flows.reduce((sum, f) => sum + f, 0)
  const twr = annualize(chain(monthly), n)
  const benchmark = annualize(chain(bench), n)
  return {
    period,
    twr,
    mwr: irr(startValue, flows, endValue, n),
    benchmark,
    excess: twr - benchmark,
    startValue: Math.round(startValue),
    endValue: Math.round(endValue),
    netFlows: Math.round(netFlows),
    gain: Math.round(endValue - startValue - netFlows),
  }
}

export interface PerformanceReport {
  household: PeriodStats[]
  byAccount: { account: FinancialAccount; stats: PeriodStats[] }[]
  /** Household value + cumulative benchmark growth, month by month (for the chart). */
  curve: { label: string; value: number; twrIndex: number; benchIndex: number }[]
}

export function performanceReport(accounts: FinancialAccount[]): PerformanceReport {
  const usable = accounts.filter((account) => account.type !== 'checking' && accountBalance(account) > 0)
  const series = usable.map(accountSeries)
  const household = PERIODS.map((p) => statsFor(series, p))
  const byAccount = usable.map((account, i) => ({ account, stats: PERIODS.map((p) => statsFor([series[i]], p)) }))
  let twrIndex = 100
  let benchIndex = 100
  const curve = MONTH_LABELS.map((label, i) => {
    let begin = 0
    let weighted = 0
    let wBench = 0
    for (const s of series) {
      const b = i === 0 ? s.values[0] / (1 + s.returns[0]) : s.values[i - 1]
      begin += b
      weighted += b * s.returns[i]
      wBench += b * s.benchmark[i]
    }
    twrIndex *= 1 + (begin > 0 ? weighted / begin : 0)
    benchIndex *= 1 + (begin > 0 ? wBench / begin : 0)
    return { label, value: Math.round(series.reduce((sum, s) => sum + s.values[i], 0)), twrIndex, benchIndex }
  })
  return { household, byAccount, curve }
}

export function pct(value: number, digits = 1) {
  const v = value * 100
  return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}%`
}

export function benchmarkLabel(accounts: FinancialAccount[]) {
  const usable = accounts.filter((account) => account.type !== 'checking' && accountBalance(account) > 0)
  if (usable.length === 0) return 'Blended benchmark'
  const total = usable.reduce((sum, a) => sum + accountBalance(a), 0)
  const eq = usable.reduce((sum, a) => sum + mixOf(a).equity * accountBalance(a), 0) / total
  const e = Math.round(eq * 100)
  return `${e}% MSCI ACWI / ${100 - e}% Bloomberg US Agg`
}
