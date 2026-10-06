import { useState } from 'react'
import { CASE_STUDIES, CE_REQUIRED_HOURS, COURSES, searchKb, type HelpTicket, type PeerThread } from '../data/firm'

/** Header Help: knowledge base first, then a ticket to the home office. */
export function HelpDesk({ advisorId, tickets, onTicket, onDeflect, onClose }: { advisorId: string; tickets: HelpTicket[]; onTicket: (category: HelpTicket['category'], q: string) => void; onDeflect: () => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [asked, setAsked] = useState('')
  const hit = asked ? searchKb(asked) : undefined
  const mine = tickets.filter((t) => t.advisorId === advisorId)
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal help-modal" role="dialog" aria-label="Help desk" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header"><span>Ask the home office</span><button type="button" className="btn sm" onClick={onClose}>Close</button></div>
        <div className="panel-body">
          <form className="bill-new" onSubmit={(e) => { e.preventDefault(); setAsked(q) }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Why was my paperwork NIGO?" aria-label="Question" style={{ flex: 1 }} />
            <button type="submit" className="btn primary sm" disabled={!q.trim()}>Ask</button>
          </form>
          {asked && (hit ? (
            <div className="campaign-card"><span className="agent">Help agent</span><strong>{hit.question}</strong><p className="campaign-body">{hit.answer}</p>
              <div className="trade-actions"><button type="button" className="btn sm" onClick={() => { onTicket(hit.category, asked); setAsked(''); setQ('') }}>Still need help: open a ticket</button><button type="button" className="btn primary sm" onClick={() => { onDeflect(); setAsked(''); setQ('') }}>That solved it</button></div></div>
          ) : (
            <div className="campaign-card"><p>No match in the knowledge base.</p><div className="trade-actions"><button type="button" className="btn primary sm" onClick={() => { onTicket('Other', asked); setAsked(''); setQ('') }}>Send to the home office</button></div></div>
          ))}
          <h5>Your tickets</h5>
          <ul className="bill-list">{mine.length === 0 && <li className="muted">None yet.</li>}{mine.map((t) => <li key={t.id}><div>{t.question}{t.answer && <div className="muted">Answer: {t.answer}</div>}</div><span className={`badge ${t.status === 'open' ? 'needs' : 'done'}`}>{t.status === 'open' ? 'With home office' : 'Resolved'}</span></li>)}</ul>
        </div>
      </div>
    </div>
  )
}

/** Book → Collaboration: ask-an-expert threads and case studies. */
export function PeerPanel({ threads, nameOf, households, author, onStart, onReply, onResolve }: { threads: PeerThread[]; nameOf: (id: string) => string; households: { id: string; name: string }[]; author: string; onStart: (title: string, text: string, hh?: string, expert?: string) => void; onReply: (id: string, text: string) => void; onResolve: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [hh, setHh] = useState('')
  const [expert, setExpert] = useState('')
  const [reply, setReply] = useState<Record<string, string>>({})
  return (
    <div className="panel"><div className="panel-header"><span>Collaboration</span><span className="muted">{threads.filter((t) => !t.resolved).length} open</span></div><div className="panel-body">
      <form className="campaign-card" onSubmit={(e) => { e.preventDefault(); if (!title.trim() || !text.trim()) return; onStart(title, text, hh || undefined, expert || undefined); setTitle(''); setText('') }}>
        <strong>Ask a colleague</strong>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Topic" aria-label="Topic" />
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Your question" aria-label="Question" />
        <div className="bill-new">
          <select value={hh} onChange={(e) => setHh(e.target.value)} aria-label="Household"><option value="">No household</option>{households.map((h) => <option key={h.id} value={h.id}>@ {h.name}</option>)}</select>
          <select value={expert} onChange={(e) => setExpert(e.target.value)} aria-label="Expert"><option value="">Whole ensemble</option>{['Tax specialist', 'Estate specialist', 'Portfolio manager'].map((x) => <option key={x}>{x}</option>)}</select>
          <button type="submit" className="btn primary sm">Post ({author})</button>
        </div>
      </form>
      {threads.map((t) => (
        <div key={t.id} className="campaign-card">
          <div className="campaign-head"><div><strong>{t.title}</strong><div className="muted">{t.householdId ? `@ ${nameOf(t.householdId)} · ` : ''}{t.expert ?? 'Ensemble'}</div></div><span className={`badge ${t.resolved ? 'done' : 'needs'}`}>{t.resolved ? 'Resolved' : 'Open'}</span></div>
          {t.posts.map((p, i) => <p key={i} className="campaign-body"><strong>{p.by}:</strong> {p.text}</p>)}
          {!t.resolved && <div className="bill-new"><input style={{ flex: 1 }} aria-label="Reply" value={reply[t.id] ?? ''} onChange={(e) => setReply({ ...reply, [t.id]: e.target.value })} placeholder="Reply" /><button type="button" className="btn sm" disabled={!(reply[t.id] ?? '').trim()} onClick={() => { onReply(t.id, reply[t.id]); setReply({ ...reply, [t.id]: '' }) }}>Reply</button><button type="button" className="btn sm" onClick={() => onResolve(t.id)}>Mark resolved</button></div>}
        </div>))}
      <h5>Case studies</h5>
      <ul className="bill-list">{CASE_STUDIES.map((c) => <li key={c.id}><div><strong>{c.title}</strong><div className="muted">{c.by} · {c.lesson}</div></div></li>)}</ul>
    </div></div>
  )
}

/** Book → My learning, with tool-certification prerequisites. */
export function MyLearning({ done, onComplete }: { done: string[]; onComplete: (id: string) => void }) {
  const ce = COURSES.filter((c) => c.kind === 'CE' && done.includes(c.id)).reduce((s, c) => s + c.hours, 0)
  return (
    <div className="panel"><div className="panel-header"><span>My learning</span><span className="muted">CE {ce} / {CE_REQUIRED_HOURS} hours</span></div><div className="panel-body"><ul className="bill-list">
      {COURSES.map((c) => <li key={c.id}><div><strong>{c.title}</strong><div className="muted">{c.kind} · {c.hours}h · due {c.due}{c.unlocks ? ` · required for: ${c.unlocks}` : ''}</div></div>{done.includes(c.id) ? <span className="badge done">Complete</span> : <button type="button" className="btn primary sm" onClick={() => onComplete(c.id)}>Complete module</button>}</li>)}
    </ul></div></div>
  )
}
