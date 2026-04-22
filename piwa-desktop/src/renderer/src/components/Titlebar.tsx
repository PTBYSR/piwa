import React from 'react'
import appIcon from '../assets/icon.png'

interface TitlebarProps {
  title?: string
}

export default function Titlebar({ title = 'Piwa' }: TitlebarProps): React.JSX.Element {
  const minimize = () => window.electron.ipcRenderer.invoke('window-minimize')
  const maximize = () => window.electron.ipcRenderer.invoke('window-maximize')
  const close = () => window.electron.ipcRenderer.invoke('window-close')

  return (
    <div
      className="h-10 flex items-center justify-between px-4 border-b select-none shrink-0"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderColor: 'var(--border)',
        WebkitAppRegion: 'drag',
      } as any}
    >
      <div className="flex items-center gap-2">
        <img src={appIcon} alt="Piwa Logo" className="w-5 h-5 object-contain" />
        <span className="text-sm font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {title}
        </span>
      </div>

      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button
          onClick={minimize}
          className="w-8 h-8 flex items-center justify-center rounded hover:opacity-100 opacity-50"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor"><rect width="10" height="1" /></svg>
        </button>
        <button
          onClick={maximize}
          className="w-8 h-8 flex items-center justify-center rounded hover:opacity-100 opacity-50"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1"><rect x="0.5" y="0.5" width="9" height="9" /></svg>
        </button>
        <button
          onClick={close}
          className="w-8 h-8 flex items-center justify-center rounded hover:opacity-100 opacity-50"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2"><line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" /></svg>
        </button>
      </div>
    </div>
  )
}
