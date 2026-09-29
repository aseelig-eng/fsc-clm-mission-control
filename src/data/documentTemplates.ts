// Faithful mockup templates for each compliance document type in the vault.
// Each template mirrors the real-world structure of the document (title block,
// numbered sections, and the field labels a genuine version carries). Values
// are resolved live from the client's onboarding record so a completed doc
// renders filled-in, while an in-progress doc shows whatever exists plus blank
// placeholders — a true preview the advisor can eyeball.

import type { ClientOnboardingRecord, ComplianceDocument, FormField } from './onboardingFramework'
import { custodianDisplayName } from './custodianForms'

/** Document categories whose issuer is the household's actual custodian, not a fixed firm. */
const CUSTODIAN_ISSUED_CATEGORIES: ComplianceDocument['category'][] = ['custodial', 'transfer', 'movement']

export type DocRowKind = 'text' | 'currency' | 'checkbox' | 'signature' | 'multiline'

export interface DocRow {
  label: string
  /** Field key to pull the live value from the record, if any */
  fieldKey?: string
  /** Static value when not sourced from a record field */
  value?: string
  kind?: DocRowKind
}

export interface DocSection {
  heading: string
  /** Optional intro/legal paragraph rendered above the rows */
  note?: string
  rows: DocRow[]
}

export interface DocTemplate {
  /** Matches ComplianceDocument.id */
  id: string
  title: string
  /** Small line under the title — form number / issuing body */
  formNo?: string
  issuer?: string
  intro?: string
  sections: DocSection[]
  /** Boilerplate legal lines shown at the foot */
  legal?: string[]
  /** Whether the doc ends with signature blocks */
  signatures?: string[]
}

/** Flatten record fields into a key → FormField lookup. */
export function recordFieldMap(record?: ClientOnboardingRecord): Record<string, FormField> {
  const map: Record<string, FormField> = {}
  if (!record) return map
  for (const s of record.sections) for (const f of s.fields) map[f.key] = f
  return map
}

export function clientFullName(fields: Record<string, FormField>, fallback: string) {
  const first = fields.firstName?.value?.trim()
  const last = fields.lastName?.value?.trim()
  const joined = [first, last].filter(Boolean).join(' ')
  return joined || fallback
}

const TEMPLATES: DocTemplate[] = [
  {
    id: 'iaa',
    title: 'Investment Advisory Agreement',
    formNo: 'IAA · Discretionary Managed Account',
    issuer: 'BENiFICIAL Wealth Advisors, LLC — Registered Investment Adviser',
    intro:
      'This Investment Advisory Agreement (the "Agreement") is entered into between the Client identified below and BENiFICIAL Wealth Advisors, LLC ("Adviser").',
    sections: [
      {
        heading: '1. Parties',
        rows: [
          { label: 'Client name', fieldKey: 'firstName' },
          { label: 'Household / account title', fieldKey: 'household' },
          { label: 'Legal address', fieldKey: 'address' },
          { label: 'Servicing adviser', fieldKey: 'advisor' },
          { label: 'Effective date', fieldKey: 'principalDate' },
        ],
      },
      {
        heading: '2. Scope of Services & Discretion',
        note: 'Adviser will provide continuous discretionary investment management consistent with the Client’s Investment Policy Statement.',
        rows: [
          { label: 'Service model', value: 'Discretionary managed account', kind: 'text' },
          { label: 'Primary objective', fieldKey: 'objective' },
          { label: 'Model portfolio', fieldKey: 'model' },
          { label: 'Target allocation', fieldKey: 'allocation' },
        ],
      },
      {
        heading: '3. Advisory Fees',
        rows: [
          { label: 'Fee schedule', fieldKey: 'feeSchedule' },
          { label: 'Billing frequency', value: 'Quarterly, in advance', kind: 'text' },
          { label: 'Custodian', fieldKey: 'custodian' },
        ],
      },
      {
        heading: '4. Custody & Brokerage',
        rows: [
          { label: 'Qualified custodian', fieldKey: 'custodian' },
          { label: 'Account number', fieldKey: 'custAcct' },
          { label: 'Account registration', fieldKey: 'registration' },
        ],
      },
    ],
    legal: [
      'Adviser owes a fiduciary duty to the Client under the Investment Advisers Act of 1940.',
      'Either party may terminate this Agreement upon written notice; fees are prorated to the termination date.',
      'Client acknowledges receipt of Form ADV Part 2A, 2B, and Form CRS.',
    ],
    signatures: ['Client signature', 'Adviser / Authorized representative'],
  },
  {
    id: 'crs',
    title: 'Client Relationship Summary (Form CRS)',
    formNo: 'Form ADV Part 3',
    issuer: 'BENiFICIAL Wealth Advisors, LLC · SEC-registered investment adviser',
    intro:
      'This summary describes the services and fees we offer as an investment adviser. Free tools are available at Investor.gov/CRS.',
    sections: [
      {
        heading: 'Introduction',
        rows: [
          { label: 'Firm', value: 'BENiFICIAL Wealth Advisors, LLC', kind: 'text' },
          { label: 'Relationship type', value: 'Investment adviser', kind: 'text' },
          { label: 'Delivered to', fieldKey: 'firstName' },
          { label: 'Delivery / acknowledgment', fieldKey: 'crsAck' },
        ],
      },
      {
        heading: 'What investment services and advice can you provide me?',
        note: 'We offer ongoing discretionary portfolio management and financial planning to retail investors.',
        rows: [
          { label: 'Monitoring', value: 'Continuous, at least quarterly', kind: 'text' },
          { label: 'Investment authority', value: 'Discretionary', kind: 'text' },
          { label: 'Account minimum', value: '$250,000 (may be waived)', kind: 'text' },
        ],
      },
      {
        heading: 'What fees will I pay?',
        rows: [
          { label: 'Fee basis', fieldKey: 'feeSchedule' },
          { label: 'Other costs', value: 'Custodial, fund, and transaction fees may apply', kind: 'text' },
        ],
      },
      {
        heading: 'Conversation starters',
        rows: [
          { label: 'Q', value: 'Given my situation, should I choose an investment advisory service?', kind: 'text' },
          { label: 'Q', value: 'How will you choose investments to recommend to me?', kind: 'text' },
          { label: 'Q', value: 'How might your conflicts of interest affect me?', kind: 'text' },
        ],
      },
    ],
    legal: [
      'For additional information about our services, see our Form ADV brochure (Part 2A) and any brochure supplement (Part 2B).',
    ],
  },
  {
    id: 'adv2a',
    title: 'Form ADV Part 2A — Firm Brochure',
    formNo: 'Uniform Application for Investment Adviser Registration',
    issuer: 'BENiFICIAL Wealth Advisors, LLC',
    intro:
      'This brochure provides information about the qualifications and business practices of BENiFICIAL Wealth Advisors, LLC.',
    sections: [
      {
        heading: 'Item 4 — Advisory Business',
        rows: [
          { label: 'Firm', value: 'BENiFICIAL Wealth Advisors, LLC', kind: 'text' },
          { label: 'Services', value: 'Discretionary portfolio management, financial planning', kind: 'text' },
          { label: 'Regulatory AUM', value: '$1.4B', kind: 'text' },
        ],
      },
      {
        heading: 'Item 5 — Fees and Compensation',
        rows: [
          { label: 'Fee structure', fieldKey: 'feeSchedule' },
          { label: 'Billing', value: 'Quarterly in advance, based on average daily balance', kind: 'text' },
        ],
      },
      {
        heading: 'Item 8 — Methods of Analysis & Risk',
        rows: [
          { label: 'Approach', value: 'Strategic asset allocation, model portfolios', kind: 'text' },
          { label: 'Primary risks', value: 'Market, interest-rate, concentration', kind: 'text' },
        ],
      },
      {
        heading: 'Item 10 — Other Financial Activities',
        rows: [{ label: 'Affiliations', value: 'None material', kind: 'text' }],
      },
      {
        heading: 'Delivery',
        rows: [{ label: 'Delivered / acknowledged', fieldKey: 'advAck' }],
      },
    ],
    legal: [
      'Additional information about the Adviser is available on the SEC’s website at www.adviserinfo.sec.gov.',
    ],
  },
  {
    id: 'adv2b',
    title: 'Form ADV Part 2B — Brochure Supplement',
    formNo: 'Supervised Person Supplement',
    issuer: 'BENiFICIAL Wealth Advisors, LLC',
    sections: [
      {
        heading: 'Item 2 — Educational Background & Business Experience',
        rows: [
          { label: 'Supervised person', fieldKey: 'advisor' },
          { label: 'Designations', value: 'CFP®, CFA', kind: 'text' },
          { label: 'Experience', value: '14 years wealth management', kind: 'text' },
        ],
      },
      {
        heading: 'Item 3 — Disciplinary Information',
        rows: [{ label: 'Reportable events', value: 'None', kind: 'text' }],
      },
      {
        heading: 'Item 4 — Other Business Activities',
        rows: [{ label: 'Outside activities', value: 'None material', kind: 'text' }],
      },
      {
        heading: 'Item 6 — Supervision',
        rows: [
          { label: 'Supervisor', value: 'Chief Compliance Officer', kind: 'text' },
          { label: 'Delivered / acknowledged', fieldKey: 'advAck' },
        ],
      },
    ],
  },
  {
    id: 'ips',
    title: 'Investment Policy Statement',
    formNo: 'IPS · Prepared for the Client below',
    issuer: 'BENiFICIAL Wealth Advisors, LLC',
    intro:
      'This Investment Policy Statement establishes the objectives, constraints, and guidelines for the management of the Client’s portfolio.',
    sections: [
      {
        heading: '1. Client & Account',
        rows: [
          { label: 'Client', fieldKey: 'firstName' },
          { label: 'Household', fieldKey: 'household' },
          { label: 'Custodian / account', fieldKey: 'custodian' },
        ],
      },
      {
        heading: '2. Objectives',
        rows: [
          { label: 'Primary goal', fieldKey: 'goal' },
          { label: 'Time horizon (years)', fieldKey: 'horizon' },
          { label: 'Investment objective', fieldKey: 'objective' },
          { label: 'Liquidity needs', fieldKey: 'liquidity' },
        ],
      },
      {
        heading: '3. Risk Profile',
        rows: [
          { label: 'Risk tolerance', fieldKey: 'riskTol' },
          { label: 'Risk capacity', fieldKey: 'riskCap' },
          { label: 'Investment experience', fieldKey: 'experience' },
        ],
      },
      {
        heading: '4. Target Allocation & Implementation',
        rows: [
          { label: 'Model portfolio', fieldKey: 'model' },
          { label: 'Target allocation', fieldKey: 'allocation' },
          { label: 'Investable assets', fieldKey: 'investable', kind: 'currency' },
        ],
      },
      {
        heading: '5. Monitoring & Rebalancing',
        rows: [
          { label: 'Review cadence', value: 'Quarterly review, annual deep-dive', kind: 'text' },
          { label: 'Rebalance policy', value: '±5% band tolerance', kind: 'text' },
        ],
      },
    ],
    signatures: ['Client', 'Adviser'],
  },
  {
    id: 'fee',
    title: 'Fee Schedule A',
    formNo: 'Advisory Fee Schedule · Exhibit A to the IAA',
    issuer: 'BENiFICIAL Wealth Advisors, LLC',
    sections: [
      {
        heading: 'Tiered Annual Advisory Fee (% of AUM)',
        rows: [
          { label: 'First $1,000,000', value: '1.00%', kind: 'text' },
          { label: 'Next $1,000,000 – $3,000,000', value: '0.85%', kind: 'text' },
          { label: 'Next $3,000,000 – $5,000,000', value: '0.70%', kind: 'text' },
          { label: 'Above $5,000,000', value: '0.55%', kind: 'text' },
        ],
      },
      {
        heading: 'This Account',
        rows: [
          { label: 'Client', fieldKey: 'firstName' },
          { label: 'Applied fee schedule', fieldKey: 'feeSchedule' },
          { label: 'Investable assets', fieldKey: 'investable', kind: 'currency' },
          { label: 'Billing frequency', value: 'Quarterly, in advance', kind: 'text' },
          { label: 'Principal approval date', fieldKey: 'principalDate' },
        ],
      },
    ],
    legal: ['Fees are negotiable and may be waived or discounted at the Adviser’s discretion.'],
    signatures: ['Client acknowledgment'],
  },
  {
    id: 'custodial',
    title: 'New Account Application',
    formNo: 'Custodial Brokerage Account Application',
    issuer: 'Charles Schwab & Co., Inc. — Custodian',
    sections: [
      {
        heading: 'Account Holder',
        rows: [
          { label: 'Legal name', fieldKey: 'firstName' },
          { label: 'Date of birth', fieldKey: 'dob' },
          { label: 'SSN / Tax ID', fieldKey: 'ssn' },
          { label: 'Legal address', fieldKey: 'address' },
          { label: 'Email', fieldKey: 'email' },
          { label: 'Phone', fieldKey: 'phone' },
          { label: 'Citizenship', fieldKey: 'citizenship' },
        ],
      },
      {
        heading: 'Employment',
        rows: [
          { label: 'Employer', fieldKey: 'employer' },
          { label: 'Occupation / title', fieldKey: 'title' },
          { label: 'Annual income', fieldKey: 'income', kind: 'currency' },
          { label: 'Net worth', fieldKey: 'netWorth', kind: 'currency' },
        ],
      },
      {
        heading: 'Account Details',
        rows: [
          { label: 'Account type(s)', fieldKey: 'acctTypes' },
          { label: 'Registration', fieldKey: 'registration' },
          { label: 'Custodian account #', fieldKey: 'custAcct' },
          { label: 'Investment objective', fieldKey: 'objective' },
          { label: 'Risk tolerance', fieldKey: 'riskTol' },
        ],
      },
      {
        heading: 'Trusted Contact (FINRA Rule 4512)',
        rows: [{ label: 'Trusted contact', fieldKey: 'trusted' }],
      },
    ],
    signatures: ['Account holder', 'Registered representative'],
  },
  {
    id: 'tod',
    title: 'TOD / Beneficiary Designation',
    formNo: 'Transfer-on-Death Registration',
    issuer: 'Charles Schwab & Co., Inc.',
    sections: [
      {
        heading: 'Account Owner',
        rows: [
          { label: 'Owner', fieldKey: 'firstName' },
          { label: 'Account #', fieldKey: 'custAcct' },
          { label: 'Registration', fieldKey: 'registration' },
        ],
      },
      {
        heading: 'Primary Beneficiary(ies)',
        rows: [
          { label: 'Primary beneficiary', fieldKey: 'beneficiary' },
          { label: 'Share %', fieldKey: 'benShare' },
          { label: 'Per stirpes / per capita', fieldKey: 'tod' },
        ],
      },
      {
        heading: 'Contingent Beneficiary(ies)',
        rows: [{ label: 'Contingent beneficiary', fieldKey: 'contingent' }],
      },
    ],
    legal: ['This designation revokes all prior beneficiary designations for the account identified above.'],
    signatures: ['Account owner', 'Notary / witness (if required)'],
  },
  {
    id: 'acatForm',
    title: 'ACAT Transfer Form',
    formNo: 'Automated Customer Account Transfer Service',
    issuer: 'Receiving firm: Charles Schwab & Co., Inc.',
    sections: [
      {
        heading: 'Receiving Account',
        rows: [
          { label: 'Account holder', fieldKey: 'firstName' },
          { label: 'Receiving account #', fieldKey: 'custAcct' },
          { label: 'Registration', fieldKey: 'registration' },
        ],
      },
      {
        heading: 'Delivering Firm',
        rows: [
          { label: 'Delivering firm / account', fieldKey: 'delivering' },
          { label: 'Transfer type', fieldKey: 'acat' },
          { label: 'Registration match', fieldKey: 'acatMatch' },
        ],
      },
      {
        heading: 'Transfer Instructions',
        rows: [
          { label: 'Full or partial', value: 'Full account transfer', kind: 'text' },
          { label: 'In-kind / liquidate', value: 'In-kind', kind: 'text' },
        ],
      },
    ],
    signatures: ['Client authorization'],
  },
  {
    id: 'ach',
    title: 'ACH Money-Movement Authorization',
    formNo: 'Electronic Funds Transfer Authorization',
    issuer: 'Charles Schwab & Co., Inc.',
    sections: [
      {
        heading: 'Account Holder',
        rows: [
          { label: 'Name', fieldKey: 'firstName' },
          { label: 'Brokerage account #', fieldKey: 'custAcct' },
        ],
      },
      {
        heading: 'Linked Bank Account',
        rows: [
          { label: 'Bank name', fieldKey: 'bankName' },
          { label: 'ABA routing number', fieldKey: 'routing' },
          { label: 'Bank account title', fieldKey: 'bankTitle' },
          { label: 'Instructions status', fieldKey: 'wire' },
        ],
      },
      {
        heading: 'Transfer Terms',
        rows: [
          { label: 'Funding method', fieldKey: 'fundMethod' },
          { label: 'Initial amount', fieldKey: 'fundAmt', kind: 'currency' },
          { label: 'Frequency', value: 'One-time + on demand', kind: 'text' },
        ],
      },
    ],
    legal: ['Authorization remains in effect until the firm receives written notice of revocation.'],
    signatures: ['Account holder'],
  },
  {
    id: 'tax',
    title: 'Form W-9',
    formNo: 'Request for Taxpayer Identification Number and Certification',
    issuer: 'Department of the Treasury — Internal Revenue Service',
    sections: [
      {
        heading: 'Identification',
        rows: [
          { label: '1  Name', fieldKey: 'firstName' },
          { label: '2  Business name (if any)', value: '—', kind: 'text' },
          { label: '3  Federal tax classification', value: 'Individual / sole proprietor', kind: 'text' },
          { label: '5  Address', fieldKey: 'address' },
        ],
      },
      {
        heading: 'Part I — Taxpayer Identification Number (TIN)',
        rows: [
          { label: 'SSN', fieldKey: 'ssn' },
          { label: 'US person', fieldKey: 'usPerson' },
          { label: 'FATCA / CRS', fieldKey: 'fatca' },
        ],
      },
      {
        heading: 'Part II — Certification',
        note: 'Under penalties of perjury, I certify that the number shown is my correct TIN and I am not subject to backup withholding.',
        rows: [{ label: 'Tax form type', fieldKey: 'taxForm' }],
      },
    ],
    signatures: ['Signature of U.S. person', 'Date'],
  },
  {
    id: 'esign',
    title: 'E-Sign Certificate of Completion',
    formNo: 'Electronic Signature Audit Trail',
    issuer: 'DocuSign · Envelope audit record',
    sections: [
      {
        heading: 'Envelope',
        rows: [
          { label: 'Signer', fieldKey: 'firstName' },
          { label: 'Email', fieldKey: 'email' },
          { label: 'Household', fieldKey: 'household' },
        ],
      },
      {
        heading: 'Events',
        rows: [
          { label: 'Sent', value: 'Envelope delivered to signer', kind: 'text' },
          { label: 'Viewed', value: 'Signer viewed all documents', kind: 'text' },
          { label: 'Signed', value: 'All required fields completed', kind: 'text' },
          { label: 'Consumer disclosure', value: 'ESIGN consent accepted', kind: 'text' },
        ],
      },
      {
        heading: 'Security',
        rows: [
          { label: 'Authentication', value: 'Email + access code', kind: 'text' },
          { label: 'Signature hash', value: 'SHA-256 checksum on file', kind: 'text' },
          { label: 'IP address', value: 'Captured on signing', kind: 'text' },
        ],
      },
    ],
  },
]

const TEMPLATE_BY_ID: Record<string, DocTemplate> = Object.fromEntries(
  TEMPLATES.map((t) => [t.id, t]),
)

/**
 * Resolve the mockup template for a document. Custodial/ACAT/ACH documents
 * hardcode "Charles Schwab & Co., Inc." as a fallback issuer in the template
 * data above, but the actual issuer is whichever custodian the household
 * routed to (or their free-text custodian value if it doesn't match one of
 * our first-class custodians) — swap it in here so the preview never shows
 * Schwab for a Fidelity, Pershing, LPL, State Street, or other household.
 */
export function templateForDoc(doc: ComplianceDocument, record?: ClientOnboardingRecord): DocTemplate | undefined {
  const template = TEMPLATE_BY_ID[doc.id]
  if (!template) return template
  if (!CUSTODIAN_ISSUED_CATEGORIES.includes(doc.category)) return template
  const custodian = custodianDisplayName(record)
  if (!custodian) return template
  const issuer = template.issuer?.replace(/Charles Schwab & Co\., Inc\./, custodian) ?? template.issuer
  return { ...template, issuer }
}
