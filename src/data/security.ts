// Identity protection (#2). Per-household security posture the client manages
// in the portal and the advisor sees in Work. High-risk money movement triggers
// step-up verification and a callback, which lands in the work queue as a
// Critical signal until a human verifies (FINRA 2165 / 4512 / Senior Investor rules).

export interface TrustedDevice {
  id: string
  label: string
  lastSeen: string
  location: string
}

export interface LoginEvent {
  id: string
  at: string
  device: string
  location: string
  result: 'success' | 'blocked' | 'challenged'
  risk: 'normal' | 'new_device' | 'unusual_location'
}

export interface TrustedContact {
  name: string
  relationship: string
  phone: string
}

export interface SecurityProfile {
  householdId: string
  mfa: 'authenticator' | 'sms' | 'off'
  verbalPassphrase: boolean
  loginAlerts: boolean
  /** Client-requested hold: all outbound money movement needs a callback. */
  fraudAlert: boolean
  trustedContact: TrustedContact | null
  devices: TrustedDevice[]
  logins: LoginEvent[]
  /** Elder-investor protections apply (65+ or vulnerability flag). */
  seniorProtections: boolean
}

export const initialSecurity: Record<string, SecurityProfile> = {
  h0: {
    householdId: 'h0',
    mfa: 'off',
    verbalPassphrase: false,
    loginAlerts: false,
    fraudAlert: false,
    trustedContact: null,
    devices: [],
    logins: [],
    seniorProtections: false,
  },
  h1: {
    householdId: 'h1',
    mfa: 'sms',
    verbalPassphrase: false,
    loginAlerts: true,
    fraudAlert: false,
    trustedContact: null,
    devices: [
      { id: 'd1', label: 'iPhone 15 · Safari', lastSeen: '2026-09-24', location: 'San Francisco, CA' },
      { id: 'd2', label: 'MacBook Air · Chrome', lastSeen: '2026-09-18', location: 'San Francisco, CA' },
    ],
    logins: [
      { id: 'l1', at: '2026-09-24T07:58:00', device: 'iPhone 15 · Safari', location: 'San Francisco, CA', result: 'success', risk: 'normal' },
      { id: 'l2', at: '2026-09-18T21:10:00', device: 'MacBook Air · Chrome', location: 'San Francisco, CA', result: 'success', risk: 'normal' },
    ],
    seniorProtections: false,
  },
  h2: {
    householdId: 'h2',
    mfa: 'authenticator',
    verbalPassphrase: true,
    loginAlerts: true,
    fraudAlert: false,
    trustedContact: { name: 'Claire Whitfield', relationship: 'Daughter', phone: '(415) 555-0147' },
    devices: [{ id: 'd1', label: 'iPad · Safari', lastSeen: '2026-09-24', location: 'Greenwich, CT' }],
    logins: [{ id: 'l1', at: '2026-09-24T09:01:00', device: 'iPad · Safari', location: 'Greenwich, CT', result: 'success', risk: 'normal' }],
    seniorProtections: true,
  },
  h3: {
    householdId: 'h3',
    mfa: 'authenticator',
    verbalPassphrase: true,
    loginAlerts: true,
    fraudAlert: false,
    trustedContact: { name: 'Taylor Adams', relationship: 'Son', phone: '(312) 555-0199' },
    devices: [
      { id: 'd1', label: 'Pixel 8 · Chrome', lastSeen: '2026-09-20', location: 'Chicago, IL' },
      { id: 'd2', label: 'Windows · Edge', lastSeen: '2026-09-12', location: 'Chicago, IL' },
    ],
    logins: [{ id: 'l1', at: '2026-09-20T18:22:00', device: 'Pixel 8 · Chrome', location: 'Chicago, IL', result: 'success', risk: 'normal' }],
    seniorProtections: false,
  },
  h4: {
    householdId: 'h4',
    mfa: 'sms',
    verbalPassphrase: false,
    loginAlerts: false,
    fraudAlert: false,
    trustedContact: null,
    devices: [{ id: 'd1', label: 'iPhone 12 · Safari', lastSeen: '2026-09-21', location: 'Atlanta, GA' }],
    logins: [
      { id: 'l1', at: '2026-09-21T10:15:00', device: 'iPhone 12 · Safari', location: 'Atlanta, GA', result: 'success', risk: 'normal' },
      { id: 'l2', at: '2026-09-25T02:47:00', device: 'Windows · Firefox', location: 'Lagos, NG', result: 'blocked', risk: 'unusual_location' },
    ],
    seniorProtections: true,
  },
}

export interface MoveRisk {
  level: 'low' | 'elevated' | 'high'
  reasons: string[]
  stepUp: boolean
  callback: boolean
}

/** Risk-scores a client money-movement request before it reaches the firm. */
export function assessMoveRisk(profile: SecurityProfile, amount: number, balance: number): MoveRisk {
  const reasons: string[] = []
  if (amount >= 25000) reasons.push(`Amount ${amount >= 100000 ? 'over $100k' : 'over $25k'}`)
  if (balance > 0 && amount / balance >= 0.5) reasons.push('More than half the account balance')
  const recentRisky = profile.logins.find((login) => login.risk !== 'normal')
  if (recentRisky) reasons.push(`Recent ${recentRisky.risk === 'new_device' ? 'new-device' : 'unusual-location'} sign-in (${recentRisky.location})`)
  if (profile.fraudAlert) reasons.push('Client fraud alert is on')
  if (profile.mfa === 'off') reasons.push('No multi-factor sign-in')
  if (profile.seniorProtections) reasons.push('Senior investor protections apply')
  const high = profile.fraudAlert || !!recentRisky || amount >= 100000 || (profile.seniorProtections && amount >= 25000)
  const elevated = reasons.length > 0
  return {
    level: high ? 'high' : elevated ? 'elevated' : 'low',
    reasons,
    stepUp: elevated,
    callback: high,
  }
}

export function securityScore(profile: SecurityProfile) {
  const checks = [
    { ok: profile.mfa === 'authenticator', label: 'Authenticator-app sign-in', weight: 30 },
    { ok: profile.mfa !== 'off', label: 'Multi-factor sign-in on', weight: 15 },
    { ok: profile.trustedContact != null, label: 'Trusted contact on file', weight: 20 },
    { ok: profile.loginAlerts, label: 'Sign-in alerts on', weight: 15 },
    { ok: profile.verbalPassphrase, label: 'Verbal passphrase for calls', weight: 20 },
  ]
  const score = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0)
  return { score, checks }
}

/** Demo one-time code. In production: sent via the MFA factor on file. */
export function oneTimeCode(householdId: string) {
  let h = 0
  for (const ch of `${householdId}-otp`) h = (h * 31 + ch.charCodeAt(0)) % 1000000
  return String(h).padStart(6, '0')
}
