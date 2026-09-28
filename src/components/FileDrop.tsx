import { useId, useRef, useState } from 'react'

export type UploadedFile = {
  id: string
  name: string
  size: number
  kind: string
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.heic,.doc,.docx,.csv,.xls,.xlsx'

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extLabel(name: string) {
  const dot = name.lastIndexOf('.')
  if (dot < 0) return 'FILE'
  return name.slice(dot + 1).toUpperCase()
}

// A reusable drag-and-drop upload experience. Files are held in local UI state
// (this is a prototype — nothing is sent to a server); the parent is notified
// via onChange so it can reflect attachments in a request, case, or vault.
export function FileDrop({
  files,
  onChange,
  label = 'Attach documents',
  hint = 'Drag files here, or browse. PDF, images, or Office docs up to 25 MB.',
  compact = false,
}: {
  files: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  label?: string
  hint?: string
  compact?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)
  const baseId = useId()
  let seq = 0

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const incoming: UploadedFile[] = []
    let tooBig = false
    Array.from(list).forEach((file) => {
      if (file.size > 25 * 1024 * 1024) {
        tooBig = true
        return
      }
      seq += 1
      incoming.push({
        id: `${baseId}-${files.length + incoming.length}-${seq}`,
        name: file.name,
        size: file.size,
        kind: extLabel(file.name),
      })
    })
    setRejected(tooBig ? 'Some files were over 25 MB and were skipped.' : null)
    if (incoming.length > 0) {
      // De-dupe by name + size so re-picking the same file is a no-op.
      const seen = new Set(files.map((f) => `${f.name}:${f.size}`))
      const merged = [...files]
      incoming.forEach((f) => {
        if (!seen.has(`${f.name}:${f.size}`)) merged.push(f)
      })
      onChange(merged)
    }
  }

  const remove = (id: string) => onChange(files.filter((f) => f.id !== id))

  return (
    <div className={`filedrop ${compact ? 'compact' : ''}`}>
      <button
        type="button"
        className={`filedrop-zone ${dragOver ? 'over' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          addFiles(event.dataTransfer.files)
        }}
        aria-label={label}
      >
        <span className="filedrop-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <span className="filedrop-copy">
          <strong>{label}</strong>
          <span className="filedrop-hint">{hint}</span>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="filedrop-input"
        onChange={(event) => {
          addFiles(event.target.files)
          event.target.value = ''
        }}
      />
      {rejected && <p className="filedrop-error">{rejected}</p>}
      {files.length > 0 && (
        <ul className="filedrop-list">
          {files.map((file) => (
            <li key={file.id}>
              <span className="filedrop-badge">{file.kind}</span>
              <span className="filedrop-meta">
                <strong>{file.name}</strong>
                <em>{humanSize(file.size)}</em>
              </span>
              <button type="button" className="filedrop-remove" onClick={() => remove(file.id)} aria-label={`Remove ${file.name}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
