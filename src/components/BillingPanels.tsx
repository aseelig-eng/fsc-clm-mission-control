import { useState } from 'react'
import { usd } from '../data/accounts'
import { aumQuarterlyFee, AUM_TIERS, ENGAGEMENT_LABEL, isOverdue, type EngagementType, type FeeAgreement, type Invoice } from '../data/billing'

const statusBadge = (i: Invoice) => (isOverdue(i) ? 'critical' : i.status === 'paid' ? 'done' : i.status === 'sent' ? 'needs' : 'medium')
const statusText = (i: Invoice) => (isOverdue(i) ? 'Overdue' : i.status === 'paid' ? 'Paid' : i.status === 'sent' ? 'Sent' : 'Draft')

/** Record → Accounts: engagements, invoices and the fee schedule. */
export function BillingPanel({
  aum,
  agreements,
  invoices,
  onCreate,
  onHours,
  onGenerate,
  onSend,
}: {
  aum: number
  agreements: FeeAgreement[]
  invoices: Invoice[]
  onCreate: (type: EngagementType, amount: number) => void
  onHours: (agreementId: string, hours: number) => void
  onGenerate: () => void
  onSend: (invoiceId: string) => void
}) {
  const [type, setType] = useState<EngagementType>('planning')
  const [amount, setAmount] = useState('')
  const needsAmount = type !== 'aum'
  return (
    <div className="billing">
      <div className="billing-cols">
        <section>
          <h5>Engagements</h5>
          {agreements.length === 0 && <p className="muted">No fee agreement yet.</p>}
          <ul className="bill-list">
            {agreements.map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{ENGAGEMENT_LABEL[a.type]}</strong>
                  <div className="muted">
                    {a.type === 'aum'
                      ? `Tiered ${AUM_TIERS.map((t) => t.bps).join(' / ')} bps · ${usd(aumQuarterlyFee(aum))}/qtr on ${usd(aum)} managed`
                      : a.type === 'hourly'
                        ? `${usd(a.amount)}/hr`
                        : a.type === 'subscription'
                          ? `${usd(a.amount)}/month`
                          : `${usd(a.amount)} flat`}
                  </div>
                </div>
                <div className="bill-right">
                  <span className={`badge ${a.status === 'active' ? 'done' : 'needs'}`}>{a.status === 'active' ? `Signed ${a.signedOn}` : 'Awaiting client e-sign'}</span>
                  {a.type === 'hourly' && a.status === 'active' && (
                    <label className="muted">
                      Hours{' '}
                      <input type="number" min={0} step={0.5} value={a.hours ?? 0} onChange={(e) => onHours(a.id, Math.max(0, Number(e.target.value)))} className="bill-hours" />
                    </label>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <form
            className="bill-new"
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(amount.replace(/[^0-9.]/g, ''))
              if (needsAmount && !(n > 0)) return
              onCreate(type, needsAmount ? n : 0)
              setAmount('')
            }}
          >
            <select value={type} onChange={(e) => setType(e.target.value as EngagementType)} aria-label="Engagement type">
              {(Object.keys(ENGAGEMENT_LABEL) as EngagementType[]).map((t) => (
                <option key={t} value={t}>
                  {ENGAGEMENT_LABEL[t]}
                </option>
              ))}
            </select>
            {needsAmount && (
              <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" aria-label="Amount" placeholder={type === 'hourly' ? 'Rate per hour' : type === 'subscription' ? 'Per month' : 'Flat fee'} />
            )}
            <button type="submit" className="btn sm">
              Send for e-signature
            </button>
          </form>
        </section>
        <section>
          <div className="bill-head">
            <h5>Invoices</h5>
            <button type="button" className="btn primary sm" onClick={onGenerate}>
              Generate invoices
            </button>
          </div>
          {invoices.length === 0 && <p className="muted">Nothing billed yet.</p>}
          <ul className="bill-list">
            {invoices.map((i) => (
              <li key={i.id}>
                <div>
                  <strong>
                    {usd(i.amount)} · {i.period}
                  </strong>
                  <div className="muted">
                    {ENGAGEMENT_LABEL[i.type]} · {i.basis}
                    {i.due ? ` · due ${i.due}` : ''}
                    {i.paidOn ? ` · paid ${i.paidOn}` : ''}
                  </div>
                </div>
                <div className="bill-right">
                  <span className={`badge ${statusBadge(i)}`}>{statusText(i)}</span>
                  {i.status === 'draft' && (
                    <button type="button" className="btn sm" onClick={() => onSend(i.id)}>
                      Send to client
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

/** Portal → Fees: sign agreements, pay invoices. */
export function PortalFees({
  agreements,
  invoices,
  onSign,
  onPay,
}: {
  agreements: FeeAgreement[]
  invoices: Invoice[]
  onSign: (agreementId: string) => void
  onPay: (invoiceId: string) => void
}) {
  const toSign = agreements.filter((a) => a.status === 'awaiting_signature')
  const bills = invoices.filter((i) => i.status !== 'draft')
  return (
    <div className="billing portal-fees">
      {toSign.map((a) => (
        <div key={a.id} className="portal-spotlight static">
          <strong>Sign your {ENGAGEMENT_LABEL[a.type].toLowerCase()} agreement</strong>
          <span>
            {a.type === 'aum' ? 'Tiered fee on assets we manage.' : a.type === 'hourly' ? `${usd(a.amount)} per hour.` : a.type === 'subscription' ? `${usd(a.amount)} per month.` : `${usd(a.amount)} one time.`}
          </span>
          <button type="button" className="btn primary sm" onClick={() => onSign(a.id)}>
            Sign agreement
          </button>
        </div>
      ))}
      <section className="portal-section">
        <h3>What you pay</h3>
        <ul className="bill-list">
          {agreements
            .filter((a) => a.status === 'active')
            .map((a) => (
              <li key={a.id}>
                <div>
                  <strong>{ENGAGEMENT_LABEL[a.type]}</strong>
                  <div className="muted">
                    {a.type === 'aum' ? `${AUM_TIERS.map((t) => `${(t.bps / 100).toFixed(2)}%`).join(' → ')} as assets grow, billed quarterly` : a.type === 'hourly' ? `${usd(a.amount)}/hr` : a.type === 'subscription' ? `${usd(a.amount)}/month` : `${usd(a.amount)} flat`}
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </section>
      <section className="portal-section">
        <h3>Invoices</h3>
        {bills.length === 0 && <p className="muted">No invoices yet.</p>}
        <ul className="bill-list">
          {bills.map((i) => (
            <li key={i.id}>
              <div>
                <strong>
                  {usd(i.amount)} · {i.period}
                </strong>
                <div className="muted">
                  {i.basis}
                  {i.due && i.status === 'sent' ? ` · due ${i.due}` : ''}
                  {i.paidOn ? ` · paid ${i.paidOn}` : ''}
                </div>
              </div>
              <div className="bill-right">
                <span className={`badge ${statusBadge(i)}`}>{statusText(i)}</span>
                {i.status === 'sent' && (
                  <button type="button" className="btn primary sm" onClick={() => onPay(i.id)}>
                    Pay {usd(i.amount)}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
