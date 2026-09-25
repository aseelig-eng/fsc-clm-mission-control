export function goalKind(name: string) {
  const text = name.toLowerCase()
  if (text.includes('home')) return 'home'
  if (text.includes('roth') || text.includes('tax')) return 'tax'
  if (text.includes('estate') || text.includes('settlement')) return 'estate'
  if (text.includes('transfer') || text.includes('heir')) return 'transfer'
  if (text.includes('income') || text.includes('retirement')) return 'income'
  if (text.includes('preserve')) return 'shield'
  if (text.includes('growth')) return 'growth'
  return 'target'
}

export function GoalMark({ name }: { name: string }) {
  const kind = goalKind(name)
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {kind === 'growth' && (
        <>
          <path d="M4 16l5-5 3 3 8-8" {...common} />
          <path d="M14 6h6v6" {...common} />
        </>
      )}
      {kind === 'income' && (
        <>
          <circle cx="12" cy="12" r="8" {...common} />
          <path d="M12 8v8M9.5 10.5c.6-1 4.4-1 5 1s-4.4 1.4-5 2.5 4.4 2 5 1" {...common} />
        </>
      )}
      {kind === 'home' && <path d="M4 11l8-7 8 7v8H4zM10 19v-5h4v5" {...common} />}
      {kind === 'transfer' && (
        <>
          <circle cx="8" cy="9" r="2.4" {...common} />
          <circle cx="16" cy="9" r="2.4" {...common} />
          <path d="M4 18c.8-2.4 2.4-3.4 4-3.4s3.2 1 4 3.4M12 18c.6-1.8 1.8-2.6 3.2-2.6 1.2 0 2.2.6 2.8 1.8" {...common} />
        </>
      )}
      {kind === 'estate' && (
        <>
          <path d="M7 3h7l4 4v14H7z" {...common} />
          <path d="M14 3v4h4M9 12h6M9 16h6" {...common} />
        </>
      )}
      {kind === 'tax' && (
        <>
          <circle cx="12" cy="12" r="8" {...common} />
          <path d="M8 16l8-8M9 9h.5M14.5 15H15" {...common} />
        </>
      )}
      {kind === 'shield' && <path d="M12 3l7 3v6c0 4.5-3 7-7 9-4-2-7-4.5-7-9V6z" {...common} />}
      {kind === 'target' && (
        <>
          <circle cx="12" cy="12" r="7" {...common} />
          <circle cx="12" cy="12" r="3" {...common} />
        </>
      )}
    </svg>
  )
}
