export type AccountCustody = 'managed' | 'held-away'
export type AccountType = 'brokerage' | 'ira' | 'roth' | '401k' | 'trust' | 'checking' | 'joint'
export type AccountLink = 'custodian' | 'plaid' | 'manual'

export interface Position {
  symbol: string
  name: string
  shares: number
  price: number
  value: number
  assetClass: string
}

export interface LedgerTxn {
  id: string
  date: string
  type: 'Buy' | 'Sell' | 'Dividend' | 'Fee' | 'Transfer' | 'Contribution' | 'Interest'
  description: string
  amount: number
}

export interface FinancialAccount {
  id: string
  householdId: string
  name: string
  institution: string
  mask: string
  type: AccountType
  custody: AccountCustody
  balance: number
  asOf: string
  status: string
  addedBy: 'book' | 'client'
  review: 'clear' | 'pending'
  link: AccountLink
  holdings: Position[]
  transactions: LedgerTxn[]
}

export interface ClientNotice {
  id: string
  householdId: string
  householdName: string
  title: string
  detail: string
  sectionId?: string
  touched: { sectionId: string; fieldKey: string }[]
  reviewed: boolean
}

export interface PlaidOffer {
  id: string
  institution: string
  accounts: {
    name: string
    type: AccountType
    balance: number
    holdings: Position[]
    transactions: LedgerTxn[]
  }[]
}

export function usd(value: number, digits = 0) {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
}

export function accountTotals(accounts: FinancialAccount[]) {
  const managed = accounts.filter((account) => account.custody === 'managed').reduce((sum, account) => sum + account.balance, 0)
  const heldAway = accounts.filter((account) => account.custody === 'held-away').reduce((sum, account) => sum + account.balance, 0)
  return { managed, heldAway, total: managed + heldAway }
}

const cash = (value: number): Position => ({
  symbol: 'CASH',
  name: 'Cash',
  shares: value,
  price: 1,
  value,
  assetClass: 'Cash',
})

export const initialAccounts: FinancialAccount[] = [
  {
    id: 'maya-roth',
    householdId: 'h1',
    name: 'Roth IRA',
    institution: 'Schwab',
    mask: '8821',
    type: 'roth',
    custody: 'managed',
    balance: 0,
    asOf: '2026-09-24',
    status: 'Open · ACAT not settled',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [],
    transactions: [
      {
        id: 'maya-roth-tx',
        date: '2026-09-18',
        type: 'Transfer',
        description: 'ACAT #48291 rejected — TOD signature missing',
        amount: 0,
      },
    ],
  },
  {
    id: 'maya-taxable',
    householdId: 'h1',
    name: 'Individual brokerage',
    institution: 'Schwab',
    mask: '8822',
    type: 'brokerage',
    custody: 'managed',
    balance: 0,
    asOf: '2026-09-24',
    status: 'Open · ACAT not settled',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [],
    transactions: [
      {
        id: 'maya-tax-tx',
        date: '2026-09-12',
        type: 'Transfer',
        description: 'Account opened. No cash or securities posted.',
        amount: 0,
      },
    ],
  },
  {
    id: 'maya-fidelity-ira',
    householdId: 'h1',
    name: 'Rollover IRA',
    institution: 'Fidelity',
    mask: '3391',
    type: 'ira',
    custody: 'held-away',
    balance: 186000,
    asOf: '2026-09-22',
    status: 'Delivering account for ACAT #48291',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market', shares: 400, price: 280, value: 112000, assetClass: 'US equity' },
      { symbol: 'VXUS', name: 'Vanguard Total International', shares: 200, price: 65, value: 13000, assetClass: 'International' },
      { symbol: 'BND', name: 'Vanguard Total Bond', shares: 500, price: 74, value: 37000, assetClass: 'Fixed income' },
      cash(24000),
    ],
    transactions: [
      { id: 'mf1', date: '2026-09-15', type: 'Dividend', description: 'VTI dividend', amount: 312 },
      { id: 'mf2', date: '2026-08-28', type: 'Contribution', description: 'Payroll rollover residual', amount: 1500 },
      { id: 'mf3', date: '2026-09-18', type: 'Transfer', description: 'Outbound ACAT rejected by Schwab', amount: 0 },
    ],
  },
  {
    id: 'maya-fidelity-tax',
    householdId: 'h1',
    name: 'Brokerage',
    institution: 'Fidelity',
    mask: '3392',
    type: 'brokerage',
    custody: 'held-away',
    balance: 62000,
    asOf: '2026-09-22',
    status: 'Held away · not in the ACAT',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market', shares: 150, price: 280, value: 42000, assetClass: 'US equity' },
      cash(20000),
    ],
    transactions: [
      { id: 'mt1', date: '2026-09-02', type: 'Buy', description: 'Bought VTI', amount: -4200 },
      { id: 'mt2', date: '2026-07-14', type: 'Dividend', description: 'VTI dividend', amount: 86 },
    ],
  },
  {
    id: 'whit-trust',
    householdId: 'h2',
    name: 'Revocable trust',
    institution: 'Northern Trust',
    mask: '2204',
    type: 'trust',
    custody: 'held-away',
    balance: 4200000,
    asOf: '2026-09-20',
    status: 'Outside the firm · custodian not opened',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'SCHB', name: 'Schwab US Broad Market', shares: 8000, price: 210, value: 1680000, assetClass: 'US equity' },
      { symbol: 'EFA', name: 'iShares MSCI EAFE', shares: 6000, price: 82, value: 492000, assetClass: 'International' },
      { symbol: 'AGG', name: 'iShares Core US Aggregate', shares: 14000, price: 98, value: 1372000, assetClass: 'Fixed income' },
      { symbol: 'PRIV', name: 'Private credit fund', shares: 1, price: 420000, value: 420000, assetClass: 'Alternatives' },
      cash(236000),
    ],
    transactions: [
      { id: 'wt1', date: '2026-09-19', type: 'Fee', description: 'Trust administration fee', amount: -2400 },
      { id: 'wt2', date: '2026-09-01', type: 'Dividend', description: 'AGG distribution', amount: 4100 },
      { id: 'wt3', date: '2026-08-12', type: 'Sell', description: 'Sold SCHB', amount: 50000 },
    ],
  },
  {
    id: 'whit-holdco',
    householdId: 'h2',
    name: 'Holdco brokerage',
    institution: 'Goldman Sachs',
    mask: '7741',
    type: 'brokerage',
    custody: 'held-away',
    balance: 820000,
    asOf: '2026-09-20',
    status: 'Held away · entity account',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'QQQ', name: 'Invesco QQQ', shares: 900, price: 480, value: 432000, assetClass: 'US equity' },
      { symbol: 'MUB', name: 'iShares National Muni', shares: 2800, price: 107, value: 299600, assetClass: 'Fixed income' },
      cash(88400),
    ],
    transactions: [
      { id: 'wh1', date: '2026-09-08', type: 'Interest', description: 'Cash sweep interest', amount: 210 },
      { id: 'wh2', date: '2026-06-30', type: 'Buy', description: 'Bought MUB', amount: -25000 },
    ],
  },
  {
    id: 'whit-cash',
    householdId: 'h2',
    name: 'Private client checking',
    institution: 'JPMorgan',
    mask: '0194',
    type: 'checking',
    custody: 'held-away',
    balance: 180000,
    asOf: '2026-09-23',
    status: 'Operating cash · held away',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [cash(180000)],
    transactions: [
      { id: 'wc1', date: '2026-09-21', type: 'Transfer', description: 'Wire to counsel retainer', amount: -15000 },
      { id: 'wc2', date: '2026-09-11', type: 'Interest', description: 'Checking interest', amount: 42 },
    ],
  },
  {
    id: 'adams-ira',
    householdId: 'h3',
    name: 'Traditional IRA',
    institution: 'Schwab',
    mask: '5510',
    type: 'ira',
    custody: 'managed',
    balance: 2280000,
    asOf: '2026-09-24',
    status: 'Managed · funded',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market', shares: 3200, price: 280, value: 896000, assetClass: 'US equity' },
      { symbol: 'VXUS', name: 'Vanguard Total International', shares: 4200, price: 65, value: 273000, assetClass: 'International' },
      { symbol: 'BND', name: 'Vanguard Total Bond', shares: 9000, price: 74, value: 666000, assetClass: 'Fixed income' },
      { symbol: 'SCHD', name: 'Schwab US Dividend Equity', shares: 5000, price: 78, value: 390000, assetClass: 'US equity' },
      cash(55000),
    ],
    transactions: [
      { id: 'ai1', date: '2026-09-16', type: 'Dividend', description: 'SCHD dividend', amount: 1840 },
      { id: 'ai2', date: '2026-09-03', type: 'Fee', description: 'Advisory fee', amount: -1900 },
      { id: 'ai3', date: '2026-08-20', type: 'Buy', description: 'Bought BND', amount: -12000 },
    ],
  },
  {
    id: 'adams-joint',
    householdId: 'h3',
    name: 'Joint brokerage',
    institution: 'Schwab',
    mask: '5511',
    type: 'joint',
    custody: 'managed',
    balance: 1520000,
    asOf: '2026-09-24',
    status: 'Managed · funded',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market', shares: 2500, price: 280, value: 700000, assetClass: 'US equity' },
      { symbol: 'VXUS', name: 'Vanguard Total International', shares: 1800, price: 65, value: 117000, assetClass: 'International' },
      { symbol: 'VGIT', name: 'Vanguard Intermediate Treasury', shares: 8000, price: 58, value: 464000, assetClass: 'Fixed income' },
      cash(239000),
    ],
    transactions: [
      { id: 'aj1', date: '2026-09-18', type: 'Sell', description: 'Sold VTI for cash reserve', amount: 18000 },
      { id: 'aj2', date: '2026-09-04', type: 'Dividend', description: 'VTI dividend', amount: 960 },
      { id: 'aj3', date: '2026-08-01', type: 'Fee', description: 'Advisory fee', amount: -1260 },
    ],
  },
  {
    id: 'adams-401k',
    householdId: 'h3',
    name: 'Employer 401(k)',
    institution: 'Empower',
    mask: '7740',
    type: '401k',
    custody: 'held-away',
    balance: 410000,
    asOf: '2026-09-15',
    status: 'Held away · employer plan',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'FXAIX', name: 'Fidelity 500 Index', shares: 2100, price: 190, value: 399000, assetClass: 'US equity' },
      cash(11000),
    ],
    transactions: [
      { id: 'a41', date: '2026-09-15', type: 'Contribution', description: 'Employee deferral', amount: 1800 },
      { id: 'a42', date: '2026-09-15', type: 'Contribution', description: 'Employer match', amount: 900 },
    ],
  },
  {
    id: 'oko-ira',
    householdId: 'h4',
    name: 'IRA — decedent',
    institution: 'Schwab',
    mask: '9001',
    type: 'ira',
    custody: 'managed',
    balance: 740000,
    asOf: '2026-09-24',
    status: 'Frozen · estate retitle open',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'SPY', name: 'SPDR S&P 500', shares: 700, price: 560, value: 392000, assetClass: 'US equity' },
      { symbol: 'BND', name: 'Vanguard Total Bond', shares: 3000, price: 74, value: 222000, assetClass: 'Fixed income' },
      cash(126000),
    ],
    transactions: [
      { id: 'oi1', date: '2026-08-04', type: 'Transfer', description: 'Trading restricted after date of death', amount: 0 },
      { id: 'oi2', date: '2026-07-20', type: 'Dividend', description: 'SPY dividend', amount: 1100 },
    ],
  },
  {
    id: 'oko-tod',
    householdId: 'h4',
    name: 'TOD brokerage',
    institution: 'Schwab',
    mask: '9002',
    type: 'brokerage',
    custody: 'managed',
    balance: 360000,
    asOf: '2026-09-24',
    status: 'TOD claim in progress',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [
      { symbol: 'VTI', name: 'Vanguard Total Stock Market', shares: 900, price: 280, value: 252000, assetClass: 'US equity' },
      cash(108000),
    ],
    transactions: [
      { id: 'ot1', date: '2026-08-18', type: 'Transfer', description: 'TOD claim packet received', amount: 0 },
      { id: 'ot2', date: '2026-07-02', type: 'Dividend', description: 'VTI dividend', amount: 420 },
    ],
  },
  {
    id: 'oko-bank',
    householdId: 'h4',
    name: 'Estate checking',
    institution: 'Bank of America',
    mask: '4410',
    type: 'checking',
    custody: 'held-away',
    balance: 42000,
    asOf: '2026-09-21',
    status: 'Estate operating account',
    addedBy: 'book',
    review: 'clear',
    link: 'custodian',
    holdings: [cash(42000)],
    transactions: [
      { id: 'ob1', date: '2026-09-09', type: 'Fee', description: 'Funeral home — final invoice', amount: -8400 },
      { id: 'ob2', date: '2026-08-22', type: 'Transfer', description: 'Deposit from joint checking', amount: 20000 },
    ],
  },
]

export const plaidInstitutions: PlaidOffer[] = [
  {
    id: 'chase',
    institution: 'Chase',
    accounts: [
      {
        name: 'Total Checking',
        type: 'checking',
        balance: 18420,
        holdings: [cash(18420)],
        transactions: [
          { id: 'plaid-chase-1', date: '2026-09-20', type: 'Interest', description: 'Checking interest', amount: 3 },
          { id: 'plaid-chase-2', date: '2026-09-12', type: 'Transfer', description: 'Payroll deposit', amount: 4200 },
        ],
      },
    ],
  },
  {
    id: 'vanguard',
    institution: 'Vanguard',
    accounts: [
      {
        name: 'Brokerage',
        type: 'brokerage',
        balance: 96000,
        holdings: [
          { symbol: 'VTI', name: 'Vanguard Total Stock Market', shares: 250, price: 280, value: 70000, assetClass: 'US equity' },
          cash(26000),
        ],
        transactions: [
          { id: 'plaid-van-1', date: '2026-09-10', type: 'Dividend', description: 'VTI dividend', amount: 140 },
          { id: 'plaid-van-2', date: '2026-08-01', type: 'Contribution', description: 'Cash contribution', amount: 2000 },
        ],
      },
    ],
  },
  {
    id: 'bofa',
    institution: 'Bank of America',
    accounts: [
      {
        name: 'Advantage Savings',
        type: 'checking',
        balance: 27500,
        holdings: [cash(27500)],
        transactions: [{ id: 'plaid-boa-1', date: '2026-09-18', type: 'Interest', description: 'Savings interest', amount: 18 }],
      },
    ],
  },
  {
    id: 'empower',
    institution: 'Empower',
    accounts: [
      {
        name: '401(k)',
        type: '401k',
        balance: 128000,
        holdings: [
          { symbol: 'FXAIX', name: 'Fidelity 500 Index', shares: 600, price: 190, value: 114000, assetClass: 'US equity' },
          cash(14000),
        ],
        transactions: [{ id: 'plaid-emp-1', date: '2026-09-15', type: 'Contribution', description: 'Payroll deferral', amount: 900 }],
      },
    ],
  },
]

export function accountsFromPlaid(householdId: string, offer: PlaidOffer): FinancialAccount[] {
  const stamp = Date.now()
  return offer.accounts.map((account, index) => ({
    id: `plaid-${householdId}-${offer.id}-${stamp}-${index}`,
    householdId,
    name: account.name,
    institution: offer.institution,
    mask: String(1000 + Math.floor(Math.random() * 9000)),
    type: account.type,
    custody: 'held-away',
    balance: account.balance,
    asOf: '2026-09-24',
    status: 'Held away · linked by you',
    addedBy: 'client',
    review: 'pending',
    link: 'plaid',
    holdings: account.holdings,
    transactions: account.transactions.map((txn, txnIndex) => ({ ...txn, id: `${txn.id}-${stamp}-${txnIndex}` })),
  }))
}

export function accountFromManual(input: {
  householdId: string
  institution: string
  name: string
  type: AccountType
  balance: number
}): FinancialAccount {
  const stamp = Date.now()
  const holding: Position =
    input.type === 'checking'
      ? cash(input.balance)
      : {
          symbol: 'REPORTED',
          name: 'Client-reported position',
          shares: 1,
          price: input.balance,
          value: input.balance,
          assetClass: 'Client reported',
        }
  return {
    id: `manual-${input.householdId}-${stamp}`,
    householdId: input.householdId,
    name: input.name,
    institution: input.institution,
    mask: String(1000 + Math.floor(Math.random() * 9000)),
    type: input.type,
    custody: 'held-away',
    balance: input.balance,
    asOf: '2026-09-24',
    status: 'Held away · entered by you',
    addedBy: 'client',
    review: 'pending',
    link: 'manual',
    holdings: [holding],
    transactions: [
      {
        id: `manual-tx-${stamp}`,
        date: '2026-09-24',
        type: 'Transfer',
        description: 'Balance entered by the client',
        amount: input.balance,
      },
    ],
  }
}
