import { useMemo, useState } from 'react'
import type { Integration } from '../data/integrations'
import { logoUrl } from '../data/integrations'

type AuthMethod = 'oauth' | 'apikey' | 'mcp'

// Sensible default auth method per category — MCP-native data sources default to
// an MCP server session, market/research feeds to API keys, the rest to OAuth.
function defaultMethod(item: Integration): AuthMethod {
  const mcpish: Integration['category'][] = ['Data Aggregation', 'Market Data', 'Asset Management Data', 'Research', 'Market Share Data']
  const apiish: Integration['category'][] = ['Prospecting', 'Life Events', 'Real Estate', 'Tax', 'Philanthropy']
  if (mcpish.includes(item.category)) return 'mcp'
  if (apiish.includes(item.category)) return 'apikey'
  return 'oauth'
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const METHODS: { id: AuthMethod; label: string; hint: string }[] = [
  { id: 'oauth', label: 'OAuth 2.0', hint: 'Delegated access — recommended' },
  { id: 'mcp', label: 'MCP server', hint: 'Model Context Protocol endpoint' },
  { id: 'apikey', label: 'API key', hint: 'Static token / secret' },
]

// First-time connection administration popup. Inspired by the MCP client
// authorization flow: client/callback info, an active-session card to authorize,
// plus the API/MCP sign-up fields a real connector needs before it can sync.
export function ConnectSource({
  item,
  onCancel,
  onConfirm,
}: {
  item: Integration
  onCancel: () => void
  onConfirm: () => void
}) {
  const [method, setMethod] = useState<AuthMethod>(() => defaultMethod(item))
  const readWrite = item.connection === 'Read/Write'
  const callbackUrl = 'http://localhost:49476/callback'

  const [mcpUrl, setMcpUrl] = useState(`https://mcp.${item.domain}/sse`)
  const [transport, setTransport] = useState<'sse' | 'http' | 'stdio'>('sse')
  const [apiBase, setApiBase] = useState(`https://api.${item.domain}/v1`)
  const [apiKey, setApiKey] = useState('')
  const [clientId, setClientId] = useState(`benificial-${slug(item.name)}`)
  const [clientSecret, setClientSecret] = useState('')
  const [authorizedBy, setAuthorizedBy] = useState('A. Rivera')
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>('production')
  const [consent, setConsent] = useState(false)
  const [useActiveSession, setUseActiveSession] = useState(true)

  const scopes = useMemo(() => {
    const base = ['read:accounts', 'read:profile']
    return readWrite ? [...base, 'write:notes', 'write:tasks', 'sync:bidirectional'] : base
  }, [readWrite])

  const canSubmit = useMemo(() => {
    if (!consent) return false
    if (method === 'apikey') return apiKey.trim().length > 0
    if (method === 'mcp') return mcpUrl.trim().length > 0 && (useActiveSession || apiKey.trim().length > 0)
    if (method === 'oauth') return useActiveSession || clientSecret.trim().length > 0
    return false
  }, [consent, method, apiKey, mcpUrl, useActiveSession, clientSecret])

  return (
    <div className="modal-backdrop connect-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="connect-source"
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-source-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="connect-source-head">
          <img className="connect-source-logo" src={logoUrl(item.domain)} alt="" />
          <div>
            <div className="connect-source-kicker">First-time setup</div>
            <h3 id="connect-source-title">Connect to {item.name}</h3>
          </div>
        </div>

        <div className="connect-source-body">
          <section className="connect-block">
            <h4>Client information</h4>
            <label className="connect-field">
              <span>Redirect / callback URL for this client</span>
              <input value={callbackUrl} readOnly className="connect-mono" />
            </label>
            <label className="connect-field">
              <span>Client application name</span>
              <input value="BENiFICIAL WEALTH — Mission Control" readOnly />
            </label>
          </section>

          <section className="connect-block">
            <h4>Authorization method</h4>
            <div className="connect-methods">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`connect-method ${method === m.id ? 'active' : ''}`}
                  onClick={() => setMethod(m.id)}
                  aria-pressed={method === m.id}
                >
                  <strong>{m.label}</strong>
                  <em>{m.hint}</em>
                </button>
              ))}
            </div>

            {method === 'mcp' && (
              <>
                <label className="connect-field">
                  <span>MCP server URL</span>
                  <input value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} className="connect-mono" placeholder="https://mcp.vendor.com/sse" />
                </label>
                <label className="connect-field">
                  <span>Transport</span>
                  <select value={transport} onChange={(e) => setTransport(e.target.value as typeof transport)}>
                    <option value="sse">HTTP + SSE</option>
                    <option value="http">Streamable HTTP</option>
                    <option value="stdio">stdio (local)</option>
                  </select>
                </label>
              </>
            )}

            {method === 'apikey' && (
              <>
                <label className="connect-field">
                  <span>API base URL</span>
                  <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} className="connect-mono" />
                </label>
                <label className="connect-field">
                  <span>API key / secret token</span>
                  <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder="sk-live-…" autoComplete="off" />
                </label>
              </>
            )}

            {method === 'oauth' && (
              <>
                <label className="connect-field">
                  <span>Client ID</span>
                  <input value={clientId} onChange={(e) => setClientId(e.target.value)} className="connect-mono" />
                </label>
                <label className="connect-field">
                  <span>Client secret {useActiveSession && <em className="connect-optional">— optional with an active session</em>}</span>
                  <input value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} type="password" placeholder="••••••••••••" autoComplete="off" />
                </label>
              </>
            )}
          </section>

          {(method === 'oauth' || method === 'mcp') && (
            <section className="connect-block">
              <div className="connect-block-head">
                <h4>Authorize using an active session</h4>
                <button type="button" className="connect-refresh" title="Refresh session" aria-label="Refresh session">↻</button>
              </div>
              <p className="connect-note">
                By continuing, you allow this client to access your {item.name} resources according to your existing
                permissions.
              </p>
              <button
                type="button"
                className={`connect-account ${useActiveSession ? 'active' : ''}`}
                onClick={() => setUseActiveSession(true)}
                aria-pressed={useActiveSession}
              >
                <span className="connect-account-id">1234-5678-9012</span>
                <span className="connect-account-role">{item.name} · Advisor Integration Role</span>
                <span className="connect-account-user">Signed in as: arivera@benificial.example</span>
              </button>
              <div className="connect-or"><span>OR</span></div>
              <button
                type="button"
                className={`connect-different ${!useActiveSession ? 'active' : ''}`}
                onClick={() => setUseActiveSession(false)}
                aria-pressed={!useActiveSession}
              >
                <span className="connect-different-icon" aria-hidden="true">⇆</span>
                Sign in to a different account
                <span className="connect-chevron" aria-hidden="true">›</span>
              </button>
            </section>
          )}

          <section className="connect-block">
            <h4>Permissions & scope</h4>
            <p className="connect-note">
              This connector uses <strong>{item.connection}</strong> access.
              {readWrite ? ' Data flows both directions.' : ' Read-only — nothing is written back.'}
            </p>
            <div className="connect-scopes">
              {scopes.map((scope) => (
                <span key={scope} className="connect-scope">{scope}</span>
              ))}
            </div>
            <label className="connect-field">
              <span>Environment</span>
              <select value={environment} onChange={(e) => setEnvironment(e.target.value as typeof environment)}>
                <option value="production">Production</option>
                <option value="sandbox">Sandbox / test</option>
              </select>
            </label>
            <label className="connect-field">
              <span>Authorized by</span>
              <input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} />
            </label>
          </section>

          <label className="connect-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I authorize this connection under the firm's data-sharing and compliance policy, and confirm I have
            administrator rights on the {item.name} account.
          </label>
        </div>

        <div className="connect-source-actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn primary" disabled={!canSubmit} onClick={onConfirm}>
            Authorize &amp; connect
          </button>
        </div>
      </div>
    </div>
  )
}
