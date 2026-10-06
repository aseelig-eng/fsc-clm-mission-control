// Tax-efficient distribution (#12). Withdrawal sequencing across taxable,
// tax-deferred and Roth buckets with RMDs, comparing the conventional order
// (taxable -> deferred -> Roth) with bracket filling and Roth conversions.
// All figures are in today's dollars (real return, constant brackets).

import type { FinancialAccount } from './accounts'
import { accountBalance } from './accounts'
import type { PortfolioState } from './advice'
import { portfolioAssumptions, type FinancialProfile } from './financialProfile'

export interface Buckets {
  taxable: number
  deferred: number
  roth: number
}

export function bucketsFor(accounts: FinancialAccount[]): Buckets {
  const b: Buckets = { taxable: 0, deferred: 0, roth: 0 }
  for (const a of accounts) {
    if (a.type === 'checking') continue
    const v = accountBalance(a)
    if (a.type === 'ira' || a.type === '401k') b.deferred += v
    else if (a.type === 'roth') b.roth += v
    else b.taxable += v
  }
  return b
}

const MFJ = [
  [24800, 0.1],
  [100800, 0.12],
  [211400, 0.22],
  [403550, 0.24],
  [512450, 0.32],
  [768700, 0.35],
  [Infinity, 0.37],
] as const
const STD_MFJ = 32200
const RMD_START = 73
const GAIN_FRACTION = 0.4
const LTCG = 0.15
/** Deferred balances left at the end are valued after an assumed heir tax rate. */
export const HEIR_RATE = 0.24
export const FILL_TO = 0.22

const DIVISOR: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5,
  83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5,
}
const divisor = (age: number) => DIVISOR[age] ?? 8.9

function scale(joint: boolean) {
  return joint ? 1 : 0.5
}

function ordinaryTax(income: number, joint: boolean) {
  const s = scale(joint)
  const taxable = Math.max(0, income - STD_MFJ * s)
  let tax = 0
  let prev = 0
  for (const [top, rate] of MFJ) {
    const cap = top * s
    if (taxable > prev) tax += (Math.min(taxable, cap) - prev) * rate
    prev = cap
    if (taxable <= cap) break
  }
  return tax
}

/** Ordinary income that still fits under the top of the target bracket. */
function bracketRoom(otherOrdinary: number, joint: boolean) {
  const s = scale(joint)
  const top = MFJ.find(([, rate]) => rate === FILL_TO)![0] * s
  return Math.max(0, top + STD_MFJ * s - otherOrdinary)
}

export interface DistRow {
  age: number
  need: number
  rmd: number
  fromTaxable: number
  fromDeferred: number
  fromRoth: number
  conversion: number
  tax: number
  total: number
}

export interface Strategy {
  id: 'naive' | 'optimized'
  label: string
  rows: DistRow[]
  lifetimeTax: number
  endBalance: number
  runsOutAt: number | null
}

export interface DistributionPlan {
  buckets: Buckets
  naive: Strategy
  optimized: Strategy
  taxSaved: number
  endGain: number
  conversionTotal: number
  firstRmd: DistRow | null
  startAge: number
}

function simulate(id: Strategy['id'], profile: FinancialProfile, start: Buckets, realReturn: number): Strategy {
  const joint = profile.spouseName != null
  const startAge = Math.max(profile.retireAge, profile.primaryAge)
  const b = { ...start }
  // Grow to retirement, adding savings to the taxable bucket.
  for (let age = profile.primaryAge; age < startAge; age++) {
    b.taxable = (b.taxable + profile.annualSavings) * (1 + realReturn)
    b.deferred *= 1 + realReturn
    b.roth *= 1 + realReturn
  }
  const rows: DistRow[] = []
  let lifetimeTax = 0
  let runsOutAt: number | null = null

  for (let age = startAge; age <= profile.planToAge; age++) {
    const ss = age >= profile.ssClaimAge ? profile.socialSecurity : 0
    const need = Math.max(0, profile.retireSpending - ss - profile.pension)
    const rmd = age >= RMD_START ? b.deferred / divisor(age) : 0
    const otherOrdinary = ss * 0.85 + profile.pension
    let tax = 0
    let alloc = { taxable: 0, deferred: 0, roth: 0, conversion: 0 }
    for (let pass = 0; pass < 4; pass++) {
      const cash = need + tax
      let deferredTake = Math.min(b.deferred, rmd)
      if (id === 'optimized') {
        deferredTake = Math.min(b.deferred, Math.max(rmd, bracketRoom(otherOrdinary, joint)))
      }
      let spendDeferred: number
      let conversion = 0
      let taxableTake = 0
      let rothTake = 0
      if (id === 'optimized') {
        spendDeferred = Math.min(deferredTake, cash)
        conversion = Math.max(0, deferredTake - Math.max(rmd, spendDeferred))
        // anything over the cash need that is not a conversion is excess RMD
      } else {
        spendDeferred = Math.min(deferredTake, cash)
      }
      let remaining = cash - spendDeferred
      if (id === 'naive') {
        taxableTake = Math.min(b.taxable, remaining)
        remaining -= taxableTake
        const moreDeferred = Math.min(b.deferred - deferredTake, remaining)
        spendDeferred += moreDeferred
        deferredTake += moreDeferred
        remaining -= moreDeferred
        rothTake = Math.min(b.roth, remaining)
        remaining -= rothTake
      } else {
        taxableTake = Math.min(b.taxable, remaining)
        remaining -= taxableTake
        rothTake = Math.min(b.roth, remaining)
        remaining -= rothTake
        const moreDeferred = Math.min(b.deferred - deferredTake, remaining)
        spendDeferred += moreDeferred
        deferredTake += moreDeferred
        remaining -= moreDeferred
      }
      alloc = { taxable: taxableTake, deferred: deferredTake, roth: rothTake, conversion }
      const ordinary = otherOrdinary + deferredTake
      const next = ordinaryTax(ordinary, joint) + taxableTake * GAIN_FRACTION * LTCG
      if (Math.abs(next - tax) < 1) {
        tax = next
        break
      }
      tax = next
    }
    // Post flows.
    const cashOut = need + tax
    const spent = Math.min(alloc.deferred - alloc.conversion, cashOut) // deferred actually spent
    b.deferred -= alloc.deferred
    b.taxable -= alloc.taxable
    b.roth -= alloc.roth
    const deferredCash = alloc.deferred - alloc.conversion
    const excess = Math.max(0, deferredCash - Math.min(deferredCash, cashOut)) // RMD beyond need -> taxable
    b.taxable += excess
    b.roth += alloc.conversion
    void spent
    const shortfall = cashOut - (deferredCash - excess + alloc.taxable + alloc.roth)
    if (shortfall > 50 && runsOutAt == null) runsOutAt = age
    lifetimeTax += tax
    rows.push({
      age,
      need,
      rmd,
      fromTaxable: alloc.taxable,
      fromDeferred: deferredCash,
      fromRoth: alloc.roth,
      conversion: alloc.conversion,
      tax,
      total: b.taxable + b.deferred + b.roth,
    })
    b.taxable = Math.max(0, b.taxable) * (1 + realReturn)
    b.deferred = Math.max(0, b.deferred) * (1 + realReturn)
    b.roth = Math.max(0, b.roth) * (1 + realReturn)
  }
  return {
    id,
    label: id === 'naive' ? 'Conventional order (taxable, then deferred, then Roth)' : 'Bracket-filling with Roth conversions',
    rows,
    lifetimeTax,
    endBalance: b.taxable + b.deferred * (1 - HEIR_RATE) + b.roth,
    runsOutAt,
  }
}

export function distributionPlan(profile: FinancialProfile, portfolio: PortfolioState, accounts: FinancialAccount[]): DistributionPlan | null {
  const buckets = bucketsFor(accounts)
  if (buckets.taxable + buckets.deferred + buckets.roth <= 0) return null
  const real = portfolioAssumptions(portfolio).mu - profile.inflation
  const naive = simulate('naive', profile, buckets, real)
  const optimized = simulate('optimized', profile, buckets, real)
  return {
    buckets,
    naive,
    optimized,
    taxSaved: Math.round(naive.lifetimeTax - optimized.lifetimeTax),
    endGain: Math.round(optimized.endBalance - naive.endBalance),
    conversionTotal: Math.round(optimized.rows.reduce((s, r) => s + r.conversion, 0)),
    firstRmd: naive.rows.find((r) => r.rmd > 0) ?? null,
    startAge: Math.max(profile.retireAge, profile.primaryAge),
  }
}
