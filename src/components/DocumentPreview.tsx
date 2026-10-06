import type { ClientOnboardingRecord, ComplianceDocument } from '../data/onboardingFramework'
import { docStatusLabel } from '../data/onboardingFramework'
import {
  clientFullName,
  recordFieldMap,
  templateForDoc,
  type DocRow,
} from '../data/documentTemplates'

const NBSP = ' '

function resolveValue(row: DocRow, fields: ReturnType<typeof recordFieldMap>) {
  if (row.fieldKey) {
    const f = fields[row.fieldKey]
    if (f && f.value && f.status !== 'missing' && f.status !== 'blocked') return f.value
    return ''
  }
  return row.value ?? ''
}

function RowValue({
  row,
  value,
  filled,
}: {
  row: DocRow
  value: string
  filled: boolean
}) {
  if (row.kind === 'checkbox') {
    return <span className={`doc-check ${filled ? 'on' : ''}`}>{filled ? '☑' : '☐'}</span>
  }
  if (!filled) {
    return <span className="doc-blank" aria-label="blank field">{NBSP.repeat(10)}</span>
  }
  const display = row.kind === 'currency' && /^\d/.test(value) ? `$${value}` : value
  return <span className="doc-value">{display}</span>
}

export function DocumentPreview({
  doc,
  record,
  householdName,
  onClose,
  onFlash,
}: {
  doc: ComplianceDocument
  record?: ClientOnboardingRecord
  householdName: string
  onClose: () => void
  onFlash: (msg: string) => void
}) {
  const template = templateForDoc(doc)
  const fields = recordFieldMap(record)
  const completed = doc.status === 'filed'
  const nigo = doc.status === 'nigo'

  // Fidelity of the preview: how many sourced rows actually have data.
  const allRows = template?.sections.flatMap((s) => s.rows) ?? []
  const sourced = allRows.filter((r) => r.fieldKey)
  const filledCount = sourced.filter((r) => resolveValue(r, fields) !== '').length
  const fillPct = sourced.length ? Math.round((filledCount / sourced.length) * 100) : 100

  const clientName = clientFullName(fields, householdName)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="doc-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="doc-preview-head">
          <div>
            <div className="portal-kicker">Document preview · {householdName}</div>
            <h3 id="doc-preview-title">{doc.name}</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              <span className={`badge ${completed ? 'done' : nigo ? 'needs' : 'medium'}`}>
                {docStatusLabel(doc.status)}
              </span>{' '}
              {completed
                ? `Filed copy — all details as executed${doc.filedOn ? ` on ${doc.filedOn}` : ''}.`
                : nigo
                  ? 'Rejected — showing the packet with the fields in question.'
                  : `Draft preview — ${fillPct}% of fields are populated so far.`}
            </p>
          </div>
          <div className="doc-preview-actions">
            <button
              type="button"
              className="btn"
              onClick={() => onFlash(completed ? `Downloaded ${doc.name}` : `Opened ${doc.name} for editing`)}
            >
              {completed ? 'Download PDF' : 'Open editor'}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {!template && doc.body && (
          <div className="doc-paper is-filed">
            <div className="doc-letterhead">
              <div className="doc-title">{doc.name}</div>
              <div className="doc-issuer">{householdName}</div>
            </div>
            {doc.body.map((paragraph, index) => (
              <p key={index} className="doc-body-para">
                {paragraph}
              </p>
            ))}
          </div>
        )}

        {!template && !doc.body && (
          <div className="doc-paper">
            <p className="muted">No mockup is available for this document type yet.</p>
          </div>
        )}

        {template && (
          <div className={`doc-paper ${completed ? 'is-filed' : 'is-draft'}`}>
            {!completed && (
              <div className="doc-watermark" aria-hidden="true">
                {nigo ? 'NIGO — NEEDS CORRECTION' : 'DRAFT PREVIEW'}
              </div>
            )}
            <div className="doc-letterhead">
              <div className="doc-title">{template.title}</div>
              {template.formNo && <div className="doc-formno">{template.formNo}</div>}
              {template.issuer && <div className="doc-issuer">{template.issuer}</div>}
              <div className="doc-refline">
                <span>
                  <strong>Prepared for:</strong> {clientName}
                </span>
                <span>
                  <strong>Account:</strong> {fields.custAcct?.value || (completed ? '—' : '____________')}
                </span>
              </div>
            </div>

            {template.intro && <p className="doc-intro">{template.intro}</p>}

            {nigo && doc.notes && (
              <div className="doc-nigo-banner">
                <strong>Custodian / compliance note:</strong> {doc.notes}
              </div>
            )}

            {template.sections.map((section) => (
              <section key={section.heading} className="doc-section">
                <h4 className="doc-section-heading">{section.heading}</h4>
                {section.note && <p className="doc-section-note">{section.note}</p>}
                <dl className="doc-fields">
                  {section.rows.map((row, i) => {
                    const value = resolveValue(row, fields)
                    const filled = value !== ''
                    return (
                      <div key={`${section.heading}-${i}`} className={`doc-field ${filled ? '' : 'is-blank'}`}>
                        <dt>{row.label}</dt>
                        <dd>
                          <RowValue row={row} value={value} filled={filled} />
                        </dd>
                      </div>
                    )
                  })}
                </dl>
              </section>
            ))}

            {template.legal && template.legal.length > 0 && (
              <div className="doc-legal">
                {template.legal.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}

            {template.signatures && template.signatures.length > 0 && (
              <div className="doc-signatures">
                {template.signatures.map((label) => (
                  <div key={label} className="doc-sign-block">
                    <div className={`doc-sign-line ${completed ? 'signed' : ''}`}>
                      {completed ? <span className="doc-sign-mark">{clientNameOrFirm(label, clientName)}</span> : NBSP}
                    </div>
                    <div className="doc-sign-label">
                      {label}
                      {completed && doc.filedOn ? ` · ${doc.filedOn}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function clientNameOrFirm(label: string, clientName: string) {
  const l = label.toLowerCase()
  if (l.includes('adviser') || l.includes('representative') || l.includes('supervisor') || l.includes('notary'))
    return 'A. Rivera'
  if (l.includes('date')) return ''
  return clientName
}
