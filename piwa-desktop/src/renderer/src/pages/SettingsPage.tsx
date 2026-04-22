import React, { useState } from 'react'

interface ModelInfo {
  provider: string
  id: string
  name: string
}

interface ProviderInfo {
  id: string
  name: string
  hasAuth: boolean
  isOAuth: boolean
}

interface SettingsPageProps {
  status: string
  onGoToConnection: () => void
  // Model
  models: ModelInfo[]
  currentModel: string | null
  currentProvider: string | null
  onModelChange: (provider: string, modelId: string) => void
  // Thinking
  thinkingLevel: string
  onThinkingChange: (level: string) => void
  // Auth
  providers: ProviderInfo[]
  onLogin: (providerId: string) => void
  onLogout: (provider: string) => void
  onSetApiKey: (provider: string, key: string) => void
  // Agent settings
  autoCompaction: boolean
  onAutoCompactionChange: (v: boolean) => void
  autoRetry: boolean
  onAutoRetryChange: (v: boolean) => void
  // Debug
  onOpenLogs: () => void
}

const thinkingLevels = ['off', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const

export default function SettingsPage({
  status,
  onGoToConnection,
  models,
  currentModel,
  currentProvider,
  onModelChange,
  thinkingLevel,
  onThinkingChange,
  providers,
  onLogin,
  onLogout,
  onSetApiKey,
  autoCompaction,
  onAutoCompactionChange,
  autoRetry,
  onAutoRetryChange,
  onOpenLogs,
}: SettingsPageProps): React.JSX.Element {
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({})
  const [savedFeedback, setSavedFeedback] = useState<Record<string, boolean>>({})
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  // Group models by provider
  const grouped = models.reduce(
    (acc, m) => {
      ;(acc[m.provider] ??= []).push(m)
      return acc
    },
    {} as Record<string, ModelInfo[]>,
  )

  const currentModelDisplay = currentProvider && currentModel ? `${currentProvider}/${currentModel}` : 'None'

  if (status !== 'connected') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-tertiary)' }}>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Settings Unavailable</h2>
        <p className="text-[15px] mb-8 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
          The agent must be running to configure models and authentication. Please connect to WhatsApp first.
        </p>
        <button
          onClick={onGoToConnection}
          className="px-6 py-2.5 rounded-lg font-medium text-sm transition-transform active:scale-95"
          style={{ backgroundColor: 'var(--accent)', color: '#000' }}
        >
          Go to Connection
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h1>

      {/* ── Model Section ── */}
      <div
        className="rounded-lg p-4 mb-4 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="text-xs uppercase font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          Model
        </div>

        <div className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
          Current: <span style={{ color: 'var(--text-primary)' }}>{currentModelDisplay}</span>
        </div>

        <select
          value={currentModelDisplay}
          onChange={(e) => {
            const [prov, ...rest] = e.target.value.split('/')
            onModelChange(prov, rest.join('/'))
          }}
          className="w-full px-3 py-2 rounded-md border outline-none cursor-pointer"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {Object.entries(grouped).map(([provider, provModels]) => (
            <optgroup key={provider} label={provider}>
              {provModels.map((m) => (
                <option key={`${m.provider}/${m.id}`} value={`${m.provider}/${m.id}`}>
                  {m.id}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* ── Thinking Level ── */}
      <div
        className="rounded-lg p-4 mb-4 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="text-xs uppercase font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          Thinking Level
        </div>
        <div className="flex flex-wrap gap-1.5">
          {thinkingLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => onThinkingChange(lvl)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: thinkingLevel === lvl ? 'var(--text-primary)' : 'transparent',
                color: thinkingLevel === lvl ? '#000' : 'var(--text-secondary)',
                borderColor: thinkingLevel === lvl ? 'var(--text-primary)' : 'var(--border)',
              }}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* ── Authentication ── */}
      <div
        className="rounded-lg p-4 mb-4 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="text-xs uppercase font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          Authentication
        </div>
        <div className="space-y-1">
          {providers.map((p) => (
            <div key={p.id}>
              <div
                className="flex items-center justify-between py-2 px-2 rounded-md cursor-pointer"
                style={{ backgroundColor: expandedProvider === p.id ? 'var(--bg-primary)' : 'transparent' }}
                onClick={() => setExpandedProvider(expandedProvider === p.id ? null : p.id)}
                onMouseEnter={(e) => {
                  if (expandedProvider !== p.id) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'
                }}
                onMouseLeave={(e) => {
                  if (expandedProvider !== p.id) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: p.hasAuth ? 'var(--green)' : 'var(--red)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.name || p.id}</span>
                  {p.isOAuth && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}
                    >
                      OAuth
                    </span>
                  )}
                </div>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  style={{
                    color: 'var(--text-tertiary)',
                    transform: expandedProvider === p.id ? 'rotate(180deg)' : 'rotate(0)',
                    transition: 'transform 0.15s',
                  }}
                >
                  <polyline points="2,4 6,8 10,4" />
                </svg>
              </div>

              {expandedProvider === p.id && (
                <div className="px-2 pb-2 pt-1 space-y-2">
                  {p.isOAuth ? (
                    <div className="flex gap-2">
                      {!p.hasAuth ? (
                        <button
                          onClick={() => onLogin(p.id)}
                          className="text-xs px-3 py-1.5 rounded-md font-medium"
                          style={{ backgroundColor: 'var(--accent)', color: '#000' }}
                        >
                          Login
                        </button>
                      ) : (
                        <button
                          onClick={() => onLogout(p.id)}
                          className="text-xs px-3 py-1.5 rounded-md font-medium border"
                          style={{
                            borderColor: 'var(--border)',
                            color: 'var(--red)',
                            backgroundColor: 'transparent',
                          }}
                        >
                          Logout
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="Enter API key"
                        value={apiKeyInputs[p.id] || ''}
                        onChange={(e) =>
                          setApiKeyInputs({ ...apiKeyInputs, [p.id]: e.target.value })
                        }
                        className="flex-1 px-2 py-1.5 rounded-md border outline-none text-xs"
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={() => {
                          const key = apiKeyInputs[p.id]?.trim()
                          if (key) {
                            onSetApiKey(p.id, key)
                            setApiKeyInputs({ ...apiKeyInputs, [p.id]: '' })
                            setSavedFeedback({ ...savedFeedback, [p.id]: true })
                            setTimeout(() => {
                              setSavedFeedback((prev) => ({ ...prev, [p.id]: false }))
                            }, 2000)
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded-md font-medium active:scale-95 transition-transform"
                        style={{ backgroundColor: savedFeedback[p.id] ? 'var(--green)' : 'var(--accent)', color: savedFeedback[p.id] ? '#fff' : '#000' }}
                      >
                        {savedFeedback[p.id] ? 'Saved! ✅' : 'Save'}
                      </button>
                      {p.hasAuth && (
                        <button
                          onClick={() => onLogout(p.id)}
                          className="text-xs px-3 py-1.5 rounded-md font-medium border"
                          style={{
                            borderColor: 'var(--border)',
                            color: 'var(--red)',
                            backgroundColor: 'transparent',
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {providers.length === 0 && (
            <div className="text-xs py-2" style={{ color: 'var(--text-tertiary)' }}>
              No providers configured. Start the agent to load providers.
            </div>
          )}
        </div>
      </div>

      {/* ── Agent Settings ── */}
      <div
        className="rounded-lg p-4 mb-4 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="text-xs uppercase font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          Agent
        </div>
        <div className="space-y-3">
          <ToggleRow label="Auto-compaction" checked={autoCompaction} onChange={onAutoCompactionChange} />
          <ToggleRow label="Auto-retry on error" checked={autoRetry} onChange={onAutoRetryChange} />
        </div>
      </div>

      {/* ── Debug ── */}
      <div
        className="rounded-lg p-4 mb-4 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="text-xs uppercase font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
          Debug
        </div>
        <button
          onClick={onOpenLogs}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-md border text-sm"
          style={{
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          <span>View Debug Logs</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <polyline points="5,3 9,7 5,11" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      <button
        onClick={() => onChange(!checked)}
        className="w-9 h-5 rounded-full relative"
        style={{
          backgroundColor: checked ? 'var(--green)' : 'var(--border)',
          transition: 'background-color 0.15s',
        }}
      >
        <div
          className="w-3.5 h-3.5 rounded-full absolute top-0.5"
          style={{
            backgroundColor: '#fff',
            left: checked ? '18px' : '3px',
            transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  )
}
