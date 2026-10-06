// Phase 2 state: trade tickets, model programs, fee agreements and invoices.

import { useCallback, useEffect, useRef, useState } from 'react'
import { accountBalance, usd, type FinancialAccount } from './data/accounts'
import type { PortfolioState } from './data/advice'
import { applyTicket, buildRebalance, type TradeTicket } from './data/trading'
import { MODELS, type Program } from './data/models'
import {
  aumQuarterlyFee,
  ENGAGEMENT_LABEL,
  initialAgreements,
  initialInvoices,
  newId,
  type EngagementType,
  type FeeAgreement,
  type Invoice,
} from './data/billing'

const TODAY = '2026-10-06'
const addDays = (date: string, days: number) => new Date(new Date(date).getTime() + days * 86400000).toISOString().slice(0, 10)

export function useTransactions(deps: {
  accounts: FinancialAccount[]
  setAccounts: (updater: (prev: FinancialAccount[]) => FinancialAccount[]) => void
  portfolios: Record<string, PortfolioState>
  households: { id: string; name: string }[]
  flash: (message: string) => void
}) {
  const { accounts, setAccounts, portfolios, households, flash } = deps
  const [tickets, setTickets] = useState<TradeTicket[]>([])
  const [programs, setPrograms] = useState<Record<string, Program>>({})
  const [agreements, setAgreements] = useState<FeeAgreement[]>(() => structuredClone(initialAgreements))
  const [invoices, setInvoices] = useState<Invoice[]>(() => structuredClone(initialInvoices))

  const live = useRef({ accounts, programs, portfolios, tickets })
  useEffect(() => {
    live.current = { accounts, programs, portfolios, tickets }
  })
  const nameOf = (id: string) => households.find((h) => h.id === id)?.name ?? 'Household'

  const targetFor = useCallback((account: FinancialAccount) => {
    const { programs: p, portfolios: pf } = live.current
    const program = p[account.id]
    if (program) return MODELS.find((m) => m.id === program.modelId)?.equityPct ?? null
    return pf[account.householdId]?.targetEquity ?? null
  }, [])

  // ── Trading ─────────────────────────────────────────────────────────────
  const proposeRebalance = useCallback(
    (householdId: string, reason = 'Drift from the IPS target', quiet = false) => {
      const mine = live.current.accounts.filter((a) => a.householdId === householdId)
      const ticket = buildRebalance(householdId, mine, targetFor, reason)
      if (!ticket) {
        if (!quiet) flash(`${nameOf(householdId)} is within tolerance, or has no tradable accounts. No ticket created.`)
        return null
      }
      setTickets((prev) => [ticket, ...prev.filter((t) => !(t.householdId === householdId && t.status === 'proposed'))])
      if (!quiet) flash(`Trade ticket drafted for ${nameOf(householdId)}: ${ticket.orders.length} orders.`)
      return ticket
    },
    [flash, households, targetFor],
  )

  const proposeBook = useCallback(() => {
    let created = 0
    for (const h of households) {
      if (h.id === 'h0') continue
      if (proposeRebalance(h.id, 'Book-level rebalance to IPS targets', true)) created++
    }
    flash(created > 0 ? `Book rebalance drafted: ${created} household ticket${created === 1 ? '' : 's'} are waiting for your approval.` : 'Every household is inside tolerance.')
  }, [households, proposeRebalance, flash])

  const approveTicket = useCallback(
    (ticketId: string) => {
      const ticket = live.current.tickets.find((t) => t.id === ticketId)
      if (!ticket || ticket.status !== 'proposed') return
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: 'working' } : t)))
      flash(`${ticket.orders.length} orders sent to the custodian for ${nameOf(ticket.householdId)}.`)
      window.setTimeout(() => {
        setAccounts((prev) => applyTicket(prev, ticket))
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: 'filled', filledAt: TODAY } : t)))
        flash(`Fills received for ${nameOf(ticket.householdId)}. Holdings and ledger updated.`)
      }, 2500)
    },
    [flash, setAccounts, households],
  )

  const rejectTicket = useCallback(
    (ticketId: string) => {
      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: 'rejected' } : t)))
      flash('Ticket discarded.')
    },
    [flash],
  )

  // ── Model programs ──────────────────────────────────────────────────────
  const assignModel = useCallback(
    (account: FinancialAccount, modelId: string) => {
      const model = MODELS.find((m) => m.id === modelId)
      if (!model) return
      live.current.programs = { ...live.current.programs, [account.id]: { modelId, assignedOn: TODAY } }
      setPrograms((prev) => ({ ...prev, [account.id]: { modelId, assignedOn: TODAY } }))
      const ticket = proposeRebalance(account.householdId, `Moved to ${model.name} (${model.strategist})`, true)
      flash(
        `${account.institution} ···${account.mask} assigned to ${model.name}.${ticket ? ' A rebalance ticket to the model is waiting for approval.' : ' Already at the model’s target.'}`,
      )
    },
    [flash, proposeRebalance],
  )

  const removeModel = useCallback(
    (accountId: string) => {
      setPrograms((prev) => {
        const next = { ...prev }
        delete next[accountId]
        return next
      })
      flash('Account removed from the program and back on the IPS target.')
    },
    [flash],
  )

  // ── Fee for service ─────────────────────────────────────────────────────
  const createAgreement = useCallback(
    (householdId: string, type: EngagementType, amount: number) => {
      setAgreements((prev) => [
        ...prev,
        { id: newId('fa'), householdId, type, amount, hours: type === 'hourly' ? 0 : undefined, status: 'awaiting_signature', createdOn: TODAY },
      ])
      flash(`${ENGAGEMENT_LABEL[type]} agreement sent to ${nameOf(householdId)} for e-signature.`)
    },
    [flash, households],
  )

  const signAgreement = useCallback(
    (agreementId: string) => {
      setAgreements((prev) => prev.map((a) => (a.id === agreementId ? { ...a, status: 'active', signedOn: TODAY } : a)))
      flash('Fee agreement signed. Your advisor can now bill under it.')
    },
    [flash],
  )

  const logHours = useCallback((agreementId: string, hours: number) => {
    setAgreements((prev) => prev.map((a) => (a.id === agreementId ? { ...a, hours } : a)))
  }, [])

  const generateInvoices = useCallback(
    (householdId: string) => {
      const { accounts: accts } = live.current
      const aum = accts.filter((a) => a.householdId === householdId && a.custody === 'managed').reduce((s, a) => s + accountBalance(a), 0)
      const made: Invoice[] = []
      for (const agreement of agreements.filter((a) => a.householdId === householdId && a.status === 'active')) {
        const exists = (period: string) => invoices.some((i) => i.agreementId === agreement.id && i.period === period)
        let invoice: Invoice | null = null
        if (agreement.type === 'aum' && aum > 0 && !exists('Q4 2026')) {
          invoice = { id: newId('inv'), householdId, agreementId: agreement.id, type: 'aum', period: 'Q4 2026', amount: aumQuarterlyFee(aum), basis: `Tiered AUM fee on ${usd(aum)} managed assets`, status: 'draft' }
        } else if (agreement.type === 'planning' && !exists('2026 plan update (2nd)') && invoices.some((i) => i.agreementId === agreement.id && i.status === 'paid')) {
          invoice = { id: newId('inv'), householdId, agreementId: agreement.id, type: 'planning', period: '2026 plan update (2nd)', amount: agreement.amount, basis: 'Flat planning fee', status: 'draft' }
        } else if (agreement.type === 'subscription' && !exists('Oct 2026')) {
          invoice = { id: newId('inv'), householdId, agreementId: agreement.id, type: 'subscription', period: 'Oct 2026', amount: agreement.amount, basis: 'Monthly planning subscription', status: 'draft' }
        } else if (agreement.type === 'hourly' && (agreement.hours ?? 0) > 0 && !exists(`Oct 2026 · ${agreement.hours}h`)) {
          invoice = { id: newId('inv'), householdId, agreementId: agreement.id, type: 'hourly', period: `Oct 2026 · ${agreement.hours}h`, amount: Math.round((agreement.hours ?? 0) * agreement.amount), basis: `${agreement.hours} hours at ${usd(agreement.amount)}/hr`, status: 'draft' }
        } else if (agreement.type === 'planning' && !invoices.some((i) => i.agreementId === agreement.id)) {
          invoice = { id: newId('inv'), householdId, agreementId: agreement.id, type: 'planning', period: 'Planning engagement', amount: agreement.amount, basis: 'Flat planning fee', status: 'draft' }
        }
        if (invoice) made.push(invoice)
      }
      if (made.length === 0) {
        flash('Nothing new to bill for this household right now.')
        return
      }
      setInvoices((prev) => [...prev, ...made])
      flash(`${made.length} draft invoice${made.length === 1 ? '' : 's'} created for ${nameOf(householdId)}.`)
    },
    [agreements, invoices, flash, households],
  )

  const sendInvoice = useCallback(
    (invoiceId: string) => {
      setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? { ...i, status: 'sent', issued: TODAY, due: addDays(TODAY, 30) } : i)))
      flash('Invoice sent to the client portal.')
    },
    [flash],
  )

  const payInvoice = useCallback(
    (invoiceId: string) => {
      setInvoices((prev) => prev.map((i) => (i.id === invoiceId ? { ...i, status: 'paid', paidOn: TODAY } : i)))
      flash('Payment received. Thank you.')
    },
    [flash],
  )

  return {
    tickets,
    proposeRebalance,
    proposeBook,
    approveTicket,
    rejectTicket,
    programs,
    assignModel,
    removeModel,
    targetFor,
    agreements,
    invoices,
    createAgreement,
    signAgreement,
    logHours,
    generateInvoices,
    sendInvoice,
    payInvoice,
  }
}
