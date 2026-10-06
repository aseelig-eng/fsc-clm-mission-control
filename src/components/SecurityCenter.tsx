import { useState } from 'react'
import { securityScore, type SecurityProfile } from '../data/security'

function when(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Identity protection. Client audience: manage sign-in factors, devices, alerts,
 * trusted contact (FINRA 4512) and a fraud hold. Advisor audience: read-only
 * posture with the gaps the advisor should raise on the next call.
 */
export function SecurityCenter({
  profile,
  audience,
  onChange,
}: {
  profile: SecurityProfile
  audience: 'client' | 'advisor'
  onChange?: (patch: Partial<SecurityProfile>) => void
}) {
  const { score, checks } = securityScore(profile)
  const [contactOpen, setContactOpen] = useState(false)
  const [contact, setContact] = useState({ name: '', relationship: '', phone: '' })
  const editable = audience === 'client' && !!onChange
  const risky = profile.logins.filter((login) => login.risk !== 'normal')

  return (
    <div className={`sec-center sec-${audience}`}>
      <div className="sec-score">
        <div className={`sec-ring ${score >= 80 ? 'good' : score >= 50 ? 'ok' : 'weak'}`} aria-label={`Security score ${score} of 100`}>
          <strong>{score}</strong>
          <span>/100</span>
        </div>
        <div>
          <h4>{audience === 'client' ? 'Your account protection' : 'Identity protection'}</h4>
          <ul className="sec-checks">
            {checks.map((check) => (
              <li key={check.label} className={check.ok ? 'ok' : 'miss'}>
                <span aria-hidden="true">{check.ok ? '✓' : '!'}</span> {check.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {risky.length > 0 && (
        <div className="sec-alert" role="alert">
          <strong>{risky.length === 1 ? 'A sign-in was stopped' : `${risky.length} sign-ins were stopped`}</strong>
          {risky.map((login) => (
            <span key={login.id}>
              {when(login.at)} · {login.device} · {login.location} · {login.result}
            </span>
          ))}
          {audience === 'client' ? (
            <em>If this wasn’t you, nothing was accessed. Turn on an authenticator app and a fraud alert below.</em>
          ) : (
            <em>Raise on the next call. Money movement for this household requires a verified callback.</em>
          )}
        </div>
      )}

      <div className="sec-grid">
        <section>
          <h5>Sign-in</h5>
          <label className="sec-row">
            <span>Multi-factor</span>
            {editable ? (
              <select value={profile.mfa} onChange={(e) => onChange!({ mfa: e.target.value as SecurityProfile['mfa'] })}>
                <option value="authenticator">Authenticator app (strongest)</option>
                <option value="sms">Text message code</option>
                <option value="off">Off</option>
              </select>
            ) : (
              <strong>{profile.mfa === 'authenticator' ? 'Authenticator app' : profile.mfa === 'sms' ? 'SMS code' : 'Off'}</strong>
            )}
          </label>
          <label className="sec-row">
            <span>Sign-in alerts</span>
            {editable ? (
              <input type="checkbox" checked={profile.loginAlerts} onChange={(e) => onChange!({ loginAlerts: e.target.checked })} />
            ) : (
              <strong>{profile.loginAlerts ? 'On' : 'Off'}</strong>
            )}
          </label>
          <label className="sec-row">
            <span>Verbal passphrase for phone calls</span>
            {editable ? (
              <input type="checkbox" checked={profile.verbalPassphrase} onChange={(e) => onChange!({ verbalPassphrase: e.target.checked })} />
            ) : (
              <strong>{profile.verbalPassphrase ? 'Set' : 'Not set'}</strong>
            )}
          </label>
        </section>

        <section>
          <h5>Fraud alert</h5>
          <p className="muted">
            {profile.fraudAlert
              ? 'On. Every request to move money out needs a call back from your advisor’s team before it is released.'
              : 'Off. Turn this on if you think someone has your details — outbound money movement will wait for a call back.'}
          </p>
          {editable ? (
            <button type="button" className={`btn sm ${profile.fraudAlert ? '' : 'primary'}`} onClick={() => onChange!({ fraudAlert: !profile.fraudAlert })}>
              {profile.fraudAlert ? 'Turn off fraud alert' : 'Turn on fraud alert'}
            </button>
          ) : (
            <strong>{profile.fraudAlert ? 'Fraud alert ON' : 'No fraud alert'}</strong>
          )}
          {profile.seniorProtections && <p className="sec-senior">Senior investor protections apply (FINRA 2165 temporary hold).</p>}
        </section>

        <section>
          <h5>Trusted contact</h5>
          {profile.trustedContact ? (
            <p>
              <strong>{profile.trustedContact.name}</strong> · {profile.trustedContact.relationship} · {profile.trustedContact.phone}
            </p>
          ) : (
            <p className="muted">
              {audience === 'client'
                ? 'Someone we may contact if we can’t reach you or are worried about your wellbeing. They can’t see or move your money.'
                : 'None on file (FINRA 4512 asks the firm to make a reasonable effort to obtain one).'}
            </p>
          )}
          {editable && !contactOpen && (
            <button type="button" className="btn sm" onClick={() => setContactOpen(true)}>
              {profile.trustedContact ? 'Change' : 'Add a trusted contact'}
            </button>
          )}
          {editable && contactOpen && (
            <form
              className="sec-contact-form"
              onSubmit={(event) => {
                event.preventDefault()
                if (!contact.name.trim() || !contact.phone.trim()) return
                onChange!({ trustedContact: { ...contact } })
                setContactOpen(false)
                setContact({ name: '', relationship: '', phone: '' })
              }}
            >
              <input aria-label="Name" placeholder="Full name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              <input aria-label="Relationship" placeholder="Relationship" value={contact.relationship} onChange={(e) => setContact({ ...contact, relationship: e.target.value })} />
              <input aria-label="Phone" placeholder="Phone" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              <button type="submit" className="btn primary sm">
                Save
              </button>
            </form>
          )}
        </section>

        <section>
          <h5>Devices</h5>
          {profile.devices.length === 0 && <p className="muted">No remembered devices.</p>}
          <ul className="sec-devices">
            {profile.devices.map((device) => (
              <li key={device.id}>
                <span>
                  <strong>{device.label}</strong>
                  <em>
                    {device.location} · last seen {device.lastSeen}
                  </em>
                </span>
                {editable && (
                  <button type="button" className="btn sm ghost" onClick={() => onChange!({ devices: profile.devices.filter((d) => d.id !== device.id) })}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
