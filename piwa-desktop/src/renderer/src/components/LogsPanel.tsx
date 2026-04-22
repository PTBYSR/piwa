import React, { useRef, useEffect } from 'react'

interface LogsPanelProps {
  logs: string[]
  onClose: () => void
  onClear: () => void
}

export default function LogsPanel({ logs, onClose, onClear }: LogsPanelProps): React.JSX.Element {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ backgroundColor: 'var(--bg-primary)', zIndex: 50 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Debug Logs
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-tertiary)' }}>
            {logs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="text-xs px-3 py-1 rounded-md border"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.5">
              <line x1="2" y1="2" x2="10" y2="10" />
              <line x1="10" y1="2" x2="2" y2="10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-relaxed min-h-0"
        style={{ backgroundColor: 'var(--bg-sidebar)' }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-tertiary)' }}>
            No logs yet — events will appear here in real time
          </div>
        ) : (
          logs.slice().reverse().map((log, i) => (
            <div
              key={i}
              className="py-0.5 break-words"
              style={{
                color: log.includes('✅')
                  ? 'var(--green)'
                  : log.includes('⚠️') || log.includes('🔴')
                    ? 'var(--red)'
                    : log.includes('🔄')
                      ? 'var(--yellow)'
                      : log.includes('⏭️')
                        ? 'var(--text-tertiary)'
                        : 'var(--text-secondary)',
              }}
            >
              {log}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
