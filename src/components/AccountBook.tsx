import { useState } from 'react'
import { accountTotals, usd, type FinancialAccount } from '../data/accounts'

const TYPE_LABEL: Record<FinancialAccount['type'], string> = {
  brokerage: 'Brokerage',
  ira: 'IRA',
  roth: 'Roth IRA',
  '401k': '401(k)',
  trust: 'Trust',
  checking: 'Bank',
  joint: 'Joint',
}

export function AccountBook({ accounts }: { accounts: FinancialAccount[] }) {
  const [custody, setCustody] = useState<'all' | 'managed' | 'held-away'>('all')
  const [openId, setOpenId] = useState<string | null>(accounts[0]?.id ?? null)
  const totals = accountTotals(accounts)
  const visible = accounts.filter((account) => custody === 'all' || account.custody === custody)
  const open = visible.find((account) => account.id === openId) ?? visible[0] ?? null

  return (
    <div className="acct-book">
      <div className="acct-totals">
        <div>
          <span>Total balance</span>
          <strong>{usd(totals.total)}</strong>
        </div>
        <div>
          <span>Managed</span>
          <strong>{usd(totals.managed)}</strong>
        </div>
        <div>
          <span>Held-away</span>
          <strong>{usd(totals.heldAway)}</strong>
        </div>
      </div>
      <div className="acct-filters" role="tablist" aria-label="Account custody">
        {(
          [
            ['all', 'All'],
            ['managed', 'Managed'],
            ['held-away', 'Held-away'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={custody === id} className={custody === id ? 'active' : ''} onClick={() => setCustody(id)}>
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 && (
        <p className="muted">
          {custody === 'all' ? 'No accounts on file yet.' : `No ${custody === 'held-away' ? 'held-away' : 'managed'} accounts yet.`}
        </p>
      )}
      <ul className="acct-list">
        {visible.map((account) => (
          <li key={account.id}>
            <button
              type="button"
              className={`acct-card ${open?.id === account.id ? 'active' : ''}`}
              onClick={() => setOpenId(account.id)}
              aria-expanded={open?.id === account.id}
            >
              <span>
                <strong>
                  {account.institution} · {account.name}
                </strong>
                <em>
                  ···{account.mask} · {TYPE_LABEL[account.type]} · {account.custody === 'managed' ? 'Managed' : 'Held-away'}
                </em>
              </span>
              <span className="acct-card-side">
                {account.review === 'pending' && <b>Advisor review</b>}
                <strong>{usd(account.balance)}</strong>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div className="acct-detail">
          <header>
            <div>
              <h3>
                {open.institution} {open.name} ···{open.mask}
              </h3>
              <p>
                {open.status} · as of {open.asOf}
                {open.addedBy === 'client' ? ` · added by the client via ${open.link === 'plaid' ? 'Plaid' : 'manual entry'}` : ''}
              </p>
            </div>
            <strong>{usd(open.balance)}</strong>
          </header>
          <h4>Holdings</h4>
          {open.holdings.length === 0 ? (
            <p className="muted">No positions posted. The account is open and waiting on funding.</p>
          ) : (
            <table className="acct-table">
              <caption>Holdings in {open.institution} ···{open.mask}</caption>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Shares</th>
                  <th>Price</th>
                  <th>Value</th>
                  <th>Asset class</th>
                </tr>
              </thead>
              <tbody>
                {open.holdings.map((position) => (
                  <tr key={`${open.id}-${position.symbol}`}>
                    <td>{position.symbol}</td>
                    <td>{position.name}</td>
                    <td>{position.shares.toLocaleString()}</td>
                    <td>{usd(position.price, position.price % 1 === 0 ? 0 : 2)}</td>
                    <td>{usd(position.value)}</td>
                    <td>{position.assetClass}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h4>Transactions</h4>
          {open.transactions.length === 0 ? (
            <p className="muted">No transactions yet.</p>
          ) : (
            <table className="acct-table">
              <caption>Transactions in {open.institution} ···{open.mask}</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {open.transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{txn.date}</td>
                    <td>{txn.type}</td>
                    <td>{txn.description}</td>
                    <td>{usd(txn.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
