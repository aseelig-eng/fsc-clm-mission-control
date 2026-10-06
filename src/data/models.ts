// Advisory platforms: TAMP / UMA / SMA model marketplace (#10).
// Strategist models with minimums, fees and risk bands. An advisor assigns a
// managed account to a program; the model's equity target then drives
// rebalancing and the all-in fee is compared with the current fee.

import type { RiskLevel } from './advice'
import { RISK_LEVELS } from './advice'
import type { AccountType } from './accounts'

export type Vehicle = 'UMA model' | 'SMA' | 'TAMP model'

export interface StrategistModel {
  id: string
  strategist: string
  name: string
  vehicle: Vehicle
  riskBand: RiskLevel
  equityPct: number
  minimum: number
  strategistFeeBps: number
  platformFeeBps: number
  taxManaged: boolean
  summary: string
}

export const MODELS: StrategistModel[] = [
  { id: 'cap-income', strategist: 'Northgate Capital', name: 'Income & Preservation 30/70', vehicle: 'UMA model', riskBand: 'Conservative', equityPct: 30, minimum: 50000, strategistFeeBps: 18, platformFeeBps: 8, taxManaged: false, summary: 'Short-duration core bonds, dividend equity sleeve.' },
  { id: 'cap-balanced', strategist: 'Northgate Capital', name: 'Balanced 50/50', vehicle: 'UMA model', riskBand: 'Moderate', equityPct: 50, minimum: 50000, strategistFeeBps: 20, platformFeeBps: 8, taxManaged: false, summary: 'Global diversified, quarterly rebalance.' },
  { id: 'ws-core60', strategist: 'Westfield Asset Mgmt', name: 'Core 60/40', vehicle: 'TAMP model', riskBand: 'Moderate', equityPct: 60, minimum: 100000, strategistFeeBps: 15, platformFeeBps: 10, taxManaged: false, summary: 'Low-cost index core with a factor tilt.' },
  { id: 'ws-growth75', strategist: 'Westfield Asset Mgmt', name: 'Growth 75/25', vehicle: 'TAMP model', riskBand: 'Growth', equityPct: 75, minimum: 100000, strategistFeeBps: 16, platformFeeBps: 10, taxManaged: false, summary: 'Equity-led with intermediate bonds as ballast.' },
  { id: 'tm-growth75', strategist: 'Oakline Tax-Smart', name: 'Tax-Managed Growth 75/25', vehicle: 'SMA', riskBand: 'Growth', equityPct: 75, minimum: 250000, strategistFeeBps: 30, platformFeeBps: 10, taxManaged: true, summary: 'Direct indexing with daily loss harvesting. Taxable accounts only.' },
  { id: 'tm-muni40', strategist: 'Oakline Tax-Smart', name: 'Tax-Managed Muni 40/60', vehicle: 'SMA', riskBand: 'Moderate', equityPct: 40, minimum: 250000, strategistFeeBps: 28, platformFeeBps: 10, taxManaged: true, summary: 'National muni ladder plus tax-aware equity. Taxable accounts only.' },
  { id: 'esg-growth70', strategist: 'Meridian Sustainable', name: 'Sustainable Growth 70/30', vehicle: 'UMA model', riskBand: 'Growth', equityPct: 70, minimum: 75000, strategistFeeBps: 24, platformFeeBps: 8, taxManaged: false, summary: 'ESG-screened equity, green and social bonds.' },
  { id: 'ag-aggr90', strategist: 'Summit Equity Partners', name: 'Aggressive 90/10', vehicle: 'TAMP model', riskBand: 'Aggressive', equityPct: 90, minimum: 100000, strategistFeeBps: 22, platformFeeBps: 10, taxManaged: false, summary: 'Global equity, small and mid-cap tilt.' },
]

export const ADVISOR_FEE_BPS = 100

export interface Program {
  modelId: string
  assignedOn: string
}

const TAXABLE: AccountType[] = ['brokerage', 'joint', 'trust']

export interface ModelFit {
  model: StrategistModel
  eligible: boolean
  /** Hard reasons the account cannot use the model. */
  blockers: string[]
  /** Soft notes. */
  notes: string[]
  score: number
}

export function modelFit(model: StrategistModel, input: { balance: number; accountType: AccountType; risk: RiskLevel | '' }): ModelFit {
  const blockers: string[] = []
  const notes: string[] = []
  if (input.balance < model.minimum) blockers.push(`Below the ${fmt(model.minimum)} minimum`)
  if (model.taxManaged && !TAXABLE.includes(input.accountType)) blockers.push('Tax-managed models only fit taxable accounts')
  let score = 50
  if (input.risk) {
    const gap = Math.abs(RISK_LEVELS.indexOf(model.riskBand) - RISK_LEVELS.indexOf(input.risk))
    if (gap > 1) blockers.push(`${model.riskBand} is more than one step from the client’s ${input.risk} risk tolerance`)
    else if (gap === 1) notes.push(`One step from the client’s ${input.risk} tolerance`)
    score += gap === 0 ? 40 : gap === 1 ? 10 : -40
  }
  if (model.taxManaged && TAXABLE.includes(input.accountType)) {
    score += 8
    notes.push('Tax-managed: fits a taxable account')
  }
  score -= (model.strategistFeeBps + model.platformFeeBps) / 4
  return { model, eligible: blockers.length === 0, blockers, notes, score }
}

const fmt = (n: number) => `$${n.toLocaleString('en-US')}`

export function allInBps(model: StrategistModel, advisorBps = ADVISOR_FEE_BPS) {
  return advisorBps + model.strategistFeeBps + model.platformFeeBps
}
