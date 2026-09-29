// Custodian routing + form field mapping.
//
// A household's `custodian` field is free text (e.g. "Schwab", "Altruist
// selected — account not opened"). This module normalizes that text against
// the firm's first-class custodians, and for each one defines a mapping from
// ClientOnboardingRecord field keys to the custodian's actual new-account-form
// fields.
//
// Fidelity, Pershing, and State Street ship with a real fillable PDF
// (public/custodian-forms/*.pdf, AcroForm field names captured from the real
// forms) — `hasRealPdf: true`, `pdfPath` set, and `fillCustodianPdf()` below
// can produce a genuinely filled copy via pdf-lib.
//
// Schwab (App 33600) and LPL (F1BN-CTD) could not be retrieved as fillable
// PDFs from any available source (dead links, no Wayback snapshot, blocked
// downloads). Per explicit sign-off, those two get a best-effort field
// schema — used for required-field validation and for labeling the mockup
// preview with the real form's field names — but no AcroForm fill.

import type { ClientOnboardingRecord, FieldStatus, FormField } from './onboardingFramework'

export type CustodianId = 'schwab' | 'fidelity' | 'pershing' | 'lpl' | 'statestreet'

/** Address-string decomposition used when a custodian form splits address into parts. */
type AddressPart = 'addressStreet' | 'addressCity' | 'addressState' | 'addressZip' | 'addressCityStateZip'

export interface CustodianFieldMapping {
  /**
   * Key into the flattened ClientOnboardingRecord field map, or the
   * synthetic `__fullName__` key (firstName + lastName joined) for forms
   * that use a single combined name field.
   */
  recordKey: string
  /** Human label for what this data represents (used in validation gaps). */
  label: string
  /** Real PDF AcroForm field name (hasRealPdf custodians) or a descriptive mock field name. */
  pdfField: string
  kind: 'text' | 'checkbox'
  /** Flag the primary mapping for a recordKey as required so gap-checking doesn't double-count split parts. */
  required?: boolean
  /** When set, fillCustodianPdf() writes a decomposed piece of the resolved value instead of the raw string. */
  split?: AddressPart
}

export interface CustodianProfile {
  id: CustodianId
  label: string
  matchPattern: RegExp
  hasRealPdf: boolean
  pdfPath?: string
  formTitle: string
  formNo?: string
  fieldMap: CustodianFieldMapping[]
}

function addressPart(address: string, part: AddressPart): string {
  const segments = address
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const street = segments[0] ?? ''
  const city = segments[1] ?? ''
  const stateZip = segments[2] ?? ''
  const [state, zip] = stateZip.split(/\s+/).filter(Boolean)
  switch (part) {
    case 'addressStreet':
      return street
    case 'addressCity':
      return city
    case 'addressState':
      return state ?? ''
    case 'addressZip':
      return zip ?? ''
    case 'addressCityStateZip':
      return [city, [state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    default:
      return address
  }
}

export const CUSTODIAN_PROFILES: CustodianProfile[] = [
  {
    id: 'schwab',
    label: 'Charles Schwab & Co., Inc.',
    matchPattern: /schwab/i,
    hasRealPdf: false,
    formTitle: 'New Account Application',
    formNo: 'Schwab App 33600',
    fieldMap: [
      { recordKey: '__fullName__', label: 'Account owner full legal name', pdfField: 'Account Owner Full Legal Name', kind: 'text', required: true },
      { recordKey: 'dob', label: 'Date of birth', pdfField: 'Date of Birth', kind: 'text', required: true },
      { recordKey: 'ssn', label: 'SSN / Tax ID', pdfField: 'Social Security Number / Tax ID', kind: 'text', required: true },
      { recordKey: 'address', label: 'Legal residential address', pdfField: 'Legal Residential Address', kind: 'text', required: true },
      { recordKey: 'citizenship', label: 'Citizenship', pdfField: 'Citizenship', kind: 'text', required: true },
      { recordKey: 'employer', label: 'Employer name', pdfField: 'Employer Name', kind: 'text' },
      { recordKey: 'title', label: 'Occupation', pdfField: 'Occupation', kind: 'text' },
      { recordKey: 'income', label: 'Annual income', pdfField: 'Annual Income', kind: 'text' },
      { recordKey: 'netWorth', label: 'Net worth', pdfField: 'Net Worth', kind: 'text' },
      { recordKey: 'acctTypes', label: 'Account type selection', pdfField: 'Account Type Selection', kind: 'checkbox', required: true },
      { recordKey: 'registration', label: 'Account registration', pdfField: 'Account Registration', kind: 'text', required: true },
      { recordKey: 'custAcct', label: 'Schwab account number', pdfField: 'Schwab Account Number', kind: 'text', required: true },
      { recordKey: 'objective', label: 'Investment objective', pdfField: 'Investment Objective', kind: 'checkbox' },
      { recordKey: 'riskTol', label: 'Risk tolerance', pdfField: 'Risk Tolerance', kind: 'checkbox' },
      { recordKey: 'trusted', label: 'Trusted contact person (FINRA Rule 4512)', pdfField: 'Trusted Contact Person', kind: 'text', required: true },
    ],
  },
  {
    id: 'fidelity',
    label: 'Fidelity Investments',
    matchPattern: /fidelity/i,
    hasRealPdf: true,
    pdfPath: '/custodian-forms/fidelity-b-entity-app.pdf',
    formTitle: 'B-Entity Application',
    formNo: 'Fidelity B-Entity Application',
    fieldMap: [
      { recordKey: 'firstName', label: 'First name', pdfField: 'AR_FirstName', kind: 'text', required: true },
      { recordKey: 'lastName', label: 'Last name', pdfField: 'AR_LastName', kind: 'text', required: true },
      { recordKey: 'dob', label: 'Date of birth', pdfField: 'AR_DOB', kind: 'text', required: true },
      { recordKey: 'ssn', label: 'SSN', pdfField: 'AR_SSN', kind: 'text', required: true },
      { recordKey: 'address', label: 'Address', pdfField: 'AI_Address', kind: 'text', required: true },
      { recordKey: 'address', label: 'City', pdfField: 'AI_City', kind: 'text', split: 'addressCity' },
      { recordKey: 'address', label: 'State', pdfField: 'AI_State', kind: 'text', split: 'addressState' },
      { recordKey: 'address', label: 'Zip', pdfField: 'AI_Zip', kind: 'text', split: 'addressZip' },
      { recordKey: 'email', label: 'Email', pdfField: 'AI_Email', kind: 'text' },
      { recordKey: 'phone', label: 'Mobile number', pdfField: 'AI_MobileNumber', kind: 'text' },
      { recordKey: 'custAcct', label: 'Account number', pdfField: 'AI_Account', kind: 'text', required: true },
      { recordKey: 'registration', label: 'Official account registration', pdfField: 'AI_Official', kind: 'text', required: true },
      { recordKey: 'trusted', label: 'Trusted contact', pdfField: 'TI_AccountOwnerFirstName', kind: 'text' },
      { recordKey: 'principalDate', label: 'Signature date', pdfField: 'SD_Date', kind: 'text' },
    ],
  },
  {
    id: 'pershing',
    label: 'Pershing LLC',
    matchPattern: /pershing/i,
    hasRealPdf: true,
    pdfPath: '/custodian-forms/pershing-new-account-app.pdf',
    formTitle: 'New Account Application',
    formNo: 'Pershing New Account Form',
    fieldMap: [
      { recordKey: '__fullName__', label: 'Account owner name', pdfField: 'Step 4 Name', kind: 'text', required: true },
      { recordKey: 'dob', label: 'Date of birth', pdfField: 'Step4DOB1', kind: 'text', required: true },
      { recordKey: 'ssn', label: 'Tax ID / SSN', pdfField: 'Step4TaxID', kind: 'text', required: true },
      { recordKey: 'address', label: 'Legal address', pdfField: 'Step4LegalAddress', kind: 'text', required: true },
      { recordKey: 'address', label: 'City', pdfField: 'Step4LegalCity', kind: 'text', split: 'addressCity' },
      { recordKey: 'address', label: 'State', pdfField: 'Step4LegalState', kind: 'text', split: 'addressState' },
      { recordKey: 'address', label: 'Zip', pdfField: 'Step4LegalZip', kind: 'text', split: 'addressZip' },
      { recordKey: 'email', label: 'Email', pdfField: 'Step4Email', kind: 'text' },
      { recordKey: 'phone', label: 'Home phone', pdfField: 'Step4HomePhone', kind: 'text' },
      { recordKey: 'employer', label: 'Employer name', pdfField: 'Step4EmplName', kind: 'text' },
      { recordKey: 'title', label: 'Occupation', pdfField: 'Step4EmplOccupation', kind: 'text' },
      { recordKey: 'custAcct', label: 'Account number', pdfField: 'ACCOUNT NUMBER', kind: 'text', required: true },
      { recordKey: 'principalDate', label: 'Signature date', pdfField: 'Step12Date4', kind: 'text' },
    ],
  },
  {
    id: 'lpl',
    label: 'LPL Financial',
    matchPattern: /\blpl\b/i,
    hasRealPdf: false,
    formTitle: 'New Account & Transfer Document',
    formNo: 'LPL F1BN-CTD',
    fieldMap: [
      { recordKey: '__fullName__', label: 'Account owner name', pdfField: 'Account Owner Name', kind: 'text', required: true },
      { recordKey: 'dob', label: 'Date of birth', pdfField: 'Date of Birth', kind: 'text', required: true },
      { recordKey: 'ssn', label: 'SSN / TIN', pdfField: 'SSN / TIN', kind: 'text', required: true },
      { recordKey: 'address', label: 'Residential address', pdfField: 'Residential Address', kind: 'text', required: true },
      { recordKey: 'email', label: 'Email address', pdfField: 'Email Address', kind: 'text' },
      { recordKey: 'phone', label: 'Phone number', pdfField: 'Phone Number', kind: 'text' },
      { recordKey: 'employer', label: 'Employer', pdfField: 'Employer', kind: 'text' },
      { recordKey: 'acctTypes', label: 'Account type', pdfField: 'Account Type', kind: 'checkbox', required: true },
      { recordKey: 'registration', label: 'Registration', pdfField: 'Registration', kind: 'text', required: true },
      { recordKey: 'custAcct', label: 'LPL account number', pdfField: 'LPL Account Number', kind: 'text', required: true },
      { recordKey: 'delivering', label: 'Delivering firm / transfer instructions', pdfField: 'Delivering Firm / Transfer Instructions', kind: 'text' },
      { recordKey: 'trusted', label: 'Trusted contact', pdfField: 'Trusted Contact', kind: 'text', required: true },
    ],
  },
  {
    id: 'statestreet',
    label: 'State Street / SSGA',
    matchPattern: /state\s*street|ssga|ssit/i,
    hasRealPdf: true,
    pdfPath: '/custodian-forms/statestreet-ssga-new-account-app.pdf',
    formTitle: 'SSIT New Account Application',
    formNo: 'SSGA/SSIT New Account Application',
    fieldMap: [
      { recordKey: 'firstName', label: 'First name', pdfField: 'First Name', kind: 'text', required: true },
      { recordKey: 'lastName', label: 'Last name', pdfField: 'Last Name', kind: 'text', required: true },
      { recordKey: 'dob', label: 'Date of birth', pdfField: 'Date of Birth', kind: 'text', required: true },
      { recordKey: 'ssn', label: 'Social Security Number', pdfField: 'Social Security Number', kind: 'text', required: true },
      { recordKey: 'address', label: 'Street address', pdfField: 'Street Address', kind: 'text', required: true },
      { recordKey: 'address', label: 'City / State / Zip', pdfField: 'City  State  Zip Code', kind: 'text', split: 'addressCityStateZip' },
      { recordKey: 'email', label: 'Email address', pdfField: 'Email Address', kind: 'text' },
      { recordKey: 'phone', label: 'Daytime telephone number', pdfField: 'Daytime Telephone Number', kind: 'text' },
      { recordKey: 'principalDate', label: 'Signature date', pdfField: 'Date MMDDYYYY', kind: 'text' },
    ],
  },
]

const CUSTODIAN_BY_ID: Record<CustodianId, CustodianProfile> = Object.fromEntries(
  CUSTODIAN_PROFILES.map((p) => [p.id, p]),
) as Record<CustodianId, CustodianProfile>

export function custodianProfileById(id: CustodianId): CustodianProfile {
  return CUSTODIAN_BY_ID[id]
}

/** Match a household's free-text custodian value against our first-class custodians. */
export function normalizeCustodian(freeText?: string): CustodianId | null {
  if (!freeText) return null
  for (const profile of CUSTODIAN_PROFILES) {
    if (profile.matchPattern.test(freeText)) return profile.id
  }
  return null
}

function custodianRawValue(record?: ClientOnboardingRecord): string | undefined {
  return record?.sections.flatMap((s) => s.fields).find((f) => f.key === 'custodian')?.value?.trim()
}

/** Resolve the full custodian profile (mapping + real-PDF availability) for a household's record. */
export function resolveCustodianProfile(record?: ClientOnboardingRecord): CustodianProfile | null {
  const id = normalizeCustodian(custodianRawValue(record))
  return id ? custodianProfileById(id) : null
}

/**
 * Best display name for the custodian on a household's documents: the
 * canonical firm name when routed to one of our five, otherwise whatever
 * free text the record has (so an unmapped custodian like Altruist still
 * shows correctly instead of a wrong default), otherwise null.
 */
export function custodianDisplayName(record?: ClientOnboardingRecord): string | null {
  const profile = resolveCustodianProfile(record)
  if (profile) return profile.label
  return custodianRawValue(record) || null
}

export interface CustodianGap {
  section: string
  field: string
  status: FieldStatus
  value: string
}

/**
 * Required-field validation for the household's routed custodian form.
 * Flags fields the custodian's real (or best-effort) form requires that are
 * missing/blocked/partial in the data model — or entirely absent from it —
 * rather than silently leaving a PDF field blank or broken.
 */
export function custodianFieldGaps(record?: ClientOnboardingRecord): CustodianGap[] {
  const profile = resolveCustodianProfile(record)
  if (!profile || !record) return []
  const fieldMap: Record<string, FormField> = {}
  for (const s of record.sections) for (const f of s.fields) fieldMap[f.key] = f
  const fullName = [fieldMap.firstName?.value, fieldMap.lastName?.value].filter(Boolean).join(' ').trim()
  const sectionLabel = `Custodian Form — ${profile.label}`
  const gaps: CustodianGap[] = []
  const seen = new Set<string>()
  for (const m of profile.fieldMap) {
    if (!m.required || seen.has(m.recordKey)) continue
    seen.add(m.recordKey)
    const fieldLabel = `${m.label} (${m.pdfField})`
    if (m.recordKey === '__fullName__') {
      if (!fullName) gaps.push({ section: sectionLabel, field: fieldLabel, status: 'missing', value: '' })
      continue
    }
    const f = fieldMap[m.recordKey]
    if (!f) {
      gaps.push({ section: sectionLabel, field: fieldLabel, status: 'missing', value: '' })
      continue
    }
    if (f.status === 'missing' || f.status === 'blocked' || f.status === 'partial') {
      gaps.push({ section: sectionLabel, field: fieldLabel, status: f.status, value: f.value })
    }
  }
  return gaps
}

function resolvedValue(fieldMap: Record<string, FormField>, key: string, fullName: string): string {
  if (key === '__fullName__') return fullName
  const f = fieldMap[key]
  if (!f || !f.value || f.status === 'missing' || f.status === 'blocked') return ''
  return f.value
}

export interface CustodianFillResult {
  bytes: Uint8Array
  /** Fields that couldn't be written as-is (e.g. truncated to the PDF's max length) — surfaced instead of silently dropped. */
  warnings: string[]
}

/**
 * Fill the custodian's real AcroForm PDF from the household's record via
 * pdf-lib. Only Fidelity, Pershing, and State Street have a real fillable
 * PDF on file (public/custodian-forms/); calling this for Schwab or LPL
 * throws — those two only ever get the best-effort mockup preview.
 */
export async function fillCustodianPdf(record: ClientOnboardingRecord, basePath = ''): Promise<CustodianFillResult> {
  const profile = resolveCustodianProfile(record)
  if (!profile || !profile.hasRealPdf || !profile.pdfPath) {
    throw new Error('No fillable PDF is available for this custodian yet — only a best-effort mockup preview.')
  }
  const { PDFDocument } = await import('pdf-lib')
  const res = await fetch(`${basePath}${profile.pdfPath}`)
  if (!res.ok) throw new Error(`Could not load the ${profile.label} form template (${res.status}).`)
  const bytes = await res.arrayBuffer()
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = pdfDoc.getForm()

  const fieldMap: Record<string, FormField> = {}
  for (const s of record.sections) for (const f of s.fields) fieldMap[f.key] = f
  const fullName = [fieldMap.firstName?.value, fieldMap.lastName?.value].filter(Boolean).join(' ').trim()

  const warnings: string[] = []
  for (const m of profile.fieldMap) {
    const raw = resolvedValue(fieldMap, m.recordKey, fullName)
    if (!raw) continue
    const out = m.split ? addressPart(raw, m.split) : raw
    if (!out) continue
    try {
      if (m.kind === 'checkbox') {
        form.getCheckBox(m.pdfField).check()
      } else {
        const textField = form.getTextField(m.pdfField)
        const maxLen = textField.getMaxLength()
        if (maxLen != null && out.length > maxLen) {
          textField.setText(out.slice(0, maxLen))
          warnings.push(`${m.label}: truncated to ${maxLen} characters to fit "${m.pdfField}" — verify on the PDF.`)
        } else {
          textField.setText(out)
        }
      }
    } catch (err) {
      // The mapped field name didn't resolve to the widget type we expect on
      // this PDF revision. Flag it instead of silently leaving the field
      // blank or aborting the whole fill.
      warnings.push(`${m.label}: could not write to "${m.pdfField}" (${err instanceof Error ? err.message : 'unknown error'}).`)
    }
  }

  return { bytes: await pdfDoc.save(), warnings }
}
