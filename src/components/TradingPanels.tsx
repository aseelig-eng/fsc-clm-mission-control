import { useState } from 'react'
import { accountBalance, usd, type FinancialAccount } from '../data/accounts'
import { driftRows, needsRebalance, type TradeTicket } from '../data/trading'
import { MODELS } from '../data/models'

const pct = (n: number) => `${(n * 100).toFixed(0)}%`

/** Order ticket: buys and sells per account with tax impact and compliance checks. */
function TicketView({
  canApprove = true,
  ticket,
  onApprove,
  onReject,
}: {
  canApprove?: boolean
  ticket: TradeTicket
  onApprove: () => void
  onReject: () => void
}) {
  const [ack, setAck] = useState(false)
  const needsAck = ticket.warnings.length > 0
  const accountsInTicket = [...new Set(ticket.orders.map((o) => o.accountLabel))]
  return (
    <div className={`trade-ticket st-${ticket.status}`}>
      <div className="trade-ticket-head">
        <div>
          <strong>Rebalance ticket</strong>
          <span className="muted"> · {ticket.reason}</span>
        </div>
        <span className={`badge ${ticket.status === 'filled' ? 'done' : ticket.status === 'working' ? 'running' : ticket.status === 'rejected' ? 'low' : 'needs'}`}>
          {ticket.status === 'proposed' ? 'Awaiting your approval' : ticket.status === 'working' ? 'Sent to custodian · working' : ticket.status === 'filled' ? 'Filled' : 'Discarded'}
        </span>
      </div>
      <div className="trade-ticket-sum">
        <span>
          Equity {pct(ticket.equityBefore)} → <strong>{pct(ticket.equityAfter)}</strong> (target {pct(ticket.equityTarget)})
        </span>
        <span>
          Estimated tax on realized gains: <strong>{usd(ticket.netTax)}</strong>
        </span>
      </div>
      {accountsInTicket.map((label) => (
        <table key={label} className="plan-table trade-table">
          <caption>{label}</caption>
          <thead>
            <tr>
              <th>Side</th>
              <th>Security</th>
              <th>Shares</th>
              <th>Amount</th>
              <th>Gain/loss</th>
              <th>Est. tax</th>
            </tr>
          </thead>
          <tbody>
            {ticket.orders
              .filter((o) => o.accountLabel === label)
              .map((o) => (
                <tr key={o.id} className={o.warning ? 'warn' : ''}>
                  <td className={o.side === 'Buy' ? 'up' : 'down'}>{o.side}</td>
                  <td>
                    {o.symbol} <span className="muted">{o.name}</span>
                  </td>
                  <td>{o.shares.toLocaleString()}</td>
                  <td>{usd(o.amount)}</td>
                  <td>{o.side === 'Sell' ? (o.taxable ? usd(o.realizedGain) : 'Tax-sheltered') : ''}</td>
                  <td>{o.estTax ? usd(o.estTax) : ''}</td>
                </tr>
              ))}
          </tbody>
        </table>
      ))}
      <div className="trade-checks">
        <div className="ok">✓ Suitability: moves toward the IPS target</div>
        <div className="ok">✓ Trading authority: discretionary, advisor-approved</div>
        {ticket.blocked.length === 0 ? (
          <div className="ok">✓ Restricted list: no conflicts</div>
        ) : (
          ticket.blocked.map((b) => (
            <div key={b.symbol + b.accountLabel} className="block">
              ✕ {b.symbol} excluded ({b.accountLabel}): {b.reason}
            </div>
          ))
        )}
        {ticket.warnings.length === 0 ? (
          <div className="ok">✓ Wash-sale lookback: clear</div>
        ) : (
          ticket.warnings.map((w) => (
            <div key={w} className="warn">
              ! {w}
            </div>
          ))
        )}
      </div>
      {ticket.status === 'proposed' && (
        <div className="trade-actions">
          {needsAck && (
            <label>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have reviewed the wash-sale warning
            </label>
          )}
          <button type="button" className="btn sm" onClick={onReject}>
            Discard
          </button>
          <button type="button" className="btn primary sm" disabled={(needsAck && !ack) || !canApprove} onClick={onApprove}>
            Approve &amp; send to custodian
          </button>
          {!canApprove && <span className="muted">Complete the Trading platform certification (Book → My learning) first.</span>}
        </div>
      )}
    </div>
  )
}

/** Record → Accounts: drift per account and the household's trade tickets. */
export function TradingPanel({
  accounts,
  tickets,
  targetFor,
  programModel,
  onPropose,
  onApprove,
  onReject,
  canApprove = true,
}: {
  accounts: FinancialAccount[]
  tickets: TradeTicket[]
  targetFor: (account: FinancialAccount) => number | null
  programModel: (accountId: string) => string | undefined
  onPropose: () => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
  canApprove?: boolean
}) {
  const rows = driftRows(accounts, targetFor)
  const open = tickets.find((t) => t.status === 'proposed' || t.status === 'working')
  const done = tickets.filter((t) => t.status === 'filled').slice(0, 2)
  return (
    <div className="trade-panel">
      <table className="plan-table trade-drift">
        <thead>
          <tr>
            <th>Account</th>
            <th>Value</th>
            <th>Equity now</th>
            <th>Target</th>
            <th>Drift</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.account.id}>
              <td>
                {row.account.institution} {row.account.name} ···{row.account.mask}
                {programModel(row.account.id) && <em className="perf-away"> · {programModel(row.account.id)}</em>}
              </td>
              <td>{usd(accountBalance(row.account))}</td>
              <td>{pct(row.equityPct)}</td>
              <td>{row.tradable ? pct(row.targetPct) : '—'}</td>
              <td className={needsRebalance(row) ? 'down' : ''}>{row.tradable ? `${row.drift > 0 ? '+' : ''}${(row.drift * 100).toFixed(1)} pts` : ''}</td>
              <td className="muted">{row.reason ?? (needsRebalance(row) ? 'Outside tolerance' : 'In tolerance')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!open && (
        <button type="button" className="btn primary sm" disabled={!rows.some(needsRebalance)} onClick={onPropose}>
          Draft rebalance ticket
        </button>
      )}
      {open && <TicketView canApprove={canApprove} ticket={open} onApprove={() => onApprove(open.id)} onReject={() => onReject(open.id)} />}
      {done.map((t) => (
        <TicketView key={t.id} ticket={t} onApprove={() => {}} onReject={() => {}} />
      ))}
    </div>
  )
}

/** Book → block rebalance across every household. */
export function BookTradingPanel({
  rows,
  onPropose,
  onProposeAll,
  onOpen,
}: {
  rows: { householdId: string; name: string; tradable: number; drifted: number; maxDrift: number; ticket?: TradeTicket }[]
  onPropose: (householdId: string) => void
  onProposeAll: () => void
  onOpen: (householdId: string) => void
}) {
  const pending = rows.filter((r) => r.ticket?.status === 'proposed').length
  return (
    <div className="panel">
      <div className="panel-header">
        <span>Trading · book rebalance</span>
        <span className="panel-header-tail">
          <span className="muted">{pending} ticket{pending === 1 ? '' : 's'} awaiting approval</span>
          <button type="button" className="btn primary sm" onClick={onProposeAll}>
            Draft rebalance for all drifted
          </button>
        </span>
      </div>
      <div className="panel-body">
        <table className="plan-table trade-drift">
          <thead>
            <tr>
              <th>Household</th>
              <th>Tradable accounts</th>
              <th>Outside tolerance</th>
              <th>Largest drift</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.householdId}>
                <td>{r.name}</td>
                <td>{r.tradable}</td>
                <td className={r.drifted > 0 ? 'down' : ''}>{r.drifted}</td>
                <td>{r.tradable > 0 ? `${(r.maxDrift * 100).toFixed(1)} pts` : '—'}</td>
                <td className="muted">
                  {r.ticket?.status === 'proposed'
                    ? 'Ticket awaiting approval'
                    : r.ticket?.status === 'working'
                      ? 'Working at custodian'
                      : r.ticket?.status === 'filled'
                        ? 'Filled'
                        : r.tradable === 0
                          ? 'No tradable accounts (held away or frozen)'
                          : r.drifted === 0
                            ? 'In tolerance'
                            : 'Drifted'}
                </td>
                <td>
                  {r.ticket?.status === 'proposed' ? (
                    <button type="button" className="btn sm" onClick={() => onOpen(r.householdId)}>
                      Review
                    </button>
                  ) : (
                    r.drifted > 0 && (
                      <button type="button" className="btn sm" onClick={() => onPropose(r.householdId)}>
                        Draft ticket
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const modelName = (id: string) => MODELS.find((m) => m.id === id)?.name
