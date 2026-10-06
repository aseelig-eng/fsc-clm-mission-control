import { useEffect, useMemo, useState } from 'react'
import {
  draftReply,
  lexiconFlags,
  needsReply,
  type DraftContext,
  type MessageChannel,
  type MessageThread,
} from '../data/messages'

function when(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

/**
 * Two-way secure messaging + texting. Same component for the advisor (Work view)
 * and the client (portal). Every message is archived and supervised; the advisor
 * side gets an agent-drafted reply and a lexicon check before anything is sent.
 */
export function MessageCenter({
  threads,
  audience,
  draftContext,
  onSend,
  onRead,
  onNewThread,
}: {
  threads: MessageThread[]
  audience: 'advisor' | 'client'
  draftContext?: DraftContext
  onSend: (threadId: string, body: string, meta: { agentDrafted: boolean; flags: string[] }) => void
  onRead: (threadId: string) => void
  onNewThread?: (subject: string, body: string, channel: MessageChannel) => void
}) {
  const sorted = useMemo(
    () =>
      [...threads].sort((a, b) => {
        const la = a.messages[a.messages.length - 1]?.at ?? ''
        const lb = b.messages[b.messages.length - 1]?.at ?? ''
        return lb.localeCompare(la)
      }),
    [threads],
  )
  const [activeId, setActiveId] = useState<string | null>(sorted[0]?.id ?? null)
  const [compose, setCompose] = useState('')
  const [fromAgent, setFromAgent] = useState(false)
  const [pendingFlags, setPendingFlags] = useState<string[] | null>(null)
  const [newOpen, setNewOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newChannel, setNewChannel] = useState<MessageChannel>('secure')
  const active = sorted.find((thread) => thread.id === activeId) ?? sorted[0] ?? null

  useEffect(() => {
    setCompose('')
    setFromAgent(false)
    setPendingFlags(null)
  }, [active?.id])

  useEffect(() => {
    if (!active) return
    const unread = audience === 'advisor' ? !active.advisorRead : !active.clientRead
    if (unread) onRead(active.id)
  }, [active, audience, onRead])

  const isUnread = (thread: MessageThread) => (audience === 'advisor' ? !thread.advisorRead : !thread.clientRead)

  function send(force = false) {
    if (!active || !compose.trim()) return
    const flags = audience === 'advisor' ? lexiconFlags(compose) : []
    if (flags.length > 0 && !force) {
      setPendingFlags(flags)
      return
    }
    onSend(active.id, compose.trim(), { agentDrafted: fromAgent, flags })
    setCompose('')
    setFromAgent(false)
    setPendingFlags(null)
  }

  return (
    <div className={`msg-center msg-${audience}`}>
      <aside className="msg-threads" aria-label="Conversations">
        {audience === 'client' && onNewThread && (
          <button type="button" className="btn primary sm msg-new-btn" onClick={() => setNewOpen((open) => !open)}>
            {newOpen ? 'Cancel' : 'New message'}
          </button>
        )}
        {newOpen && onNewThread && (
          <form
            className="msg-new"
            onSubmit={(event) => {
              event.preventDefault()
              if (!newSubject.trim() || !newBody.trim()) return
              onNewThread(newSubject.trim(), newBody.trim(), newChannel)
              setNewSubject('')
              setNewBody('')
              setNewOpen(false)
            }}
          >
            <input aria-label="Subject" placeholder="Subject" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
            <textarea aria-label="Message" placeholder="Write to your advisory team" rows={3} value={newBody} onChange={(e) => setNewBody(e.target.value)} />
            <div className="msg-channel-pick" role="radiogroup" aria-label="Channel">
              {(['secure', 'sms'] as const).map((channel) => (
                <label key={channel}>
                  <input type="radio" name="new-channel" checked={newChannel === channel} onChange={() => setNewChannel(channel)} />
                  {channel === 'secure' ? 'Secure message' : 'Text me back'}
                </label>
              ))}
            </div>
            <button type="submit" className="btn primary sm">
              Send
            </button>
          </form>
        )}
        {sorted.length === 0 && <p className="muted">No conversations yet.</p>}
        <ul>
          {sorted.map((thread) => {
            const last = thread.messages[thread.messages.length - 1]
            const waiting = audience === 'advisor' && needsReply(thread)
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  className={`msg-thread ${active?.id === thread.id ? 'active' : ''} ${isUnread(thread) ? 'unread' : ''}`}
                  onClick={() => setActiveId(thread.id)}
                >
                  <span className="msg-thread-top">
                    <strong>{thread.subject}</strong>
                    <span className={`msg-channel ch-${thread.channel}`}>{thread.channel === 'sms' ? 'SMS' : 'Secure'}</span>
                  </span>
                  <span className="msg-thread-snippet">
                    {last ? `${last.author === 'client' ? '' : `${last.name}: `}${last.body}` : ''}
                  </span>
                  <span className="msg-thread-meta">
                    {last ? when(last.at) : ''}
                    {waiting && <span className="msg-waiting">Needs reply</span>}
                    {isUnread(thread) && <span className="msg-dot" aria-label="Unread" />}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>
      <section className="msg-conversation" aria-label="Conversation">
        {!active ? (
          <p className="muted">Pick a conversation.</p>
        ) : (
          <>
            <header className="msg-conv-head">
              <div>
                <strong>{active.subject}</strong>
                <span className="muted">
                  {' '}
                  · {active.channel === 'sms' ? 'Text (SMS) via firm number' : 'Secure portal message'}
                </span>
              </div>
              <span className="msg-archive" title="Every message is captured to the books-and-records archive and is subject to supervisory review.">
                Archived · supervised
              </span>
            </header>
            <ol className="msg-bubbles">
              {active.messages.map((message) => {
                const mine = audience === 'advisor' ? message.author !== 'client' : message.author === 'client'
                return (
                  <li key={message.id} className={`msg-bubble ${mine ? 'mine' : 'theirs'}`}>
                    <div className="msg-bubble-meta">
                      {message.name} · {when(message.at)}
                      {audience === 'advisor' && message.agentDrafted && <span className="msg-agent-tag">Agent draft · approved</span>}
                    </div>
                    <div className="msg-bubble-body">{message.body}</div>
                    {audience === 'advisor' && message.flags && message.flags.length > 0 && (
                      <div className="msg-bubble-flags">Sent to supervision: {message.flags.join(' · ')}</div>
                    )}
                  </li>
                )
              })}
            </ol>
            <div className="msg-compose">
              {audience === 'advisor' && draftContext && needsReply(active) && !compose && (
                <button
                  type="button"
                  className="msg-draft-cta"
                  onClick={() => {
                    setCompose(draftReply(active, draftContext))
                    setFromAgent(true)
                  }}
                >
                  <span className="agent">Messaging agent</span> drafted a reply from the household file — review it
                </button>
              )}
              <textarea
                aria-label="Reply"
                rows={audience === 'advisor' ? 4 : 3}
                placeholder={audience === 'advisor' ? 'Write a reply, or use the agent draft' : 'Write a message'}
                value={compose}
                onChange={(event) => {
                  setCompose(event.target.value)
                  setPendingFlags(null)
                }}
              />
              {pendingFlags && (
                <div className="msg-lexicon" role="alert">
                  <strong>Compliance check:</strong> {pendingFlags.join(' · ')}. Edit the message, or send it and it routes to your supervisor.
                  <div className="msg-lexicon-actions">
                    <button type="button" className="btn sm" onClick={() => setPendingFlags(null)}>
                      Edit
                    </button>
                    <button type="button" className="btn sm" onClick={() => send(true)}>
                      Send &amp; route to supervision
                    </button>
                  </div>
                </div>
              )}
              <div className="msg-compose-actions">
                {fromAgent && <span className="muted">Agent draft — you are the sender of record.</span>}
                <button type="button" className="btn primary sm" disabled={!compose.trim()} onClick={() => send(false)}>
                  {audience === 'advisor' ? (active.channel === 'sms' ? 'Send text' : 'Send') : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
