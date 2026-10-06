// Trading (#9). Turns portfolio drift into a reviewable order ticket:
// buys and sells per managed account, estimated tax on realized gains,
// wash-sale and restricted-list checks. The advisor approves, the ticket goes
// to the custodian, and fills post back to holdings and the ledger.

import type { FinancialAccount, LedgerTxn, Position } from './accounts'
import { accountBalance } from './accounts'

export const TRADE_DATE = '2026-10-06'
const LTCG_RATE = 0.188 // 15% + 3.8% NIIT
const DRIFT_THRESHOLD = 0.03

export const RESTRICTED: Record<string, string> = {
  QQQ: 'Firm restricted list: pending research review',
  PRIV: 'Illiquid fund: no secondary trading',
}

/** Reference prices for symbols we may need to buy that the account does not hold yet. */
const UNIVERSE: Record<string, { name: string; price: number; assetClass: string }> = {
  VTI: { name: 'Vanguard Total Stock Market', price: 280, assetClass: 'US equity' },
  VXUS: { name: 'Vanguard Total International', price: 65, assetClass: 'International' },
  BND: { name: 'Vanguard Total Bond', price: 74, assetClass: 'Fixed income' },
}

const BASIS_OVERRIDE: Record<string, number> = {
  // A position bought above today's price: selling it books a loss.
  'maya-taxable:VTI': 1.07,
}

export type OrderSide = 'Buy' | 'Sell'

export interface TradeOrder {
  id: string
  accountId: string
  accountLabel: string
  side: OrderSide
  symbol: string
  name: string
  assetClass: string
  shares: number
  price: number
  amount: number
  taxable: boolean
  realizedGain: number
  estTax: number
  warning?: string
}

export type TicketStatus = 'proposed' | 'working' | 'filled' | 'rejected'

export interface TradeTicket {
  id: string
  householdId: string
  status: TicketStatus
  createdAt: string
  reason: string
  orders: TradeOrder[]
  blocked: { symbol: string; accountLabel: string; reason: string }[]
  warnings: string[]
  netTax: number
  equityBefore: number
  equityAfter: number
  equityTarget: number
  filledAt?: string
}

export interface DriftRow {
  account: FinancialAccount
  tradable: boolean
  reason?: string
  equityPct: number
  targetPct: number
  drift: number
}

const isEquity = (p: Position) => p.assetClass === 'US equity' || p.assetClass === 'International'
const isFixed = (p: Position) => p.assetClass === 'Fixed income'
const isTaxable = (a: FinancialAccount) => a.type === 'brokerage' || a.type === 'joint' || a.type === 'trust'

function hash(text: string) {
  let h = 7
  for (const ch of text) h = (h * 33 + ch.charCodeAt(0)) % 100000
  return h
}

/** Synthetic cost basis as a fraction of current value (1 = no gain). */
export function basisFactor(account: FinancialAccount, position: Position) {
  const key = `${account.id}:${position.symbol}`
  if (BASIS_OVERRIDE[key] != null) return BASIS_OVERRIDE[key]
  if (position.assetClass === 'Fixed income' || position.assetClass === 'Cash') return 0.97
  return 0.55 + (hash(key) % 40) / 100 // 0.55–0.94: embedded gain
}

export function tradabilityOf(account: FinancialAccount): { ok: boolean; reason?: string } {
  if (account.custody !== 'managed') return { ok: false, reason: 'Held away: cannot trade here' }
  if (/frozen/i.test(account.status)) return { ok: false, reason: 'Frozen pending estate retitle' }
  if (/tod claim/i.test(account.status)) return { ok: false, reason: 'TOD claim in progress' }
  if (account.holdings.length === 0) return { ok: false, reason: 'No holdings' }
  return { ok: true }
}

export function driftRows(accounts: FinancialAccount[], targetFor: (account: FinancialAccount) => number | null): DriftRow[] {
  return accounts.map((account) => {
    const total = accountBalance(account)
    const equity = account.holdings.filter(isEquity).reduce((s, p) => s + p.value, 0)
    const equityPct = total > 0 ? equity / total : 0
    const target = targetFor(account)
    const { ok, reason } = tradabilityOf(account)
    return {
      account,
      tradable: ok && target != null,
      reason: ok ? (target == null ? 'No IPS target set' : undefined) : reason,
      equityPct,
      targetPct: target != null ? target / 100 : 0,
      drift: target != null ? equityPct - target / 100 : 0,
    }
  })
}

export function needsRebalance(row: DriftRow) {
  return row.tradable && Math.abs(row.drift) >= DRIFT_THRESHOLD
}

function recentBuys(accounts: FinancialAccount[], symbol: string) {
  const cutoff = new Date(TRADE_DATE).getTime() - 30 * 86400000
  return accounts.some((account) =>
    account.transactions.some(
      (txn) => txn.type === 'Buy' && txn.description.includes(symbol) && new Date(txn.date).getTime() >= cutoff,
    ),
  )
}

let orderSeq = 0
const nextOrderId = () => `ord-${Date.now()}-${orderSeq++}`

/**
 * Build a rebalance ticket for one household's tradable accounts.
 * `householdAccounts` is every account in the household (used for wash-sale lookback).
 */
export function buildRebalance(
  householdId: string,
  householdAccounts: FinancialAccount[],
  targetFor: (account: FinancialAccount) => number | null,
  reason: string,
): TradeTicket | null {
  const rows = driftRows(householdAccounts, targetFor).filter(needsRebalance)
  if (rows.length === 0) return null
  const orders: TradeOrder[] = []
  const blocked: TradeTicket['blocked'] = []
  const warnings: string[] = []
  let beforeEq = 0
  let afterEq = 0
  let total = 0

  for (const row of rows) {
    const { account } = row
    const value = accountBalance(account)
    const label = `${account.institution} ${account.name} ···${account.mask}`
    const targetEq = row.targetPct * value
    const equityNow = account.holdings.filter(isEquity).reduce((s, p) => s + p.value, 0)
    let delta = targetEq - equityNow // + buy equity, - sell equity
    beforeEq += equityNow
    total += value
    const taxable = isTaxable(account)

    const make = (position: Position | { symbol: string; name: string; price: number; assetClass: string }, side: OrderSide, amount: number) => {
      const shares = Math.floor(amount / position.price)
      if (shares <= 0) return 0
      const value$ = shares * position.price
      if (RESTRICTED[position.symbol]) {
        blocked.push({ symbol: position.symbol, accountLabel: label, reason: RESTRICTED[position.symbol] })
        return 0
      }
      let gain = 0
      let tax = 0
      let warning: string | undefined
      if (side === 'Sell' && 'shares' in position) {
        const f = basisFactor(account, position as Position)
        gain = Math.round(value$ * (1 - f))
        if (taxable) {
          tax = Math.round(gain * LTCG_RATE)
          if (gain < 0 && recentBuys(householdAccounts, position.symbol)) {
            warning = `Wash-sale risk: ${position.symbol} was bought in the last 30 days. The ${Math.abs(gain).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} loss may be disallowed.`
            warnings.push(`${label}: ${warning}`)
          }
        }
      }
      orders.push({
        id: nextOrderId(),
        accountId: account.id,
        accountLabel: label,
        side,
        symbol: position.symbol,
        name: position.name,
        assetClass: position.assetClass,
        shares,
        price: position.price,
        amount: value$,
        taxable,
        realizedGain: taxable && side === 'Sell' ? gain : 0,
        estTax: taxable && side === 'Sell' ? tax : 0,
        warning,
      })
      return value$
    }

    const equities = account.holdings.filter(isEquity)
    const fixed = account.holdings.filter(isFixed)
    const cash = account.holdings.find((p) => p.assetClass === 'Cash')
    let movedEq = 0

    if (delta < 0) {
      // Sell equity pro rata, buy the fixed-income core.
      const sellTotal = -delta
      const base = equities.reduce((s, p) => s + p.value, 0)
      let proceeds = 0
      for (const p of equities) proceeds += make(p, 'Sell', (sellTotal * p.value) / base)
      movedEq = -proceeds
      const bond = fixed.sort((a, b) => b.value - a.value)[0] ?? { symbol: 'BND', ...UNIVERSE.BND }
      if (proceeds > 0) make(bond, 'Buy', proceeds)
    } else {
      // Fund equity purchases from fixed income first, then excess cash (keep 2%).
      let need = delta
      let funded = 0
      const base = fixed.reduce((s, p) => s + p.value, 0)
      for (const p of fixed) {
        const take = Math.min((need * p.value) / (base || 1), p.value * 0.9)
        funded += make(p, 'Sell', take)
      }
      const spareCash = Math.max(0, (cash?.value ?? 0) - value * 0.02)
      const fromCash = Math.min(Math.max(0, need - funded), spareCash)
      funded += fromCash
      const mix = equities.length > 0 ? equities : [{ symbol: 'VTI', ...UNIVERSE.VTI }, { symbol: 'VXUS', ...UNIVERSE.VXUS }]
      const weights = equities.length > 0 ? equities.map((p) => p.value) : [0.72, 0.28]
      const wsum = weights.reduce((s, w) => s + w, 0)
      let bought = 0
      mix.forEach((p, i) => (bought += make(p, 'Buy', (funded * weights[i]) / wsum)))
      movedEq = bought
    }
    afterEq += equityNow + movedEq
  }
  if (orders.length === 0 && blocked.length === 0) return null
  const netTax = orders.reduce((s, o) => s + o.estTax, 0)
  return {
    id: `tk-${householdId}-${Date.now()}`,
    householdId,
    status: 'proposed',
    createdAt: TRADE_DATE,
    reason,
    orders,
    blocked,
    warnings,
    netTax,
    equityBefore: total > 0 ? beforeEq / total : 0,
    equityAfter: total > 0 ? afterEq / total : 0,
    equityTarget: rows.reduce((s, r) => s + r.targetPct * accountBalance(r.account), 0) / (total || 1),
  }
}

/** Post a filled ticket to holdings and the ledger. */
export function applyTicket(accounts: FinancialAccount[], ticket: TradeTicket): FinancialAccount[] {
  return accounts.map((account) => {
    const mine = ticket.orders.filter((o) => o.accountId === account.id)
    if (mine.length === 0) return account
    let holdings = account.holdings.map((p) => ({ ...p }))
    const txns: LedgerTxn[] = []
    for (const order of mine) {
      const sign = order.side === 'Buy' ? 1 : -1
      let pos = holdings.find((p) => p.symbol === order.symbol)
      if (!pos) {
        pos = { symbol: order.symbol, name: order.name, shares: 0, price: order.price, value: 0, assetClass: order.assetClass }
        holdings.push(pos)
      }
      pos.shares += sign * order.shares
      pos.value = Math.round(pos.shares * pos.price)
      const cash = holdings.find((p) => p.symbol === 'CASH')
      if (cash) {
        cash.shares -= sign * order.amount
        cash.value = Math.round(cash.shares)
      }
      txns.push({
        id: `${order.id}-fill`,
        date: TRADE_DATE,
        type: order.side,
        description: `${order.side === 'Buy' ? 'Bought' : 'Sold'} ${order.symbol} (rebalance)`,
        amount: -sign * order.amount,
      })
    }
    holdings = holdings.filter((p) => p.shares > 0.0001 || p.symbol === 'CASH')
    return { ...account, holdings, transactions: [...account.transactions, ...txns] }
  })
}
