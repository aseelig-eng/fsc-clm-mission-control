import { useState } from 'react'
import type { Household } from '../data/types'
import type { MeetingType, NewMeetingInput } from '../data/meetings'

const MEETING_TYPES: { id: MeetingType; label: string }[] = [
  { id: 'prospect', label: 'Prospect intro' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'proposal', label: 'Proposal / IPS' },
  { id: 'orientation', label: 'Welcome / orientation' },
  { id: 'annual_review', label: 'Annual review' },
  { id: 'service', label: 'Service check-in' },
  { id: 'estate', label: 'Estate' },
  { id: 'compliance', label: 'Compliance review' },
]

const CHANNELS: { id: NewMeetingInput['channel']; label: string; via: string }[] = [
  { id: 'video', label: 'Video', via: 'Zoom' },
  { id: 'phone', label: 'Phone', via: 'RingCentral' },
  { id: 'in_person', label: 'In person', via: 'Mobile notetaker' },
]

export function ScheduleMeeting({
  households,
  defaultHouseholdId,
  onClose,
  onCreate,
}: {
  households: Household[]
  defaultHouseholdId: string
  onClose: () => void
  /** Create the meeting and (optionally) open its workspace. */
  onCreate: (input: NewMeetingInput) => void
}) {
  const [householdId, setHouseholdId] = useState(defaultHouseholdId)
  const [type, setType] = useState<MeetingType>('discovery')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('2026-10-01')
  const [time, setTime] = useState('10:00')
  const [channel, setChannel] = useState<NewMeetingInput['channel']>('video')
  const defaultClient = households.find((h) => h.id === defaultHouseholdId)?.name ?? ''
  const [attendees, setAttendees] = useState(defaultClient ? `${defaultClient}, A. Rivera` : 'A. Rivera')

  const household = households.find((h) => h.id === householdId)
  const via = CHANNELS.find((c) => c.id === channel)?.via ?? 'Zoom'
  const typeLabel = MEETING_TYPES.find((t) => t.id === type)?.label ?? 'Meeting'

  function submit() {
    onCreate({
      householdId,
      title: title.trim() || `${typeLabel} — ${household?.name ?? 'Client'}`,
      type,
      when: `${date}T${time}:00`,
      channel,
      attendees: attendees
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card schedule-meeting"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-meeting-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="portal-kicker">Meeting Concierge</div>
            <h2 id="schedule-meeting-title">Schedule a meeting</h2>
          </div>
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="schedule-grid">
          <label className="schedule-field">
            <span>Client / household</span>
            <select value={householdId} onChange={(e) => setHouseholdId(e.target.value)}>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>

          <label className="schedule-field">
            <span>Meeting type</span>
            <select value={type} onChange={(e) => setType(e.target.value as MeetingType)}>
              {MEETING_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="schedule-field span-2">
            <span>Title</span>
            <input
              type="text"
              value={title}
              placeholder={`${typeLabel} — ${household?.name ?? 'Client'}`}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="schedule-field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          <label className="schedule-field">
            <span>Time</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>

          <label className="schedule-field">
            <span>Channel</span>
            <select value={channel} onChange={(e) => setChannel(e.target.value as NewMeetingInput['channel'])}>
              {CHANNELS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} · {c.via}
                </option>
              ))}
            </select>
          </label>

          <label className="schedule-field">
            <span>Attendees (comma-separated)</span>
            <input type="text" value={attendees} onChange={(e) => setAttendees(e.target.value)} />
          </label>
        </div>

        <div className="callout schedule-concierge">
          <strong>The Concierge will prep this meeting</strong>
          <ul className="review-checklist">
            <li>Assemble a prep brief from the {household?.name ?? 'household'} file.</li>
            <li>Arm the AI notetaker to join via {via}.</li>
            <li>Draft an agenda confirmation to send the client.</li>
          </ul>
        </div>

        <div className="actions">
          <button type="button" className="btn success" onClick={submit}>
            Schedule &amp; open prep
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
