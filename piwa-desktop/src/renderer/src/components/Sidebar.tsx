import React, { useState } from 'react'

export type Page = 'activity' | 'connection' | 'settings'

interface SidebarProps {
  active: Page
  onNavigate: (page: Page) => void
  connectionStatus: string
}

export default function Sidebar({ active, onNavigate, connectionStatus }: SidebarProps): React.JSX.Element {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div
      className={`h-full flex flex-col py-3 gap-1 shrink-0 transition-[width] duration-200 ${isCollapsed ? 'w-[64px] px-2' : 'w-[260px] px-3'}`}
      style={{
        backgroundColor: 'var(--bg-sidebar)',
      }}
    >
      {/* Top Sidebar Toggle Icon */}
      <div className={`mb-4 flex ${isCollapsed ? 'justify-center' : 'px-2'}`}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="3" x2="9" y2="21" />
          </svg>
        </button>
      </div>

      {/* Main Nav Items */}
      <div className="flex flex-col gap-1.5">
        {/* Activity / New Chat */}
        <button
          onClick={() => onNavigate('activity')}
          title="Activity"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors`}
          style={{
            backgroundColor: active === 'activity' ? 'var(--bg-surface)' : 'transparent',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            if (active !== 'activity') e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'
          }}
          onMouseLeave={(e) => {
            if (active !== 'activity') e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          {!isCollapsed && <span className="truncate">Activity</span>}
        </button>

        {/* Connection / Launch */}
        <button
          onClick={() => onNavigate('connection')}
          title="Connection"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors`}
          style={{
            backgroundColor: active === 'connection' ? 'var(--bg-surface)' : 'transparent',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            if (active !== 'connection') e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'
          }}
          onMouseLeave={(e) => {
            if (active !== 'connection') e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          {isCollapsed ? (
            <div className="relative flex items-center justify-center">
              <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
              </svg>
              <div
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-[var(--bg-sidebar)]"
                style={{
                  backgroundColor:
                    connectionStatus === 'connected'
                      ? 'var(--green)'
                      : connectionStatus === 'connecting' || connectionStatus === 'waiting-for-code'
                        ? 'var(--yellow)'
                        : 'var(--red)',
                }}
              />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 truncate">
                <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
                  <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
                </svg>
                <span>Connection</span>
              </div>
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    connectionStatus === 'connected'
                      ? 'var(--green)'
                      : connectionStatus === 'connecting' || connectionStatus === 'waiting-for-code'
                        ? 'var(--yellow)'
                        : 'var(--red)',
                }}
              />
            </>
          )}
        </button>

        {/* Settings */}
        <button
          onClick={() => onNavigate('settings')}
          title="Settings"
          className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors`}
          style={{
            backgroundColor: active === 'settings' ? 'var(--bg-surface)' : 'transparent',
            color: 'var(--text-primary)',
          }}
          onMouseEnter={(e) => {
            if (active !== 'settings') e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'
          }}
          onMouseLeave={(e) => {
            if (active !== 'settings') e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          <svg className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {!isCollapsed && <span className="truncate">Settings</span>}
        </button>
      </div>

      {!isCollapsed && (
        <div className="mt-8 px-3 transition-opacity duration-200">
          <div className="text-[11px] uppercase font-semibold tracking-wider mb-3" style={{ color: 'var(--text-tertiary)' }}>
            Quick Links
          </div>
          <div className="text-[13px] cursor-pointer truncate hover:text-[var(--text-primary)] transition-colors" style={{ color: 'var(--text-secondary)' }}>
            Clear memory (Compact)
          </div>
        </div>
      )}

      <div className="flex-1" />
    </div>
  )
}
