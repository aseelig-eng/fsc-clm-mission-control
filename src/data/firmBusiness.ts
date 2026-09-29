// E2 — "Business across the firm" for the Client Pulse view.
//
// Compliance note: cross-firm visibility raises information-barrier
// ("Chinese wall") concerns. This is gated at two levels:
//   1. Firm/tenant level — the whole widget is on/off.
//   2. Line-of-business + role level — each LOB can be hidden, and the
//      detail drill-in can be gated separately from the existence indicator.
// Default is OFF (opt-in).

export type LineOfBusinessId =
  | 'banking'
  | 'insurance'
  | 'asset_mgmt'
  | 'lending'
  | 'trust'

export type FirmRole = 'advisor' | 'paraplanner' | 'value'

export interface FirmBusinessDetail {
  label: string
  value: string
  owner: string
}

export interface LineOfBusiness {
  id: LineOfBusinessId
  label: string
  /** Whether the client has any business in this line. */
  hasBusiness: boolean
  /** Relationship owner / desk, shown on drill-in. */
  relationshipOwner?: string
  /** Detail rows revealed on click-through. */
  details: FirmBusinessDetail[]
}

export const LOB_ORDER: LineOfBusinessId[] = [
  'banking',
  'insurance',
  'asset_mgmt',
  'lending',
  'trust',
]

export const LOB_LABEL: Record<LineOfBusinessId, string> = {
  banking: 'Banking',
  insurance: 'Insurance',
  asset_mgmt: 'Asset Management',
  lending: 'Lending',
  trust: 'Trust',
}

// -------- Compliance configuration (firm/tenant + LOB + role) --------

export interface FirmBusinessConfig {
  /** Master switch — firm/tenant level. Default OFF (opt-in). */
  enabled: boolean
  /** Which lines of business are permitted to surface at all. */
  visibleLines: LineOfBusinessId[]
  /**
   * Whether the existence indicator (has / no business) is gated
   * separately from the detail drill-in. When false, users may see the
   * indicator but not open the specifics.
   */
  detailEnabled: boolean
  /** Roles allowed to view the widget at all. */
  allowedRoles: FirmRole[]
  /** Roles allowed to open the detail drill-in. */
  detailRoles: FirmRole[]
}

// Default reflects the compliance-safe posture: opt-in, off by default.
export const DEFAULT_FIRM_BUSINESS_CONFIG: FirmBusinessConfig = {
  enabled: false,
  visibleLines: [...LOB_ORDER],
  detailEnabled: true,
  allowedRoles: ['advisor', 'paraplanner'],
  detailRoles: ['advisor'],
}

export function canViewWidget(config: FirmBusinessConfig, role: FirmRole): boolean {
  return config.enabled && config.allowedRoles.includes(role)
}

export function canViewDetail(config: FirmBusinessConfig, role: FirmRole): boolean {
  return canViewWidget(config, role) && config.detailEnabled && config.detailRoles.includes(role)
}

export function visibleLinesFor(
  household: FirmBusinessProfile,
  config: FirmBusinessConfig,
): LineOfBusiness[] {
  return household.lines.filter((line) => config.visibleLines.includes(line.id))
}

// -------- Per-household business profile (demo data) --------

export interface FirmBusinessProfile {
  householdId: string
  lines: LineOfBusiness[]
}

function line(
  id: LineOfBusinessId,
  hasBusiness: boolean,
  relationshipOwner: string | undefined,
  details: FirmBusinessDetail[],
): LineOfBusiness {
  return { id, label: LOB_LABEL[id], hasBusiness, relationshipOwner, details }
}

export const firmBusinessByHousehold: Record<string, FirmBusinessProfile> = {
  h0: {
    householdId: 'h0',
    lines: [
      line('banking', true, 'Private Bank · M. Alvarez', [
        { label: 'Checking (Private Client)', value: '$182,400', owner: 'Private Bank' },
        { label: 'Savings / money market', value: '$540,000', owner: 'Private Bank' },
      ]),
      line('insurance', true, 'Insurance Desk · R. Okafor', [
        { label: 'Term life', value: '$2.0M coverage', owner: 'Insurance Desk' },
        { label: 'Umbrella liability', value: '$5.0M coverage', owner: 'Insurance Desk' },
      ]),
      line('asset_mgmt', true, 'You (advisory)', [
        { label: 'Managed advisory', value: '$4.6M AUM', owner: 'Wealth Advisory' },
      ]),
      line('lending', true, 'Lending · Securities-based', [
        { label: 'Securities-based line of credit', value: '$750,000 available', owner: 'Lending' },
      ]),
      line('trust', false, undefined, []),
    ],
  },
  h1: {
    householdId: 'h1',
    lines: [
      line('banking', true, 'Consumer Bank', [
        { label: 'Joint checking', value: '$24,300', owner: 'Consumer Bank' },
      ]),
      line('insurance', false, undefined, []),
      line('asset_mgmt', true, 'You (advisory)', [
        { label: 'Managed advisory', value: '$820,000 AUM', owner: 'Wealth Advisory' },
      ]),
      line('lending', true, 'Mortgage', [
        { label: 'Residential mortgage', value: '$412,000 balance', owner: 'Mortgage' },
      ]),
      line('trust', false, undefined, []),
    ],
  },
  h2: {
    householdId: 'h2',
    lines: [
      line('banking', false, undefined, []),
      line('insurance', true, 'Insurance Desk', [
        { label: 'Whole life', value: '$1.2M cash value', owner: 'Insurance Desk' },
      ]),
      line('asset_mgmt', true, 'You (advisory)', [
        { label: 'Managed advisory', value: '$2.1M AUM', owner: 'Wealth Advisory' },
      ]),
      line('lending', false, undefined, []),
      line('trust', true, 'Trust Company · Delaware', [
        { label: 'Revocable living trust', value: 'Admin + investment', owner: 'Trust Company' },
      ]),
    ],
  },
  h3: {
    householdId: 'h3',
    lines: [
      line('banking', true, 'Private Bank', [
        { label: 'Checking', value: '$96,000', owner: 'Private Bank' },
      ]),
      line('insurance', false, undefined, []),
      line('asset_mgmt', true, 'You (advisory)', [
        { label: 'Managed advisory', value: '$3.3M AUM', owner: 'Wealth Advisory' },
      ]),
      line('lending', false, undefined, []),
      line('trust', true, 'Trust Company', [
        { label: 'Irrevocable trust (ILIT)', value: 'Admin only', owner: 'Trust Company' },
      ]),
    ],
  },
  h4: {
    householdId: 'h4',
    lines: [
      line('banking', true, 'Consumer Bank', [
        { label: 'Checking', value: '$11,200', owner: 'Consumer Bank' },
      ]),
      line('insurance', false, undefined, []),
      line('asset_mgmt', true, 'You (advisory)', [
        { label: 'Managed advisory', value: '$430,000 AUM', owner: 'Wealth Advisory' },
      ]),
      line('lending', false, undefined, []),
      line('trust', false, undefined, []),
    ],
  },
}

export function firmBusinessFor(householdId: string): FirmBusinessProfile {
  return (
    firmBusinessByHousehold[householdId] ?? {
      householdId,
      lines: LOB_ORDER.map((id) => line(id, false, undefined, [])),
    }
  )
}
