import React, { useState, useEffect, useCallback } from 'react'
import Titlebar from './components/Titlebar'
import Sidebar, { type Page } from './components/Sidebar'
import StatusBar from './components/StatusBar'
import LogsPanel from './components/LogsPanel'
import ActivityPage from './pages/ActivityPage'
import ConnectionPage from './pages/ConnectionPage'
import SettingsPage from './pages/SettingsPage'
import appIcon from './assets/icon.png'

export interface ActivityMessage { id: string; direction: "in" | "out"; text: string; time: string; [key: string]: any; }
export interface SessionStats { totalMessages: number; tokens: { total: number; input: number; output: number; }; [key: string]: any; }
export interface ModelInfo { provider: string; id: string; name: string; [key: string]: any; }
export interface ProviderInfo { id: string; name: string; hasAuth: boolean; isOAuth: boolean; [key: string]: any; }

// --- The Discord-Style Splash Screen ---
function SplashScreen() {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const dotStates = ['', '.', '..', '...']
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % dotStates.length
      setDots(dotStates[i])
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="flex flex-col items-center justify-center h-screen w-screen select-none" 
      style={{ backgroundColor: 'var(--bg-primary)', WebkitAppRegion: 'drag' } as any}
    >
      <div className="flex flex-col items-center justify-center p-8">
        <img src={appIcon} alt="Piwa Logo" className="w-24 h-24 mb-8 animate-pulse shadow-lg rounded-2xl" />
        <h1 className="text-2xl font-bold tracking-wider mb-3" style={{ color: 'var(--text-primary)' }}>Piwa</h1>
        <p className="text-sm font-medium flex" style={{ color: 'var(--text-secondary)' }}>
          Initializing<span className="inline-block w-4 text-left">{dots}</span>
        </p>
      </div>
      {/* Cool loading bar at the bottom */}
      <style>{`
        @keyframes splash-progress {
          0% { width: 0%; }
          15% { width: 10%; }
          50% { width: 60%; }
          80% { width: 85%; }
          100% { width: 100%; }
        }
        .splash-bar-fill {
          animation: splash-progress 5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-[var(--bg-surface)]">
        <div className="h-full bg-white rounded-r-full splash-bar-fill" />
      </div>
    </div>
  )
}

// --- Main App ---
function App(): React.JSX.Element {
  // Catch the splash screen route
  if (window.location.hash === '#splash') {
    return <SplashScreen />
  }

  // Navigation
  const [page, setPage] = useState<Page>('activity')

  // Connection state
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'waiting-for-code' | 'connected'>('disconnected')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [agentNumber, setAgentNumber] = useState('')
  const [ownerNumber, setOwnerNumber] = useState('')

  // Activity state
  const [messages, setMessages] = useState<ActivityMessage[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [agentStatus, setAgentStatus] = useState('idle')
  const [showLogs, setShowLogs] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null)
  const [isCompacting, setIsCompacting] = useState(false)

  // Settings state
  const [models, setModels] = useState<ModelInfo[]>([])
  const [currentModel, setCurrentModel] = useState<string | null>(null)
  const [currentProvider, setCurrentProvider] = useState<string | null>(null)
  const [thinkingLevel, setThinkingLevel] = useState('medium')
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [autoCompaction, setAutoCompaction] = useState(true)
  const [autoRetry, setAutoRetry] = useState(true)

  // Load initial config
  useEffect(() => {
    window.electron.ipcRenderer.invoke('get-config').then((conf: any) => {
      if (conf) {
        setAgentNumber(conf.agentNumber || '')
        setOwnerNumber(conf.ownerNumber || '')
      }
    })
  }, [])

  // Listen for IPC events
  useEffect(() => {
    const handleStatus = (_: any, data: { status: any; error?: string }) => {
      setStatus(data.status)
      if (data.error) setErrorMsg(data.error)
      if (data.status === 'disconnected') setPairingCode(null)
      if (data.status === 'connected') {
        setErrorMsg(null)
        // Auto-load settings when connected
        refreshSettings()
        refreshStats()
      }
    }

    const handleCode = (_: any, code: string) => {
      setPairingCode(code)
    }

    const handleMessage = (_: any, msg: ActivityMessage) => {
      setMessages((prev) => [msg, ...prev].slice(0, 100))
    }

    const handleAgentStatus = (_: any, s: string) => {
      setAgentStatus(s)
    }

    const handleLog = (_: any, msg: string) => {
      setLogs((prev) => [msg, ...prev].slice(0, 200))
    }

    window.electron.ipcRenderer.on('wa-status', handleStatus)
    window.electron.ipcRenderer.on('wa-pairing-code', handleCode)
    window.electron.ipcRenderer.on('wa-message', handleMessage)
    window.electron.ipcRenderer.on('agent-status', handleAgentStatus)
    window.electron.ipcRenderer.on('wa-log', handleLog)

    return () => {
      window.electron.ipcRenderer.removeAllListeners('wa-status')
      window.electron.ipcRenderer.removeAllListeners('wa-pairing-code')
      window.electron.ipcRenderer.removeAllListeners('wa-message')
      window.electron.ipcRenderer.removeAllListeners('agent-status')
      window.electron.ipcRenderer.removeAllListeners('wa-log')
    }
  }, [])

  // Periodic stats refresh
  useEffect(() => {
    if (status !== 'connected') return
    const interval = setInterval(refreshStats, 10_000)
    return () => clearInterval(interval)
  }, [status])

  const refreshSettings = useCallback(async () => {
    try {
      const [m, s, p] = await Promise.all([
        window.electron.ipcRenderer.invoke('get-models'),
        window.electron.ipcRenderer.invoke('get-settings'),
        window.electron.ipcRenderer.invoke('get-providers'),
      ])
      if (m) setModels(m)
      if (s) {
        setCurrentModel(s.model || null)
        setCurrentProvider(s.provider || null)
        setThinkingLevel(s.thinkingLevel || 'medium')
        setAutoCompaction(s.autoCompaction ?? true)
        setAutoRetry(s.autoRetry ?? true)
      }
      if (p) setProviders(p)
    } catch {}
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const stats = await window.electron.ipcRenderer.invoke('get-session-stats')
      if (stats) setSessionStats(stats)
    } catch {}
  }, [])

  // Actions
  const handleStart = () => {
    if (!agentNumber || !ownerNumber) {
      setErrorMsg('Both numbers are required.')
      setPage('connection')
      return
    }
    setErrorMsg(null)
    window.electron.ipcRenderer.invoke('start-agent', { agentNumber, ownerNumber })
  }

  const handleStop = () => {
    window.electron.ipcRenderer.invoke('stop-agent')
  }

  const handleUnlink = () => {
    window.electron.ipcRenderer.invoke('unlink-agent')
    setStatus('disconnected')
  }

  const handleModelChange = async (provider: string, modelId: string) => {
    try {
      await window.electron.ipcRenderer.invoke('set-model', { provider, modelId })
      setCurrentProvider(provider)
      setCurrentModel(modelId)
    } catch {}
  }

  const handleThinkingChange = async (level: string) => {
    try {
      await window.electron.ipcRenderer.invoke('set-thinking-level', level)
      setThinkingLevel(level)
    } catch {}
  }

  const handleLogin = (providerId: string) => {
    window.electron.ipcRenderer.invoke('login-provider', providerId).then(() => refreshSettings())
  }

  const handleLogout = (provider: string) => {
    window.electron.ipcRenderer.invoke('logout-provider', provider).then(() => refreshSettings())
  }

  const handleSetApiKey = (provider: string, key: string) => {
    window.electron.ipcRenderer.invoke('set-api-key', { provider, key }).then(() => refreshSettings())
  }

  const handleAutoCompaction = async (v: boolean) => {
    await window.electron.ipcRenderer.invoke('set-setting', { key: 'autoCompaction', value: v })
    setAutoCompaction(v)
  }

  const handleAutoRetry = async (v: boolean) => {
    await window.electron.ipcRenderer.invoke('set-setting', { key: 'autoRetry', value: v })
    setAutoRetry(v)
  }

  const handleCompact = async () => {
    setIsCompacting(true)
    try {
      await window.electron.ipcRenderer.invoke('compact-session')
      await refreshStats()
    } catch {}
    setIsCompacting(false)
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <Titlebar />

      <div className="flex flex-1 min-h-0">
        <Sidebar active={page} onNavigate={setPage} connectionStatus={status} />

        <div className="flex-1 min-w-0 min-h-0">
          {page === 'activity' && (
            <ActivityPage
              status={status}
              onGoToConnection={() => setPage('connection')}
              messages={messages}
              agentStatus={agentStatus}
              sessionStats={sessionStats}
              onCompact={handleCompact}
              isCompacting={isCompacting}
            />
          )}

          {page === 'connection' && (
            <ConnectionPage
              status={status}
              pairingCode={pairingCode}
              errorMsg={errorMsg}
              agentNumber={agentNumber}
              ownerNumber={ownerNumber}
              onAgentNumberChange={setAgentNumber}
              onOwnerNumberChange={setOwnerNumber}
              onStart={handleStart}
              onStop={handleStop}
              onUnlink={handleUnlink}
            />
          )}

          {page === 'settings' && (
            <SettingsPage
              status={status}
              onGoToConnection={() => setPage('connection')}
              models={models}
              currentModel={currentModel}
              currentProvider={currentProvider}
              onModelChange={handleModelChange}
              thinkingLevel={thinkingLevel}
              onThinkingChange={handleThinkingChange}
              providers={providers}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onSetApiKey={handleSetApiKey}
              autoCompaction={autoCompaction}
              onAutoCompactionChange={handleAutoCompaction}
              autoRetry={autoRetry}
              onAutoRetryChange={handleAutoRetry}
              onOpenLogs={() => setShowLogs(true)}
            />
          )}

          {/* Logs overlay */}
          {showLogs && (
            <LogsPanel
              logs={logs}
              onClose={() => setShowLogs(false)}
              onClear={() => setLogs([])}
            />
          )}
        </div>
      </div>

      <StatusBar
        connectionStatus={status}
        modelName={currentProvider && currentModel ? `${currentProvider}/${currentModel}` : undefined}
        tokenCount={sessionStats?.tokens.total}
        agentStatus={agentStatus}
      />
    </div>
  )
}

export default App
