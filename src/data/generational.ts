export type DocState = 'current' | 'stale' | 'missing'
export type HeirStance = 'unknown' | 'light' | 'known'

export interface HeirPerson {
  name: string
  relationship: string
  lastTouch: string
  stance: HeirStance
}

export interface BeneficiaryGap {
  account: string
  issue: string
}

export interface EstateDoc {
  name: string
  state: DocState
  updated?: string
}

export interface GenerationalProfile {
  householdId: string
  principal: string
  principalAge?: number
  beneficiaries: number
  engagement: number
  documents: number
  beneficiaryLine: string
  risk: string
  heirs: HeirPerson[]
  gaps: BeneficiaryGap[]
  docs: EstateDoc[]
  actions: { label: string; detail: string }[]
}

export function compositeScore(profile: GenerationalProfile) {
  return Math.round((profile.beneficiaries + profile.engagement + profile.documents) / 3)
}

export function readinessBand(score: number) {
  if (score < 45) return 'At risk'
  if (score < 80) return 'Forming'
  return 'Ready'
}

export function weakestPillar(profile: GenerationalProfile) {
  const pillars = [
    { label: 'Beneficiaries', score: profile.beneficiaries },
    { label: 'Next-gen', score: profile.engagement },
    { label: 'Documents', score: profile.documents },
  ]
  return pillars.sort((a, b) => a.score - b.score)[0]
}

const profiles: GenerationalProfile[] = [
  {
    householdId: 'h0',
    principal: 'Elena Vasquez',
    beneficiaries: 0,
    engagement: 0,
    documents: 0,
    beneficiaryLine: 'No accounts, so nothing can transfer yet.',
    risk: 'Monday’s intro is the first chance to learn who would receive an account. Do not invent a beneficiary.',
    heirs: [],
    gaps: [{ account: 'No accounts opened', issue: 'Person Account is a name and an email' }],
    docs: [
      { name: 'Will', state: 'missing' },
      { name: 'Estate plan', state: 'missing' },
      { name: 'Power of attorney', state: 'missing' },
      { name: 'Trust', state: 'missing' },
      { name: 'Digital assets', state: 'missing' },
    ],
    actions: [
      {
        label: 'Ask who would receive the account',
        detail: 'One question on Monday. Capture a name only if she offers it.',
      },
    ],
  },
  {
    householdId: 'h1',
    principal: 'Maya Chen',
    principalAge: 34,
    beneficiaries: 28,
    engagement: 10,
    documents: 16,
    beneficiaryLine: '1 of 4 designations can transfer. The sibling TOD has no contingent.',
    risk: 'The only heir is a name on a form. A sibling who has never met the firm will not keep the relationship.',
    heirs: [
      {
        name: 'Sibling',
        relationship: 'Transfer on death',
        lastTouch: 'Never met the firm',
        stance: 'unknown',
      },
    ],
    gaps: [
      { account: 'Schwab IRA', issue: 'Primary is the sibling. Contingent is blank.' },
      { account: 'Taxable brokerage', issue: 'TOD does not match the discovery note yet.' },
    ],
    docs: [
      { name: 'Will', state: 'missing' },
      { name: 'Estate plan', state: 'missing' },
      { name: 'Power of attorney', state: 'missing' },
      { name: 'Trust', state: 'missing' },
      { name: 'Digital assets', state: 'missing' },
    ],
    actions: [
      {
        label: 'Fix the TOD before the resend',
        detail: 'Confirm the sibling designation, then add a contingent, on the corrected envelope.',
      },
      {
        label: 'Park a family intro',
        detail: 'Revisit after funding. There is no next generation to cultivate yet.',
      },
    ],
  },
  {
    householdId: 'h2',
    principal: 'Robert Whitfield',
    principalAge: 68,
    beneficiaries: 58,
    engagement: 34,
    documents: 52,
    beneficiaryLine: 'Trust is the primary path. The new US beneficiary is not finished on every account.',
    risk: 'The documents already point at a transfer. The people who inherit have not met the firm. Counsel knows the children. We do not.',
    heirs: [
      {
        name: 'Eleanor Whitfield',
        relationship: 'Spouse',
        lastTouch: 'In the household',
        stance: 'known',
      },
      {
        name: 'Granddaughter',
        relationship: 'Trusted contact',
        lastTouch: 'Named, never a client meeting',
        stance: 'light',
      },
      {
        name: 'Adult children',
        relationship: 'Next generation',
        lastTouch: 'No firm contact',
        stance: 'unknown',
      },
    ],
    gaps: [
      { account: 'Revocable trust', issue: 'US beneficiary added this week. Contingent path still open.' },
      { account: 'Fidelity ACAT', issue: 'Beneficiary cannot be set until the custodian account exists.' },
    ],
    docs: [
      { name: 'Will', state: 'stale', updated: '2019' },
      { name: 'Estate plan', state: 'current', updated: 'With counsel' },
      { name: 'Power of attorney', state: 'current', updated: '2024' },
      { name: 'Trust', state: 'current', updated: 'This week' },
      { name: 'Healthcare directive', state: 'stale', updated: '2021' },
      { name: 'Digital assets', state: 'missing' },
    ],
    actions: [
      {
        label: 'Ask Eleanor to host the intro',
        detail: 'After the principal gate clears, a short next-gen meeting. She makes it personal.',
      },
      {
        label: 'Finish the US beneficiary',
        detail: 'Same people on the trust, the ACAT, and the contingent line.',
      },
    ],
  },
  {
    householdId: 'h3',
    principal: 'Jordan Adams',
    principalAge: 58,
    beneficiaries: 74,
    engagement: 32,
    documents: 46,
    beneficiaryLine: 'Most accounts can transfer. One IRA is still missing a contingent.',
    risk: 'The daughter is a trusted contact, not a relationship. Annual review is the moment to change that before a transfer.',
    heirs: [
      {
        name: 'Sam Adams',
        relationship: 'Spouse',
        lastTouch: 'In the household',
        stance: 'known',
      },
      {
        name: 'Daughter',
        relationship: 'Trusted contact',
        lastTouch: 'Never oriented to the firm',
        stance: 'light',
      },
    ],
    gaps: [{ account: 'Traditional IRA', issue: 'Contingent beneficiary is blank.' }],
    docs: [
      { name: 'Will', state: 'stale', updated: '2018' },
      { name: 'Estate plan', state: 'stale', updated: 'Before this RMD year' },
      { name: 'Power of attorney', state: 'current', updated: '2023' },
      { name: 'Trust', state: 'current', updated: '2022' },
      { name: 'Digital assets', state: 'missing' },
    ],
    actions: [
      {
        label: 'Close the annual review with a family touch',
        detail: 'Thirty minutes this quarter. Sam hosts. The daughter meets the firm.',
      },
      {
        label: 'Add the IRA contingent',
        detail: 'One designation. Do it with the review, not as a separate project.',
      },
    ],
  },
  {
    householdId: 'h4',
    principal: 'Amara Okonkwo',
    beneficiaries: 44,
    engagement: 18,
    documents: 68,
    beneficiaryLine: 'Retitle is underway. The surviving spouse is not yet the client of record.',
    risk: 'The transfer already happened. Amara is the heir, and she has not decided to stay. This quarter is the attrition window.',
    heirs: [
      {
        name: 'Amara Okonkwo',
        relationship: 'Surviving spouse',
        lastTouch: 'Intro scheduled Tuesday',
        stance: 'light',
      },
      {
        name: 'James Okonkwo',
        relationship: 'Decedent',
        lastTouch: 'Relationship ended August 2026',
        stance: 'known',
      },
    ],
    gaps: [
      { account: 'Individual accounts', issue: 'Retitle to the estate, then to Amara, is not finished.' },
      { account: 'Estate tax ID', issue: 'EIN still pending. Successor W-9 is partial.' },
    ],
    docs: [
      { name: 'Will', state: 'current', updated: 'On file' },
      { name: 'Letters testamentary', state: 'current', updated: 'August 2026' },
      { name: 'Estate tax ID', state: 'missing' },
      { name: 'Successor W-9', state: 'stale', updated: 'Partial' },
      { name: 'Trust', state: 'missing' },
    ],
    actions: [
      {
        label: 'Use Tuesday to give her a reason to stay',
        detail: 'Care and the path. No portfolio. The estate memo is the talk track.',
      },
      {
        label: 'Review the retitle sequence',
        detail: 'Confirm counsel alignment before anything is sent in her name.',
      },
    ],
  },
]

export function handoffFor(householdId: string) {
  return profiles.find((profile) => profile.householdId === householdId) ?? profiles[0]
}

export function allHandoffs() {
  return profiles
}
