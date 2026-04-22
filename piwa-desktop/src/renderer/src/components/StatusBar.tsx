import React from 'react'

interface StatusBarProps {
  connectionStatus: string
  modelName?: string
  tokenCount?: number
  agentStatus?: string
}

export default function StatusBar({
  connectionStatus,
  modelName,
  tokenCount,
  agentStatus,
}: StatusBarProps): React.JSX.Element {
  const dotColor =
    connectionStatus === 'connected'
      ? 'var(--green)'
      : connectionStatus === 'connecting' || connectionStatus === 'waiting-for-code'
        ? 'var(--yellow)'
        : 'var(--red)'

  return (
    <div
      className="h-8 w-full flex items-center justify-between px-3 shrink-0 border-t"
      style={{
        backgroundColor: 'var(--bg-statusbar)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
          {connectionStatus === 'waiting-for-code' ? 'Pairing...' : connectionStatus}
        </span>
        {agentStatus && agentStatus !== 'idle' && (
          <>
            <span style={{ color: 'var(--text-tertiary)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--yellow)' }}>{agentStatus}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        {modelName && (
          <span className="text-xs truncate max-w-48" style={{ color: 'var(--text-tertiary)' }}>
            {modelName}
          </span>
        )}
        {tokenCount !== undefined && tokenCount > 0 && (
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {tokenCount.toLocaleString()} tok
          </span>
        )}
      </div>
    </div>
  )
}
