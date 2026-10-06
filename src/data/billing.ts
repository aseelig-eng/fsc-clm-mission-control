// Fee for service (#13). AUM fee alongside planning-fee, subscription and
// hourly engagements. Agreement -> client e-sign -> invoice -> paid.

export type EngagementType = 'aum' | 'planning' | 'subscription' | 'hourly'

export const ENGAGEMENT_LABEL: Record<EngagementType, string> = {
  aum: 'Asset-based (AUM) fee',
  planning: 'Planning fee (flat)',
  subscription: 'Planning subscription',
  hourly: 'Hourly consulting',
}

export interface FeeAgreement {
  id: string
  householdId: string
  type: EngagementType
  /** Flat amount per bill (planning), per month (subscription), or per hour. */
  amount: number
  /** Hours used this period (hourly). */
  hours?: number
  status: 'awaiting_signature' | 'active' | 'ended'
  signedOn?: string
  createdOn: string
}

export interface Invoice {
  id: string
  householdId: string
  agreementId: string
  type: EngagementType
  period: string
  amount: number
  basis: string
  status: 'draft' | 'sent' | 'paid'
  issued?: string
  due?: string
  paidOn?: string
}

export const AUM_TIERS = [
  { upTo: 1_000_000, bps: 100 },
  { upTo: 3_000_000, bps: 80 },
  { upTo: Infinity, bps: 60 },
]

/** Tiered quarterly AUM fee (annual rate / 4), billed in advance on quarter-end value. */
export function aumQuarterlyFee(aum: number) {
  let remaining = aum
  let prev = 0
  let annual = 0
  for (const tier of AUM_TIERS) {
    const slice = Math.min(remaining, tier.upTo - prev)
    if (slice <= 0) break
    annual += (slice * tier.bps) / 10000
    remaining -= slice
    prev = tier.upTo
  }
  return Math.round(annual / 4)
}

export const initialAgreements: FeeAgreement[] = [
  { id: 'fa-h1-aum', householdId: 'h1', type: 'aum', amount: 0, status: 'active', signedOn: '2026-08-02', createdOn: '2026-07-30' },
  { id: 'fa-h2-aum', householdId: 'h2', type: 'aum', amount: 0, status: 'active', signedOn: '2024-03-12', createdOn: '2024-03-10' },
  { id: 'fa-h2-plan', householdId: 'h2', type: 'planning', amount: 4500, status: 'active', signedOn: '2026-01-15', createdOn: '2026-01-10' },
  { id: 'fa-h3-aum', householdId: 'h3', type: 'aum', amount: 0, status: 'active', signedOn: '2025-05-20', createdOn: '2025-05-18' },
  { id: 'fa-h4-hourly', householdId: 'h4', type: 'hourly', amount: 350, hours: 6, status: 'active', signedOn: '2026-06-01', createdOn: '2026-05-28' },
]

export const initialInvoices: Invoice[] = [
  { id: 'inv-h2-plan-1', householdId: 'h2', agreementId: 'fa-h2-plan', type: 'planning', period: '2026 annual plan update', amount: 4500, basis: 'Flat planning fee', status: 'sent', issued: '2026-08-15', due: '2026-09-14' },
  { id: 'inv-h3-q3', householdId: 'h3', agreementId: 'fa-h3-aum', type: 'aum', period: 'Q3 2026', amount: 2150, basis: 'Tiered AUM fee on quarter-end value', status: 'paid', issued: '2026-07-01', due: '2026-07-31', paidOn: '2026-07-12' },
]

export function isOverdue(invoice: Invoice, today = '2026-10-06') {
  return invoice.status === 'sent' && !!invoice.due && invoice.due < today
}

export function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}
