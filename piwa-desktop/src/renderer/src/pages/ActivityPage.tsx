import React from 'react'
import chatSkel from '../assets/chat-skel.png'

interface ActivityMessage {
  id: string
  direction: 'in' | 'out'
  text: string
  time: string
}

interface ActivityPageProps {
  status: string
  onGoToConnection: () => void
  messages: ActivityMessage[]
  agentStatus: string
  sessionStats: {
    totalMessages: number
    tokens: { total: number; input: number; output: number }
  } | null
  onCompact: () => void
  isCompacting: boolean
}

export default function ActivityPage({
  status,
  onGoToConnection,
  messages,
  agentStatus,
  sessionStats,
  onCompact,
  isCompacting,
}: ActivityPageProps): React.JSX.Element {
  return (
    <div className="flex flex-col h-full w-full relative" style={{ backgroundColor: 'var(--bg-primary)' }}>
      
      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto px-[15%] pt-10 pb-32 flex flex-col items-center">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center -mt-20">
            <img src={chatSkel} alt="Empty state" className="w-20 h-20 object-contain opacity-90 mb-6" />
          </div>
        ) : (
          <div className="w-full flex flex-col gap-6">
            {messages.slice().reverse().map((msg) => (
              <div key={msg.id} className="flex flex-col w-full">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>
                    {msg.direction === 'in' ? 'You (WhatsApp)' : 'Piwa Agent'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{msg.time}</span>
                </div>
                <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Bottom Bar */}
      <div className="absolute bottom-6 w-full flex justify-center px-[10%]">
        {status !== 'connected' ? (
          <button
            onClick={onGoToConnection}
            className="rounded-[20px] px-8 py-3 text-[15px] font-medium transition-transform active:scale-95 shadow-sm"
            style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-input)' }}
          >
            Connect to WhatsApp
          </button>
        ) : (
          <div 
            className="w-full max-w-3xl rounded-[24px] flex items-center px-4 py-3 shadow-sm border border-transparent"
            style={{ backgroundColor: 'var(--bg-input)' }}
          >
            {/* Left pseudo-input text */}
            <div className="flex-1 text-[15px] pl-2 select-none" style={{ color: 'var(--text-tertiary)' }}>
              {agentStatus === 'thinking' ? 'Agent is thinking...' : agentStatus === 'executing' ? 'Agent is executing...' : 'Monitoring WhatsApp messages...'}
            </div>

            {/* Right Action Icons & Pill */}
            <div className="flex items-center gap-2">
              
              {/* Model/Token pill (like the Ollama dropdown pill) */}
              {sessionStats && (
                <div 
                  className="px-3 py-1.5 rounded-xl text-[13px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                  title={`${sessionStats.totalMessages} messages`}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                >
                  {sessionStats.tokens.total.toLocaleString()} tok
                </div>
              )}

              {/* Compact button (like the Send Arrow in Ollama) */}
              <button 
                onClick={onCompact}
                disabled={isCompacting}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors ml-1 disabled:opacity-40"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => { if (!isCompacting) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)' }}
                title="Compact History"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14h6v6" />
                  <path d="M20 10h-6V4" />
                  <path d="M14 10l7-7" />
                  <path d="M3 21l7-7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
