import { useEffect, useRef, useState } from 'react'
import { answerCoworker, type CoworkerAction, type CoworkerContext } from '../coworker'

interface ChatMessage {
  id: string
  role: 'you' | 'coworker'
  text: string
  did?: string
}

export function CoworkerPanel({
  open,
  context,
  onClose,
  onAction,
  embedded = false,
}: {
  open: boolean
  context: CoworkerContext
  onClose: () => void
  onAction: (action: CoworkerAction) => void
  embedded?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [feedback, setFeedback] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)
  const home = messages.length === 0

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight })
  }, [messages, open])

  function ask(question: string) {
    const trimmed = question.trim()
    if (!trimmed) return
    const reply = answerCoworker(trimmed, context)
    if (reply.action) onAction(reply.action)
    setMessages((current) => [
      ...current,
      { id: `you-${Date.now()}`, role: 'you', text: trimmed },
      { id: `cw-${Date.now()}`, role: 'coworker', text: reply.text, did: reply.did },
    ])
    setDraft('')
  }

  const client = context.audience === 'client'
  const panel = (
    <div className="coworker-panel">
      {!embedded && (
        <button type="button" className="coworker-home-close" onClick={onClose} aria-label="Close Coworker">
          Close
        </button>
      )}
        {home ? (
          <div className="coworker-home">
            <h2>Hi. What’s on your radar?</h2>
            <p>Ask a question. See the big picture.</p>
            <form
              className="coworker-askbox"
              onSubmit={(event) => {
                event.preventDefault()
                ask(draft)
              }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={
                  client
                    ? 'Try "What is managed, what is held away, and what is my advisor waiting on?"'
                    : 'Try "What do I need to know about Maya Chen before the funding call?"'
                }
                aria-label="Ask Coworker"
                rows={4}
              />
              <button type="submit" aria-label="Send">
                ›
              </button>
            </form>
            <div className="coworker-home-foot">
              <span>Connections</span>
              <span className="coworker-disclaimer">Generative AI can produce inaccurate responses. Review responses carefully.</span>
              <button type="button" onClick={() => setFeedback(true)}>
                {feedback ? 'Thanks' : 'Share feedback'}
              </button>
            </div>
            <div className="coworker-modes">
              <button type="button" onClick={() => ask('Who needs me right now?')}>
                Find
              </button>
              <button type="button" onClick={() => ask('What do I need to catch up on?')}>
                Catch Up
              </button>
              <button type="button" onClick={() => ask('How ready are the heirs?')}>
                Plan
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="coworker-thread" ref={threadRef}>
              {messages.map((message) => (
                <div key={message.id} className={`coworker-msg ${message.role}`}>
                  <div>
                    <p>{message.text}</p>
                    {message.did && <em>{message.did}</em>}
                  </div>
                </div>
              ))}
            </div>
            <form
              className="coworker-askbox coworker-askbox-dock"
              onSubmit={(event) => {
                event.preventDefault()
                ask(draft)
              }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask a follow-up"
                aria-label="Ask Coworker"
                rows={2}
              />
              <button type="submit" aria-label="Send">
                ›
              </button>
            </form>
          </>
        )}
    </div>
  )

  if (embedded) return <div className="coworker-embedded">{panel}</div>

  return (
    <aside className={`coworker-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      {panel}
    </aside>
  )
}
