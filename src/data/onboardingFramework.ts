import type { LifecycleStageId } from './types'

export type FieldStatus = 'complete' | 'partial' | 'missing' | 'blocked' | 'n/a'
export type DocStatus = 'filed' | 'pending' | 'nigo' | 'not_started'

export interface FormField {
  key: string
  label: string
  value: string
  status: FieldStatus
}

export interface FormSection {
  id: string
  label: string
  phase: '1_intake' | '2_kyc' | '3_custody' | '4_orientation' | 'ongoing'
  stageIds: LifecycleStageId[]
  fields: FormField[]
}

export interface ComplianceDocument {
  id: string
  name: string
  category: 'legal' | 'disclosure' | 'suitability' | 'custodial' | 'tax' | 'audit'
  status: DocStatus
  filedOn?: string
  notes?: string
}

export interface LifecycleMonitor {
  status: 'not_armed' | 'arming' | 'activated' | 'monitoring'
  decision: string
  annualKycRefreshScheduled: boolean
  annualKycRefreshDate?: string
  lifeEventListenerArmed: boolean
  remindersScheduled: number
  orientation?: {
    datetime: string
    playbookId: string
    filedOnPersonAccount: boolean
  }
  portalProvisioned: boolean
  welcomeKitSent: boolean
  billingInitialized: boolean
  cadence30_60_90: boolean
}

export interface ClientOnboardingRecord {
  householdId: string
  personAccountId: string
  currentStageLabel: string
  primaryGoal: string
  timeHorizonYears: number | null
  fundingMethod: string
  fundingAmountUsd: number | null
  governmentIdType: string
  sourceOfWealth: string
  sections: FormSection[]
  documents: ComplianceDocument[]
  monitor: LifecycleMonitor
}

function sectionPct(section: FormSection) {
  const countable = section.fields.filter((f) => f.status !== 'n/a')
  if (countable.length === 0) return 100
  const score = countable.reduce((s, f) => {
    if (f.status === 'complete') return s + 1
    if (f.status === 'partial') return s + 0.5
    return s
  }, 0)
  return Math.round((score / countable.length) * 100)
}

export function recordCompleteness(record: ClientOnboardingRecord) {
  const fields = record.sections.flatMap((s) => s.fields).filter((f) => f.status !== 'n/a')
  const score = fields.reduce((s, f) => {
    if (f.status === 'complete') return s + 1
    if (f.status === 'partial') return s + 0.5
    return s
  }, 0)
  const pct = fields.length ? Math.round((score / fields.length) * 100) : 0
  const docsFiled = record.documents.filter((d) => d.status === 'filed').length
  const docsTotal = record.documents.length
  const gaps = record.sections.flatMap((s) =>
    s.fields
      .filter((f) => f.status === 'missing' || f.status === 'blocked' || f.status === 'partial')
      .map((f) => ({ section: s.label, field: f.label, status: f.status, value: f.value })),
  )
  return {
    pct,
    docsFiled,
    docsTotal,
    docsPct: docsTotal ? Math.round((docsFiled / docsTotal) * 100) : 0,
    sectionStats: record.sections.map((s) => ({ id: s.id, label: s.label, pct: sectionPct(s), phase: s.phase })),
    gaps,
  }
}

const STANDARD_DOCS: Omit<ComplianceDocument, 'status' | 'filedOn' | 'notes'>[] = [
  { id: 'iaa', name: 'Investment Advisory Agreement (IAA)', category: 'legal' },
  { id: 'crs', name: 'Form CRS', category: 'disclosure' },
  { id: 'adv2a', name: 'ADV Part 2A Brochure', category: 'disclosure' },
  { id: 'adv2b', name: 'ADV Part 2B Brochure Supplement', category: 'disclosure' },
  { id: 'ips', name: 'Investment Policy Statement (IPS)', category: 'suitability' },
  { id: 'fee', name: 'Fee Schedule A', category: 'legal' },
  { id: 'custodial', name: 'Custodial new-account application', category: 'custodial' },
  { id: 'tax', name: 'Tax form (W-9 / W-8BEN)', category: 'tax' },
  { id: 'esign', name: 'E-sign audit trail', category: 'audit' },
]

function docs(
  map: Partial<Record<string, Pick<ComplianceDocument, 'status' | 'filedOn' | 'notes'>>>,
): ComplianceDocument[] {
  return STANDARD_DOCS.map((d) => ({
    ...d,
    status: map[d.id]?.status ?? 'not_started',
    filedOn: map[d.id]?.filedOn,
    notes: map[d.id]?.notes,
  }))
}

function baseSections(overrides: {
  goal?: Partial<FormField>
  horizon?: Partial<FormField>
  idType?: Partial<FormField>
  sow?: Partial<FormField>
  fundingMethod?: Partial<FormField>
  fundingAmount?: Partial<FormField>
  extra?: Partial<Record<string, Partial<FormField>>>
}): FormSection[] {
  const x = overrides.extra ?? {}
  const f = (key: string, label: string, def: FormField, o?: Partial<FormField>): FormField => ({
    ...def,
    key,
    label,
    ...(o ?? {}),
    ...(x[key] ?? {}),
  })

  return [
    {
      id: 'client_details',
      label: 'Client & Details',
      phase: '1_intake',
      stageIds: ['prospect', 'discovery'],
      fields: [
        f('firstName', 'First Name', { key: '', label: '', value: '', status: 'complete' }, x.firstName),
        f('lastName', 'Last Name', { key: '', label: '', value: '', status: 'complete' }, x.lastName),
        f('dob', 'Date of Birth', { key: '', label: '', value: '', status: 'complete' }, x.dob),
        f('ssn', 'SSN / Tax ID', { key: '', label: '', value: '***-**-4481', status: 'complete' }, x.ssn),
        f('email', 'Email', { key: '', label: '', value: '', status: 'complete' }, x.email),
        f('phone', 'Phone', { key: '', label: '', value: '', status: 'complete' }, x.phone),
        f('address', 'Legal Address', { key: '', label: '', value: '', status: 'complete' }, x.address),
      ],
    },
    {
      id: 'prospect_advisor',
      label: 'Prospect & Advisor',
      phase: '1_intake',
      stageIds: ['prospect', 'discovery'],
      fields: [
        f('advisor', 'Servicing Advisor', { key: '', label: '', value: 'A. Rivera', status: 'complete' }),
        f('source', 'Lead Source', { key: '', label: '', value: 'CPA referral', status: 'complete' }, x.source),
        f('household', 'Household / Person Account', { key: '', label: '', value: '', status: 'complete' }, x.household),
      ],
    },
    {
      id: 'financial_profile',
      label: 'Financial Profile',
      phase: '1_intake',
      stageIds: ['discovery', 'proposal'],
      fields: [
        f('goal', 'Primary financial goal', { key: '', label: '', value: 'Retirement income', status: 'complete' }, overrides.goal),
        f('horizon', 'Investment time horizon (years)', { key: '', label: '', value: '18', status: 'complete' }, overrides.horizon),
        f('netWorth', 'Net Worth', { key: '', label: '', value: '', status: 'complete' }, x.netWorth),
        f('income', 'Annual Income', { key: '', label: '', value: '', status: 'complete' }, x.income),
        f('liquidity', 'Liquidity Needs', { key: '', label: '', value: '2 years expenses', status: 'complete' }, x.liquidity),
        f('investable', 'Investable Assets', { key: '', label: '', value: '', status: 'complete' }, x.investable),
      ],
    },
    {
      id: 'employment',
      label: 'Personal & Employment',
      phase: '1_intake',
      stageIds: ['discovery'],
      fields: [
        f('employer', 'Employer', { key: '', label: '', value: '', status: 'complete' }, x.employer),
        f('title', 'Job Title', { key: '', label: '', value: '', status: 'complete' }, x.title),
        f('citizenship', 'Citizenship', { key: '', label: '', value: 'US', status: 'complete' }, x.citizenship),
      ],
    },
    {
      id: 'risk',
      label: 'Risk & Suitability',
      phase: '1_intake',
      stageIds: ['discovery', 'proposal'],
      fields: [
        f('riskTol', 'Risk Tolerance', { key: '', label: '', value: '', status: 'complete' }, x.riskTol),
        f('riskCap', 'Risk Capacity', { key: '', label: '', value: '', status: 'complete' }, x.riskCap),
        f('experience', 'Investment Experience', { key: '', label: '', value: 'Moderate', status: 'complete' }, x.experience),
        f('objective', 'Investment Objective', { key: '', label: '', value: 'Growth', status: 'complete' }, x.objective),
        f('model', 'Model Portfolio', { key: '', label: '', value: '', status: 'complete' }, x.model),
      ],
    },
    {
      id: 'disclosures',
      label: 'Disclosures',
      phase: '1_intake',
      stageIds: ['disclosures'],
      fields: [
        f('crsAck', 'Form CRS acknowledgment', { key: '', label: '', value: 'Ack’d', status: 'complete' }, x.crsAck),
        f('advAck', 'ADV 2A/2B delivery', { key: '', label: '', value: 'Delivered + ack’d', status: 'complete' }, x.advAck),
        f('regBi', 'Reg BI rationale captured', { key: '', label: '', value: 'Yes', status: 'complete' }, x.regBi),
      ],
    },
    {
      id: 'portfolio',
      label: 'P&S / Portfolio',
      phase: '1_intake',
      stageIds: ['proposal', 'account_open'],
      fields: [
        f('acctTypes', 'Account Types', { key: '', label: '', value: '', status: 'complete' }, x.acctTypes),
        f('allocation', 'Target Allocation', { key: '', label: '', value: '', status: 'complete' }, x.allocation),
        f('feeSchedule', 'Fee Schedule A', { key: '', label: '', value: '1.00% AUM', status: 'complete' }, x.feeSchedule),
      ],
    },
    {
      id: 'beneficiary',
      label: 'Beneficiary & Trusted Contact',
      phase: '1_intake',
      stageIds: ['proposal', 'disclosures'],
      fields: [
        f('beneficiary', 'Primary Beneficiary', { key: '', label: '', value: '', status: 'complete' }, x.beneficiary),
        f('tod', 'TOD / Per Stirpes', { key: '', label: '', value: '', status: 'complete' }, x.tod),
        f('trusted', 'Trusted Contact (FINRA 4512)', { key: '', label: '', value: '', status: 'complete' }, x.trusted),
      ],
    },
    {
      id: 'kyc',
      label: 'KYC / AML / OFAC',
      phase: '2_kyc',
      stageIds: ['kyc'],
      fields: [
        f('idType', 'Government ID type', { key: '', label: '', value: 'US Passport', status: 'complete' }, overrides.idType),
        f('cip', 'CIP verification', { key: '', label: '', value: 'Pass', status: 'complete' }, x.cip),
        f('ofac', 'OFAC / SDN', { key: '', label: '', value: 'Clear', status: 'complete' }, x.ofac),
        f('pep', 'PEP screening', { key: '', label: '', value: 'Clear', status: 'complete' }, x.pep),
        f('adverse', 'Adverse media', { key: '', label: '', value: 'Clear', status: 'complete' }, x.adverse),
        f('sow', 'Source of wealth', { key: '', label: '', value: 'W-2 compensation + RSUs', status: 'complete' }, overrides.sow),
        f('edd', 'Enhanced Due Diligence', { key: '', label: '', value: 'N/A', status: 'n/a' }, x.edd),
      ],
    },
    {
      id: 'tax',
      label: 'Tax & Regulatory',
      phase: '2_kyc',
      stageIds: ['kyc'],
      fields: [
        f('taxForm', 'Tax form type', { key: '', label: '', value: 'W-9', status: 'complete' }, x.taxForm),
        f('fatca', 'FATCA / CRS', { key: '', label: '', value: 'US person — W-9', status: 'complete' }, x.fatca),
        f('usPerson', 'US Person', { key: '', label: '', value: 'Yes', status: 'complete' }, x.usPerson),
      ],
    },
    {
      id: 'principal',
      label: 'Principal Approval',
      phase: '2_kyc',
      stageIds: ['kyc'],
      fields: [
        f('principal', 'Principal / supervisor approval', { key: '', label: '', value: 'Approved', status: 'complete' }, x.principal),
        f('principalDate', 'Principal Approval Date', { key: '', label: '', value: '', status: 'complete' }, x.principalDate),
      ],
    },
    {
      id: 'custody',
      label: 'Custodian & ACAT',
      phase: '3_custody',
      stageIds: ['account_open', 'funding'],
      fields: [
        f('custodian', 'Custodian', { key: '', label: '', value: 'Schwab', status: 'complete' }, x.custodian),
        f('custAcct', 'Custodian Account #', { key: '', label: '', value: '', status: 'complete' }, x.custAcct),
        f('acat', 'ACAT / in-kind transfer', { key: '', label: '', value: '', status: 'complete' }, x.acat),
        f('delivering', 'Delivering firm / account', { key: '', label: '', value: '', status: 'complete' }, x.delivering),
      ],
    },
    {
      id: 'funding',
      label: 'Funding',
      phase: '3_custody',
      stageIds: ['funding'],
      fields: [
        f('fundMethod', 'Funding method', { key: '', label: '', value: 'ACH', status: 'complete' }, overrides.fundingMethod),
        f('fundAmt', 'Initial funding amount (USD)', { key: '', label: '', value: '', status: 'complete' }, overrides.fundingAmount),
        f('wire', 'Wire / bank instructions', { key: '', label: '', value: 'Linked · verified', status: 'complete' }, x.wire),
        f('fundStatus', 'Funding Status', { key: '', label: '', value: '', status: 'complete' }, x.fundStatus),
      ],
    },
    {
      id: 'alts',
      label: 'Legal & Alternative Investments',
      phase: '3_custody',
      stageIds: ['account_open', 'funding'],
      fields: [
        f('accredited', 'Accredited Investor', { key: '', label: '', value: 'N/A', status: 'n/a' }, x.accredited),
        f('qp', 'Qualified Purchaser', { key: '', label: '', value: 'N/A', status: 'n/a' }, x.qp),
        f('alts', 'Approved alternative products', { key: '', label: '', value: 'None', status: 'complete' }, x.alts),
      ],
    },
    {
      id: 'orientation',
      label: 'Orientation & Ongoing Cadence',
      phase: '4_orientation',
      stageIds: ['welcome', 'ongoing'],
      fields: [
        f('orientDate', 'Preferred orientation meeting date', { key: '', label: '', value: '', status: 'complete' }, x.orientDate),
        f('portal', 'Client portal provisioned', { key: '', label: '', value: '', status: 'complete' }, x.portal),
        f('welcome', 'Welcome kit / 30-60-90', { key: '', label: '', value: '', status: 'complete' }, x.welcome),
        f('billing', 'Billing engine initialized', { key: '', label: '', value: '', status: 'complete' }, x.billing),
      ],
    },
  ]
}

export const onboardingByHousehold: Record<string, ClientOnboardingRecord> = {
  h0: {
    householdId: 'h0',
    personAccountId: '001PROS000ELENA',
    currentStageLabel: 'Prospect',
    primaryGoal: 'Unknown',
    timeHorizonYears: null,
    fundingMethod: 'Unknown',
    fundingAmountUsd: null,
    governmentIdType: 'Not collected',
    sourceOfWealth: 'Not collected',
    sections: baseSections({
      goal: { value: '', status: 'missing' },
      horizon: { value: '', status: 'missing' },
      idType: { value: '', status: 'missing' },
      sow: { value: '', status: 'missing' },
      fundingMethod: { value: '', status: 'missing' },
      fundingAmount: { value: '', status: 'missing' },
      extra: {
        firstName: { value: 'Elena', status: 'complete' },
        lastName: { value: 'Vasquez', status: 'complete' },
        dob: { value: '', status: 'missing' },
        ssn: { value: '', status: 'missing' },
        email: { value: 'elena.vasquez@example.com', status: 'complete' },
        phone: { value: '', status: 'missing' },
        address: { value: '', status: 'missing' },
        source: { value: 'Website form', status: 'complete' },
        household: { value: 'Person Account shell only', status: 'partial' },
        advisor: { value: '', status: 'missing' },
        netWorth: { value: '', status: 'missing' },
        income: { value: '', status: 'missing' },
        liquidity: { value: '', status: 'missing' },
        investable: { value: '', status: 'missing' },
        employer: { value: '', status: 'missing' },
        title: { value: '', status: 'missing' },
        citizenship: { value: '', status: 'missing' },
        riskTol: { value: '', status: 'missing' },
        riskCap: { value: '', status: 'missing' },
        experience: { value: '', status: 'missing' },
        objective: { value: '', status: 'missing' },
        model: { value: '', status: 'missing' },
        crsAck: { value: '', status: 'missing' },
        advAck: { value: '', status: 'missing' },
        regBi: { value: '', status: 'missing' },
        acctTypes: { value: '', status: 'missing' },
        allocation: { value: '', status: 'missing' },
        feeSchedule: { value: '', status: 'missing' },
        beneficiary: { value: '', status: 'missing' },
        tod: { value: '', status: 'missing' },
        trusted: { value: '', status: 'missing' },
        cip: { value: '', status: 'missing' },
        ofac: { value: '', status: 'missing' },
        pep: { value: '', status: 'missing' },
        adverse: { value: '', status: 'missing' },
        edd: { value: '', status: 'missing' },
        taxForm: { value: '', status: 'missing' },
        fatca: { value: '', status: 'missing' },
        usPerson: { value: '', status: 'missing' },
        principal: { value: '', status: 'missing' },
        principalDate: { value: '', status: 'missing' },
        custodian: { value: '', status: 'missing' },
        custAcct: { value: '', status: 'missing' },
        acat: { value: '', status: 'missing' },
        delivering: { value: '', status: 'missing' },
        wire: { value: '', status: 'missing' },
        fundStatus: { value: '', status: 'missing' },
        accredited: { value: '', status: 'missing' },
        qp: { value: '', status: 'missing' },
        alts: { value: '', status: 'missing' },
        orientDate: { value: '', status: 'missing' },
        portal: { value: '', status: 'missing' },
        welcome: { value: '', status: 'missing' },
        billing: { value: '', status: 'missing' },
      },
    }),
    documents: docs({}),
    monitor: {
      status: 'not_armed',
      decision: 'Still a prospect. Lifecycle Monitor stays off until funding.',
      annualKycRefreshScheduled: false,
      lifeEventListenerArmed: false,
      remindersScheduled: 0,
      portalProvisioned: false,
      welcomeKitSent: false,
      billingInitialized: false,
      cadence30_60_90: false,
    },
  },
  h1: {
    householdId: 'h1',
    personAccountId: '001CHEN000MAYA',
    currentStageLabel: 'Funding — ACAT NIGO',
    primaryGoal: 'Long-term growth',
    timeHorizonYears: 25,
    fundingMethod: 'ACAT + ACH',
    fundingAmountUsd: 248000,
    governmentIdType: 'US Driver License',
    sourceOfWealth: 'W-2 compensation + RSUs',
    sections: baseSections({
      goal: { value: 'Long-term growth', status: 'complete' },
      horizon: { value: '25', status: 'complete' },
      idType: { value: 'US Driver License', status: 'complete' },
      sow: { value: 'W-2 + RSUs', status: 'complete' },
      fundingMethod: { value: 'ACAT + ACH', status: 'complete' },
      fundingAmount: { value: '248,000', status: 'complete' },
      extra: {
        firstName: { value: 'Maya', status: 'complete' },
        lastName: { value: 'Chen', status: 'complete' },
        dob: { value: '1992-03-14', status: 'complete' },
        email: { value: 'maya.chen@example.com', status: 'complete' },
        phone: { value: '+1 415-555-0142', status: 'complete' },
        address: { value: '88 Folsom St, San Francisco, CA', status: 'complete' },
        household: { value: 'Chen Household', status: 'complete' },
        source: { value: 'Schwab referral', status: 'complete' },
        netWorth: { value: '$420K', status: 'complete' },
        income: { value: '$185K', status: 'complete' },
        investable: { value: '$248K', status: 'complete' },
        employer: { value: 'Northwind Soft', status: 'complete' },
        title: { value: 'Staff Engineer', status: 'complete' },
        riskTol: { value: '71 / Growth', status: 'complete' },
        riskCap: { value: 'High', status: 'complete' },
        model: { value: 'Growth 80/20', status: 'complete' },
        acctTypes: { value: 'Roth IRA + Individual', status: 'complete' },
        allocation: { value: '80/20', status: 'complete' },
        beneficiary: { value: 'Sibling — TOD', status: 'partial' },
        tod: { value: 'Missing wet signature on TOD', status: 'blocked' },
        trusted: { value: 'Jordan Chen', status: 'complete' },
        custodian: { value: 'Schwab DAIM', status: 'complete' },
        custAcct: { value: '…8821 / …8822', status: 'complete' },
        acat: { value: 'Rejected — TOD NIGO', status: 'blocked' },
        delivering: { value: 'Fidelity · …3391', status: 'complete' },
        wire: { value: 'ACH linked · ACAT not settled', status: 'partial' },
        fundStatus: { value: 'Blocked on ACAT', status: 'blocked' },
        principal: { value: 'Approved', status: 'complete' },
        principalDate: { value: '2026-09-18', status: 'complete' },
        orientDate: { value: 'Pending funding', status: 'missing' },
        portal: { value: 'Not started', status: 'missing' },
        welcome: { value: 'Not started', status: 'missing' },
        billing: { value: 'Not started', status: 'missing' },
      },
    }),
    documents: docs({
      iaa: { status: 'filed', filedOn: '2026-09-18' },
      crs: { status: 'filed', filedOn: '2026-09-18' },
      adv2a: { status: 'filed', filedOn: '2026-09-18' },
      adv2b: { status: 'filed', filedOn: '2026-09-18' },
      ips: { status: 'filed', filedOn: '2026-09-19' },
      fee: { status: 'filed', filedOn: '2026-09-18' },
      custodial: { status: 'nigo', notes: 'TOD designation signature gap' },
      tax: { status: 'filed', filedOn: '2026-09-18' },
      esign: { status: 'filed', filedOn: '2026-09-18', notes: 'Envelope complete except TOD addendum' },
    }),
    monitor: {
      status: 'not_armed',
      decision: 'Blocked — funding incomplete',
      annualKycRefreshScheduled: false,
      lifeEventListenerArmed: false,
      remindersScheduled: 0,
      portalProvisioned: false,
      welcomeKitSent: false,
      billingInitialized: false,
      cadence30_60_90: false,
    },
  },
  h2: {
    householdId: 'h2',
    personAccountId: '001WHIT000ROB',
    currentStageLabel: 'KYC — EDD / Principal gate',
    primaryGoal: 'Preserve and transfer wealth',
    timeHorizonYears: 12,
    fundingMethod: 'ACAT',
    fundingAmountUsd: 5200000,
    governmentIdType: 'US Passport',
    sourceOfWealth: 'Business sale + inherited trusts',
    sections: baseSections({
      goal: { value: 'Preserve and transfer wealth', status: 'complete' },
      horizon: { value: '12', status: 'complete' },
      idType: { value: 'US Passport', status: 'complete' },
      sow: { value: 'Business sale + trusts — CPA letter parsed', status: 'complete' },
      fundingMethod: { value: 'ACAT $3.1M from Fidelity', status: 'partial' },
      fundingAmount: { value: '5,200,000', status: 'complete' },
      extra: {
        firstName: { value: 'Robert & Eleanor', status: 'complete' },
        lastName: { value: 'Whitfield', status: 'complete' },
        dob: { value: '1958-07-02 / 1961-11-19', status: 'complete' },
        email: { value: 'r.whitfield@example.com', status: 'complete' },
        phone: { value: '+1 212-555-0199', status: 'complete' },
        address: { value: '12 Gramercy Park, New York, NY', status: 'complete' },
        household: { value: 'Whitfield Household + Trust', status: 'complete' },
        source: { value: 'Personal network', status: 'complete' },
        netWorth: { value: '$12.4M', status: 'complete' },
        income: { value: '$410K', status: 'complete' },
        investable: { value: '$5.2M', status: 'complete' },
        employer: { value: 'Retired / Family office', status: 'complete' },
        title: { value: 'Private investor', status: 'complete' },
        riskTol: { value: '44 / Conservative-Balanced', status: 'complete' },
        riskCap: { value: 'Moderate', status: 'complete' },
        model: { value: 'Conservative-Balanced 40/40/20', status: 'complete' },
        acctTypes: { value: 'Joint + Trust', status: 'complete' },
        allocation: { value: '40/40/20', status: 'complete' },
        feeSchedule: { value: 'Pending principal lock', status: 'partial' },
        beneficiary: { value: 'Whitfield Family Trust', status: 'complete' },
        tod: { value: 'Trust primary', status: 'complete' },
        trusted: { value: 'Granddaughter — Ava Whitfield', status: 'complete' },
        cip: { value: 'Pass', status: 'complete' },
        ofac: { value: 'Clear', status: 'complete' },
        pep: { value: 'Clear', status: 'complete' },
        adverse: { value: 'Clear', status: 'complete' },
        edd: { value: 'Required — packet ready, principal pending', status: 'blocked' },
        fatca: { value: 'US beneficiary cascade — confirm on Thursday', status: 'partial' },
        principal: { value: 'Pending supervisor review', status: 'blocked' },
        principalDate: { value: '', status: 'missing' },
        custodian: { value: 'Altruist selected — account not opened', status: 'partial' },
        custAcct: { value: '', status: 'missing' },
        acat: { value: '', status: 'missing' },
        delivering: { value: 'Fidelity · …4410', status: 'complete' },
        wire: { value: '', status: 'missing' },
        fundStatus: { value: '', status: 'missing' },
        accredited: { value: 'Yes — CPA letter on file', status: 'complete' },
        qp: { value: 'Yes', status: 'complete' },
        alts: { value: 'PE sleeve noted — not approved', status: 'partial' },
        orientDate: { value: '', status: 'missing' },
        portal: { value: 'Not started', status: 'missing' },
        welcome: { value: 'Not started', status: 'missing' },
        billing: { value: 'Not started', status: 'missing' },
      },
    }),
    documents: docs({
      iaa: { status: 'filed', filedOn: '2026-09-20' },
      crs: { status: 'filed', filedOn: '2026-09-20' },
      adv2a: { status: 'filed', filedOn: '2026-09-20' },
      adv2b: { status: 'filed', filedOn: '2026-09-20' },
      ips: { status: 'pending', notes: 'Awaiting principal before fee lock' },
      fee: { status: 'pending' },
      custodial: { status: 'not_started' },
      tax: { status: 'filed', filedOn: '2026-09-20' },
      esign: { status: 'pending', notes: 'IAA complete; custodial packet not sent' },
    }),
    monitor: {
      status: 'not_armed',
      decision: 'Blocked — EDD / principal gate',
      annualKycRefreshScheduled: false,
      lifeEventListenerArmed: false,
      remindersScheduled: 0,
      orientation: {
        datetime: '2026-09-25T15:00:00',
        playbookId: 'a0Cfn00001fTRUST01',
        filedOnPersonAccount: true,
      },
      portalProvisioned: false,
      welcomeKitSent: false,
      billingInitialized: false,
      cadence30_60_90: false,
    },
  },
  h3: {
    householdId: 'h3',
    personAccountId: '001ADAM000HH',
    currentStageLabel: 'Activated — Annual Review Prep',
    primaryGoal: 'Tax-efficient retirement income',
    timeHorizonYears: 20,
    fundingMethod: 'Fully funded',
    fundingAmountUsd: 3800000,
    governmentIdType: 'US Passport',
    sourceOfWealth: 'Executive compensation + real estate',
    sections: baseSections({
      goal: { value: 'Tax-efficient retirement income', status: 'complete' },
      horizon: { value: '20', status: 'complete' },
      fundingMethod: { value: 'Fully funded', status: 'complete' },
      fundingAmount: { value: '3,800,000', status: 'complete' },
      extra: {
        firstName: { value: 'Adams Household', status: 'complete' },
        lastName: { value: 'Adams', status: 'complete' },
        dob: { value: '1968-01-09', status: 'complete' },
        email: { value: 'adams.family@example.com', status: 'complete' },
        phone: { value: '+1 650-555-0177', status: 'complete' },
        address: { value: '400 University Ave, Palo Alto, CA', status: 'complete' },
        household: { value: 'Adams Household', status: 'complete' },
        netWorth: { value: '$6.1M', status: 'complete' },
        income: { value: '$290K', status: 'complete' },
        investable: { value: '$3.8M', status: 'complete' },
        employer: { value: 'Semi-retired', status: 'complete' },
        title: { value: 'Former VP Sales', status: 'complete' },
        riskTol: { value: '55 / Balanced', status: 'complete' },
        riskCap: { value: 'Moderate-High', status: 'complete' },
        model: { value: 'Balanced 60/40', status: 'complete' },
        acctTypes: { value: 'Joint + IRA + Trust', status: 'complete' },
        allocation: { value: '60/40 — drift flagged for Friday review', status: 'partial' },
        beneficiary: { value: 'Spouse + trust', status: 'complete' },
        tod: { value: 'On file', status: 'complete' },
        trusted: { value: 'Daughter — Priya Adams', status: 'complete' },
        custodian: { value: 'Schwab', status: 'complete' },
        custAcct: { value: '…2201–2204', status: 'complete' },
        acat: { value: 'Settled (prior year)', status: 'complete' },
        fundStatus: { value: 'Funded', status: 'complete' },
        orientDate: { value: '2025-11-12 (completed)', status: 'complete' },
        portal: { value: 'Provisioned', status: 'complete' },
        welcome: { value: '30/60/90 complete', status: 'complete' },
        billing: { value: 'Quarterly AUM — active', status: 'complete' },
        principalDate: { value: '2025-10-28', status: 'complete' },
      },
    }),
    documents: docs({
      iaa: { status: 'filed', filedOn: '2025-10-28' },
      crs: { status: 'filed', filedOn: '2025-10-28' },
      adv2a: { status: 'filed', filedOn: '2025-10-28' },
      adv2b: { status: 'filed', filedOn: '2025-10-28' },
      ips: { status: 'filed', filedOn: '2025-10-29' },
      fee: { status: 'filed', filedOn: '2025-10-28' },
      custodial: { status: 'filed', filedOn: '2025-10-30' },
      tax: { status: 'filed', filedOn: '2025-10-28' },
      esign: { status: 'filed', filedOn: '2025-10-30' },
    }),
    monitor: {
      status: 'monitoring',
      decision: 'Client activated for ongoing CLM',
      annualKycRefreshScheduled: true,
      annualKycRefreshDate: '2026-10-30',
      lifeEventListenerArmed: true,
      remindersScheduled: 2,
      orientation: {
        datetime: '2025-11-12T10:00:00',
        playbookId: 'a0Cfn00001fADAMS01',
        filedOnPersonAccount: true,
      },
      portalProvisioned: true,
      welcomeKitSent: true,
      billingInitialized: true,
      cadence30_60_90: true,
    },
  },
  h4: {
    householdId: 'h4',
    personAccountId: '001OKON000EST',
    currentStageLabel: 'Estate Settlement',
    primaryGoal: 'Successor engagement / retitle',
    timeHorizonYears: null,
    fundingMethod: 'In transition',
    fundingAmountUsd: 1100000,
    governmentIdType: 'Letters testamentary on file',
    sourceOfWealth: 'Decedent estate',
    sections: baseSections({
      goal: { value: 'Estate settlement & surviving spouse onboard', status: 'complete' },
      horizon: { value: 'N/A — estate', status: 'n/a' },
      idType: { value: 'Death certificate + letters testamentary', status: 'complete' },
      sow: { value: 'Estate assets', status: 'complete' },
      fundingMethod: { value: 'Retitle in progress', status: 'partial' },
      fundingAmount: { value: '1,100,000', status: 'complete' },
      extra: {
        firstName: { value: 'Estate of James', status: 'complete' },
        lastName: { value: 'Okonkwo', status: 'complete' },
        dob: { value: 'Deceased 2026-08-02', status: 'complete' },
        email: { value: 'estate.counsel@example.com', status: 'complete' },
        phone: { value: '+1 312-555-0104', status: 'complete' },
        address: { value: 'Chicago, IL', status: 'complete' },
        household: { value: 'Estate of James Okonkwo', status: 'complete' },
        netWorth: { value: '$1.1M in transition', status: 'complete' },
        income: { value: 'N/A', status: 'n/a' },
        investable: { value: '$1.1M', status: 'complete' },
        employer: { value: 'N/A', status: 'n/a' },
        title: { value: 'N/A', status: 'n/a' },
        riskTol: { value: 'Successor not scored', status: 'partial' },
        riskCap: { value: 'Successor not scored', status: 'partial' },
        model: { value: 'Hold pending retitle', status: 'partial' },
        acctTypes: { value: 'Individual → estate / spouse', status: 'partial' },
        ssn: { value: 'Decedent TIN on file · estate EIN pending', status: 'partial' },
        beneficiary: { value: 'Surviving spouse not yet onboarded', status: 'partial' },
        trusted: { value: 'Estate attorney — M. Okonkwo', status: 'complete' },
        cip: { value: 'Decedent on file · spouse packet still a draft', status: 'partial' },
        taxForm: { value: 'Successor W-9 / estate EIN pending', status: 'partial' },
        principal: { value: '2021 approval · successor not approved', status: 'partial' },
        principalDate: { value: '2021-04-12', status: 'complete' },
        custodian: { value: 'Schwab', status: 'complete' },
        custAcct: { value: '…9011 freeze / retitle', status: 'blocked' },
        acat: { value: 'N/A — existing account, not a new transfer', status: 'n/a' },
        delivering: { value: '', status: 'n/a' },
        wire: { value: 'Frozen pending retitle', status: 'blocked' },
        fundStatus: { value: 'Restricted pending probate steps', status: 'blocked' },
        portal: { value: 'Surviving spouse invite pending', status: 'missing' },
        welcome: { value: 'Successor welcome draft ready', status: 'partial' },
        billing: { value: 'Paused', status: 'partial' },
        orientDate: { value: 'Tue — surviving spouse intro', status: 'partial' },
      },
    }),
    documents: docs({
      iaa: { status: 'filed', filedOn: '2021-04-12', notes: 'Original decedent IAA' },
      crs: { status: 'filed', filedOn: '2021-04-12' },
      adv2a: { status: 'filed', filedOn: '2021-04-12' },
      adv2b: { status: 'filed', filedOn: '2021-04-12' },
      ips: { status: 'pending', notes: 'Successor IPS after spouse meeting' },
      fee: { status: 'filed', filedOn: '2021-04-12' },
      custodial: { status: 'nigo', notes: 'Retitle package in process' },
      tax: { status: 'pending', notes: 'Estate tax ID / successor W-9' },
      esign: { status: 'pending' },
    }),
    monitor: {
      status: 'monitoring',
      decision: 'Estate path — successor CLM opened',
      annualKycRefreshScheduled: false,
      lifeEventListenerArmed: true,
      remindersScheduled: 3,
      orientation: {
        datetime: '2026-09-30T14:00:00',
        playbookId: 'a0Cfn00001fESTATE01',
        filedOnPersonAccount: true,
      },
      portalProvisioned: false,
      welcomeKitSent: false,
      billingInitialized: false,
      cadence30_60_90: false,
    },
  },
}

export const PHASE_LABELS: Record<FormSection['phase'], string> = {
  '1_intake': 'Phase 1 — Intake & Legal Execution',
  '2_kyc': 'Phase 2 — KYC, AML & Compliance',
  '3_custody': 'Phase 3 — Custodial & Asset Funding',
  '4_orientation': 'Phase 4 — Orientation & Ongoing Cadence',
  ongoing: 'Ongoing CLM',
}
