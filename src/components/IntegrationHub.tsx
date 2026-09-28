import { useMemo, useState } from 'react'
import {
  integrationsByCategory,
  logoUrl,
  type Integration,
  type IntegrationCategory,
} from '../data/integrations'
import { ConnectSource } from './ConnectSource'

function IntegrationLogo({ item }: { item: Integration }) {
  const [failed, setFailed] = useState(false)
  const monogram = item.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()
  if (failed) {
    return (
      <span className="integration-logo integration-logo-fallback" aria-hidden="true">
        {monogram}
      </span>
    )
  }
  return (
    <img
      className="integration-logo"
      src={logoUrl(item.domain)}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

export function IntegrationHub({
  integrations,
  onToggle,
  onClose,
  onFlash,
}: {
  integrations: Integration[]
  onToggle: (id: string) => void
  onClose: () => void
  onFlash: (msg: string) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<IntegrationCategory | 'all' | 'connected'>('all')
  // The source awaiting first-time administration setup, and the set of sources
  // that have already completed setup this session (so re-connecting is instant).
  const [pending, setPending] = useState<Integration | null>(null)
  const [configured, setConfigured] = useState<Set<string>>(() => new Set())

  const connectedCount = integrations.filter((i) => i.status === 'connected').length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return integrations.filter((item) => {
      if (filter === 'connected' && item.status !== 'connected') return false
      if (filter !== 'all' && filter !== 'connected' && item.category !== filter) return false
      if (q) return `${item.name} ${item.category} ${item.blurb}`.toLowerCase().includes(q)
      return true
    })
  }, [integrations, query, filter])

  const groups = integrationsByCategory(filtered)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="integration-hub"
        role="dialog"
        aria-modal="true"
        aria-labelledby="integration-hub-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="integration-hub-head">
          <div>
            <div className="portal-kicker">Integration Hub</div>
            <h3 id="integration-hub-title">Connect your stack</h3>
            <p className="muted" style={{ margin: '4px 0 0' }}>
              {connectedCount} connected · {integrations.length} available. Two-way sync keeps meetings, notes,
              tasks, and the client file in step.
            </p>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="integration-hub-controls">
          <input
            className="client-search-input integration-search"
            placeholder="Search integrations"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="integration-filters">
            <button
              type="button"
              className={`integration-chip ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`integration-chip ${filter === 'connected' ? 'active' : ''}`}
              onClick={() => setFilter('connected')}
            >
              Connected · {connectedCount}
            </button>
            {integrationsByCategory(integrations).map((group) => (
              <button
                key={group.category}
                type="button"
                className={`integration-chip ${filter === group.category ? 'active' : ''}`}
                onClick={() => setFilter(group.category)}
              >
                {group.category}
              </button>
            ))}
          </div>
        </div>

        <div className="integration-hub-body">
          {groups.length === 0 && <p className="muted">No integrations match.</p>}
          {groups.map((group) => (
            <section key={group.category} className="integration-group">
              <h4>{group.category}</h4>
              <div className="integration-grid">
                {group.items.map((item) => (
                  <div key={item.id} className={`integration-card ${item.status}`}>
                    <div className="integration-card-head">
                      <IntegrationLogo item={item} />
                      <span className="integration-name">{item.name}</span>
                      <span className={`badge ${item.status === 'connected' ? 'done' : 'medium'}`}>
                        {item.status === 'connected' ? 'Connected' : 'Available'}
                      </span>
                    </div>
                    <p className="integration-blurb">{item.blurb}</p>
                    <span
                      className={`integration-conn ${item.connection === 'Read/Write' ? 'rw' : 'ro'}`}
                      title={item.connection === 'Read/Write' ? 'Two-way sync' : 'Read-only access'}
                    >
                      {item.connection}
                    </span>
                    {item.status === 'connected' && item.syncs && (
                      <p className="integration-syncs">
                        <strong>Syncing:</strong> {item.syncs}
                      </p>
                    )}
                    <button
                      type="button"
                      className={`btn ${item.status === 'connected' ? '' : 'primary'} integration-toggle`}
                      onClick={() => {
                        if (item.status === 'connected') {
                          onToggle(item.id)
                          onFlash(`Disconnected ${item.name}.`)
                          return
                        }
                        // First time connecting this source → administration setup.
                        if (!configured.has(item.id)) {
                          setPending(item)
                          return
                        }
                        onToggle(item.id)
                        onFlash(`Connected ${item.name}. Two-way sync is on.`)
                      }}
                    >
                      {item.status === 'connected' ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {pending && (
        <ConnectSource
          item={pending}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            setConfigured((prev) => new Set(prev).add(pending.id))
            onToggle(pending.id)
            onFlash(`Connected ${pending.name}. Setup complete — two-way sync is on.`)
            setPending(null)
          }}
        />
      )}
    </div>
  )
}
