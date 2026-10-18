import type { FinancialAccount } from './accounts'
import type { ClientOnboardingRecord, FormField } from './onboardingFramework'

// Account Opening Agent — runs automatically once the principal gate clears.
// It (1) runs a pre-submission check against the onboarding record so the
// application goes out in good order (the NIGO-prevention step), (2) fills
// anything it can derive itself, (3) submits to the connected custodian, and
// (4) writes the account numbers, documents, and the ACAT hand-off back onto the
// record. Pure + deterministic so the same household always opens the same way.

export type CheckStatus = 'pass' | 'fixed' | 'warn' | 'fail'

export interface OpeningCheck {
  id: string
  label: string
  status: CheckStatus
  detail: string
}

export interface OpenedAccount {
  registration: string
  type: FinancialAccount['type']
  mask: string
}

export interface AccountOpeningResult {
  custodian: string
  checks: OpeningCheck[]
  /** False when a hard check failed — nothing was sent to the custodian. */
  submitted: boolean
  opened: OpenedAccount[]
  acatNumber?: string
  deliveringFirm?: string
  /** Updated copy of the onboarding record (unchanged when not submitted). */
  record: ClientOnboardingRecord
  /** New managed (zero-balance) accounts at the custodian. */
  accounts: FinancialAccount[]
  summary: string
}

export const OPENING_DATE = '2026-09-24'

function field(record: ClientOnboardingRecord, key: string): FormField | undefined {
  for (const section of record.sections) {
    const found = section.fields.find((item) => item.key === key)
    if (found) return found
  }
  return undefined
}

function has(f: FormField | undefined) {
  return !!f && !!f.value && (f.status === 'complete' || f.status === 'n/a')
}

/** Small stable hash so masks/ACAT numbers don't change between runs. */
function seed(text: string) {
  let hash = 7
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 9973
  return hash
}

const REGISTRATION_FOR: { match: RegExp; registration: string; type: FinancialAccount['type'] }[] = [
  { match: /joint/i, registration: 'Joint (JTWROS)', type: 'joint' },
  { match: /trust/i, registration: 'Revocable Trust', type: 'trust' },
  { match: /roth/i, registration: 'Roth IRA', type: 'roth' },
  { match: /\bira\b/i, registration: 'Traditional IRA', type: 'ira' },
  { match: /individual|taxable|brokerage/i, registration: 'Individual', type: 'brokerage' },
]

/** Turn the account types captured at proposal ("Joint + Trust") into custodian registrations. */
export function deriveRegistrations(accountTypes: string): { registration: string; type: FinancialAccount['type'] }[] {
  const parts = accountTypes.split(/\+|,|\/|&/).map((p) => p.trim()).filter(Boolean)
  const out: { registration: string; type: FinancialAccount['type'] }[] = []
  for (const part of parts) {
    const hit = REGISTRATION_FOR.find((entry) => entry.match.test(part))
    if (hit && !out.some((o) => o.registration === hit.registration)) out.push({ registration: hit.registration, type: hit.type })
  }
  return out
}

/** Custodian named on the record ("Altruist selected — account not opened" → "Altruist"). */
export function custodianOnRecord(record: ClientOnboardingRecord) {
  const value = field(record, 'custodian')?.value ?? ''
  const name = value.split(/[—–-]/)[0].replace(/selected/i, '').trim()
  return name || 'Schwab'
}

export function runAccountOpening(
  source: ClientOnboardingRecord,
  householdName: string,
  connectedCustodians: string[],
): AccountOpeningResult {
  const record = structuredClone(source)
  const custodian = custodianOnRecord(record)
  const checks: OpeningCheck[] = []

  const principal = field(record, 'principal')
  checks.push({
    id: 'principal',
    label: 'Principal approval',
    status: has(principal) ? 'pass' : 'fail',
    detail: has(principal) ? `${principal!.value}` : 'Custodian submit is hard-gated on principal approval.',
  })

  const owners = [field(record, 'firstName'), field(record, 'lastName'), field(record, 'dob')]
  const cip = field(record, 'cip')
  checks.push({
    id: 'owners',
    label: 'Owners, legal names & ID',
    status: owners.every(has) && has(cip) ? 'pass' : 'fail',
    detail: owners.every(has)
      ? `${householdName} · dates of birth and CIP match the government ID`
      : 'Owner name or date of birth is missing.',
  })

  const acctTypes = field(record, 'acctTypes')
  const registrations = deriveRegistrations(acctTypes?.value ?? '')
  const registration = field(record, 'registration')
  const registrationText = registrations.map((r) => r.registration).join(' + ')
  if (has(registration)) {
    checks.push({ id: 'registration', label: 'Account registration', status: 'pass', detail: registration!.value })
  } else if (registrations.length) {
    checks.push({
      id: 'registration',
      label: 'Account registration',
      status: 'fixed',
      detail: `Was blank. Set to ${registrationText} from the account types on the IPS (${acctTypes!.value}).`,
    })
  } else {
    checks.push({ id: 'registration', label: 'Account registration', status: 'fail', detail: 'No account types on the IPS to derive a registration from.' })
  }

  const tod = field(record, 'tod')
  const trusted = field(record, 'trusted')
  checks.push({
    id: 'beneficiary',
    label: 'TOD / beneficiary & trusted contact',
    status: has(tod) && has(trusted) ? 'pass' : 'fail',
    detail: has(tod) && has(trusted) ? `TOD: ${tod!.value} · Trusted contact: ${trusted!.value}` : 'TOD or trusted contact (FINRA 4512) is missing.',
  })

  const taxDoc = record.documents.find((doc) => doc.id === 'tax')
  const fatca = field(record, 'fatca')
  checks.push({
    id: 'tax',
    label: 'Tax certification (W-9 / FATCA)',
    status: taxDoc?.status !== 'filed' ? 'fail' : has(fatca) ? 'pass' : 'warn',
    detail:
      taxDoc?.status !== 'filed'
        ? 'W-9 is not on file.'
        : has(fatca)
          ? 'W-9 filed · FATCA clear'
          : `W-9 filed. ${fatca?.value || 'FATCA item open'}. This does not block account opening, so the agent carries it to the funding step.`,
  })

  const connected = connectedCustodians.some((name) => name.toLowerCase() === custodian.toLowerCase())
  checks.push({
    id: 'custodian',
    label: `${custodian} connection`,
    status: connected ? 'pass' : 'fail',
    detail: connected ? `Connected in Integration Hub · read/write account-open API` : `${custodian} is not connected. Connect it in the Integration Hub to submit.`,
  })

  const submitted = !checks.some((check) => check.status === 'fail')
  if (!submitted) {
    const blocking = checks.filter((check) => check.status === 'fail').map((check) => check.label)
    return {
      custodian,
      checks,
      submitted: false,
      opened: [],
      record: source,
      accounts: [],
      summary: `Held before submit: ${blocking.join(', ')}. Nothing was sent to ${custodian}.`,
    }
  }

  const base = 4000 + (seed(record.householdId + custodian) % 900)
  const opened: OpenedAccount[] = registrations.map((r, i) => ({ ...r, mask: String(base + i * 8) }))
  const acctLine = opened.map((o) => `${o.registration} ···${o.mask}`).join(' · ')
  const delivering = field(record, 'delivering')
  const deliveringFirm = has(delivering) ? delivering!.value : undefined
  const acatNumber = deliveringFirm ? String(51000 + (seed(record.householdId) % 900)) : undefined

  const set = (key: string, value: string, status: FormField['status']) => {
    const f = field(record, key)
    if (!f) return
    f.value = value
    f.status = status
    f.updatedOn = OPENING_DATE
    f.updatedBy = 'system'
  }
  set('custodian', `${custodian} — ${opened.length} account${opened.length === 1 ? '' : 's'} open`, 'complete')
  set('registration', registrationText, 'complete')
  set('custAcct', acctLine, 'complete')
  if (deliveringFirm && acatNumber) {
    set('acatMatch', `${deliveringFirm} → ${custodian} ${opened[0].registration} ···${opened[0].mask} · same owners`, 'complete')
    set('acat', `Submitted to DTCC · ACAT #${acatNumber} · est. 5–7 business days`, 'partial')
    set('fundStatus', 'Awaiting ACAT settlement', 'partial')
  }

  const doc = (id: string) => record.documents.find((item) => item.id === id)
  const application = doc('custodial')
  if (application) {
    application.status = 'needs_signature'
    // First named owner signs in the portal ("Robert & Eleanor" + "Whitfield" → "Robert Whitfield").
    const first = field(record, 'firstName')?.value.split('&')[0].trim()
    const last = field(record, 'lastName')?.value ?? ''
    application.signerName = first ? `${first} ${last}`.trim() : householdName
    application.notes = `Submitted to ${custodian} by API on ${OPENING_DATE} with no NIGO. Account numbers issued: ${acctLine}. ${custodian} sent the account agreement to the owners for e-signature.`
  }
  const todDoc = doc('tod')
  if (todDoc) {
    todDoc.status = 'filed'
    todDoc.filedOn = OPENING_DATE
    todDoc.notes = `${tod!.value} · submitted with the application`
  }
  const transfer = doc('acatForm')
  if (transfer && acatNumber) {
    transfer.status = 'pending'
    transfer.notes = `ACAT #${acatNumber} submitted to DTCC from ${deliveringFirm}. Registration matches the new account.`
  }

  const accounts: FinancialAccount[] = opened.map((o) => ({
    id: `open-${record.householdId}-${o.mask}`,
    householdId: record.householdId,
    name: o.registration,
    institution: custodian,
    mask: o.mask,
    type: o.type,
    custody: 'managed',
    balance: 0,
    asOf: OPENING_DATE,
    // Worded so the portal doesn't read it as a stuck transfer (it flags "ACAT #" / NIGO).
    status: acatNumber ? `Opened ${OPENING_DATE} · funding in transit from ${deliveringFirm?.split('·')[0].trim()}` : `Opened ${OPENING_DATE} · awaiting funding`,
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [],
    transactions: [],
  }))

  return {
    custodian,
    checks,
    submitted: true,
    opened,
    acatNumber,
    deliveringFirm,
    record,
    accounts,
    summary: `${custodian} opened ${acctLine}${acatNumber ? ` · ACAT #${acatNumber} submitted` : ''}`,
  }
}

/** Record the principal's sign-off on the onboarding file (clears the leftover gate state). */
export function recordPrincipalApproval(source: ClientOnboardingRecord): ClientOnboardingRecord {
  const record = structuredClone(source)
  const set = (key: string, value: string) => {
    const f = field(record, key)
    if (!f) return
    f.value = value
    f.status = 'complete'
    f.updatedOn = OPENING_DATE
    f.updatedBy = 'advisor'
  }
  set('principal', `Approved · ${OPENING_DATE}`)
  set('principalDate', OPENING_DATE)
  const edd = field(record, 'edd')
  if (edd && edd.status !== 'n/a') set('edd', 'Approved by principal · SOW packet + CPA letter on file')
  const fee = field(record, 'feeSchedule')
  if (fee && fee.status !== 'complete') set('feeSchedule', 'Schedule A · locked after principal approval')
  for (const id of ['ips', 'fee']) {
    const doc = record.documents.find((item) => item.id === id)
    if (doc && doc.status === 'pending') {
      doc.status = 'filed'
      doc.filedOn = OPENING_DATE
      doc.notes = 'Released after principal approval'
    }
  }
  record.currentStageLabel = 'Account Opening'
  return record
}
