import React, { useState, useEffect } from 'react'

const COUNTRY_CODES = [
  { code: '1', label: '🇺🇸 US/CA (+1)' },
  { code: '44', label: '🇬🇧 UK (+44)' },
  { code: '234', label: '🇳🇬 Nigeria (+234)' },
  { code: '91', label: '🇮🇳 India (+91)' },
  { code: '61', label: '🇦🇺 Australia (+61)' },
  { code: '27', label: '🇿🇦 South Africa (+27)' },
  { code: '254', label: '🇰🇪 Kenya (+254)' },
  { code: '233', label: '🇬🇭 Ghana (+233)' },
  { code: '49', label: '🇩🇪 Germany (+49)' },
  { code: '33', label: '🇫🇷 France (+33)' },
  { code: '55', label: '🇧🇷 Brazil (+55)' },
  { code: '52', label: '🇲🇽 Mexico (+52)' },
  { code: '34', label: '🇪🇸 Spain (+34)' },
  { code: '39', label: '🇮🇹 Italy (+39)' },
  { code: '81', label: '🇯🇵 Japan (+81)' },
  { code: '86', label: '🇨🇳 China (+86)' },
  { code: '971', label: '🇦🇪 UAE (+971)' },
  { code: '92', label: '🇵🇰 Pakistan (+92)' },
  { code: '62', label: '🇮🇩 Indonesia (+62)' },
  { code: '60', label: '🇲🇾 Malaysia (+60)' },
  { code: '63', label: '🇵🇭 Philippines (+63)' },
  { code: '65', label: '🇸🇬 Singapore (+65)' },
  { code: '20', label: '🇪🇬 Egypt (+20)' },
  { code: '212', label: '🇲🇦 Morocco (+212)' },
  { code: '966', label: '🇸🇦 Saudi Arabia (+966)' },
  { code: '31', label: '🇳🇱 Netherlands (+31)' },
  { code: '41', label: '🇨🇭 Switzerland (+41)' },
  { code: '46', label: '🇸🇪 Sweden (+46)' },
  { code: '47', label: '🇳🇴 Norway (+47)' },
  { code: '45', label: '🇩🇰 Denmark (+45)' },
  { code: '358', label: '🇫🇮 Finland (+358)' },
  { code: '48', label: '🇵🇱 Poland (+48)' },
  { code: '43', label: '🇦🇹 Austria (+43)' },
  { code: '351', label: '🇵🇹 Portugal (+351)' },
  { code: '353', label: '🇮🇪 Ireland (+353)' },
  { code: '64', label: '🇳🇿 New Zealand (+64)' },
  { code: '54', label: '🇦🇷 Argentina (+54)' },
  { code: '56', label: '🇨🇱 Chile (+56)' },
  { code: '57', label: '🇨🇴 Colombia (+57)' },
  { code: '51', label: '🇵🇪 Peru (+51)' },
  { code: '58', label: '🇻🇪 Venezuela (+58)' },
  { code: '256', label: '🇺🇬 Uganda (+256)' },
  { code: '255', label: '🇹🇿 Tanzania (+255)' },
  { code: '260', label: '🇿🇲 Zambia (+260)' },
  { code: '263', label: '🇿🇼 Zimbabwe (+263)' },
  { code: '221', label: '🇸🇳 Senegal (+221)' },
  { code: '225', label: '🇨🇮 Ivory Coast (+225)' },
  { code: '237', label: '🇨🇲 Cameroon (+237)' },
  { code: '94', label: '🇱🇰 Sri Lanka (+94)' },
  { code: '880', label: '🇧🇩 Bangladesh (+880)' },
  { code: '977', label: '🇳🇵 Nepal (+977)' }
]

interface PhoneInputProps {
  label: string
  value: string
  onChange: (val: string) => void
  disabled: boolean
  onErrorChange: (hasError: boolean) => void
}

function PhoneInput({ label, value, onChange, disabled, onErrorChange }: PhoneInputProps) {
  const [code, setCode] = useState('234')
  const [local, setLocal] = useState('')
  const [error, setError] = useState('')

  // Parse existing number once on mount or when value populates externally
  useEffect(() => {
    if (value && !local) {
      // Find the longest matching country code
      const match = [...COUNTRY_CODES]
        .sort((a, b) => b.code.length - a.code.length)
        .find(c => value.startsWith(c.code))
      
      if (match) {
        setCode(match.code)
        setLocal(value.slice(match.code.length))
      } else {
        setLocal(value)
      }
    }
  }, [value])

  const validate = (c: string, l: string) => {
    const cleanLocal = l.replace(/^0+/, '')
    const full = c + cleanLocal
    
    if (l.length === 0) {
      setError('')
      onErrorChange(true)
      return
    }

    if (full.length < 10) {
      setError('Number is too short')
      onErrorChange(true)
    } else if (full.length > 15) {
      setError('Number is too long')
      onErrorChange(true)
    } else {
      setError('')
      onErrorChange(false)
    }
    
    onChange(full)
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value
    setCode(newCode)
    validate(newCode, local)
  }

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocal = e.target.value.replace(/\D/g, '')
    setLocal(newLocal)
    validate(code, newLocal)
  }

  return (
    <div>
      <label className="text-xs mb-1.5 block font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <div className="flex gap-2">
        <select
          value={code}
          onChange={handleCodeChange}
          disabled={disabled}
          className="w-[140px] px-2 py-2 rounded-md border outline-none disabled:opacity-50 text-[13px]"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: error ? 'var(--red)' : 'var(--border)',
            color: 'var(--text-primary)',
          }}
        >
          {COUNTRY_CODES.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={local}
          onChange={handleLocalChange}
          placeholder="e.g. 706 123 4567"
          disabled={disabled}
          className="flex-1 px-3 py-2 rounded-md border outline-none disabled:opacity-50 text-[13px]"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: error ? 'var(--red)' : 'var(--border)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => { if(!error) e.currentTarget.style.borderColor = 'var(--text-secondary)' }}
          onBlur={(e) => { if(!error) e.currentTarget.style.borderColor = 'var(--border)' }}
        />
      </div>
      {error && <div className="text-[11px] mt-1" style={{ color: 'var(--red)' }}>{error}</div>}
    </div>
  )
}

interface ConnectionPageProps {
  status: string
  pairingCode: string | null
  errorMsg: string | null
  agentNumber: string
  ownerNumber: string
  onAgentNumberChange: (v: string) => void
  onOwnerNumberChange: (v: string) => void
  onStart: () => void
  onStop: () => void
  onUnlink: () => void
}

export default function ConnectionPage({
  status,
  pairingCode,
  errorMsg,
  agentNumber,
  ownerNumber,
  onAgentNumberChange,
  onOwnerNumberChange,
  onStart,
  onStop,
  onUnlink,
}: ConnectionPageProps): React.JSX.Element {
  const [countdown, setCountdown] = useState(60)
  const [showClearedFeedback, setShowClearedFeedback] = useState(false)
  const [hasAgentError, setHasAgentError] = useState(false)
  const [hasOwnerError, setHasOwnerError] = useState(false)

  const handleUnlinkClick = () => {
    onUnlink()
    setShowClearedFeedback(true)
    setTimeout(() => setShowClearedFeedback(false), 2000)
  }

  useEffect(() => {
    if (status === 'waiting-for-code' && pairingCode) {
      setCountdown(60)
      const interval = setInterval(() => {
        setCountdown((p) => (p > 0 ? p - 1 : 0))
      }, 1000)
      return () => clearInterval(interval)
    }
    return undefined
  }, [status, pairingCode])

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
        WhatsApp Connection
      </h1>

      {/* Status Card */}
      <div
        className="rounded-lg p-4 mb-6 border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              backgroundColor:
                status === 'connected'
                  ? 'rgba(34,197,94,0.15)'
                  : status === 'connecting' || status === 'waiting-for-code'
                    ? 'rgba(234,179,8,0.15)'
                    : 'rgba(239,68,68,0.15)',
            }}
          >
            <div
              className={`w-3 h-3 rounded-full ${status === 'connecting' ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor:
                  status === 'connected'
                    ? 'var(--green)'
                    : status === 'connecting' || status === 'waiting-for-code'
                      ? 'var(--yellow)'
                      : 'var(--red)',
              }}
            />
          </div>
          <div>
            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {status === 'connected'
                ? 'Connected'
                : status === 'connecting'
                  ? 'Connecting...'
                  : status === 'waiting-for-code'
                    ? 'Waiting for Pairing'
                    : 'Disconnected'}
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {status === 'connected'
                ? 'WhatsApp bridge is active and listening'
                : status === 'connecting'
                  ? 'Establishing connection...'
                  : status === 'waiting-for-code'
                    ? 'Enter the pairing code on the agent phone'
                    : 'Not connected to WhatsApp'}
            </div>
          </div>
        </div>
      </div>

      {/* Pairing Code Display */}
      {status === 'waiting-for-code' && pairingCode && (
        <div
          className="rounded-lg p-6 mb-6 border text-center"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-xs uppercase font-semibold tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
            Pairing Code
          </div>
          <div
            className="text-4xl tracking-[0.3em] font-mono font-bold py-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {pairingCode}
          </div>
          <div className="mt-3 text-xs" style={{ color: countdown > 0 ? 'var(--text-secondary)' : 'var(--red)' }}>
            {countdown > 0 ? `Expires in ${countdown}s` : 'Code expired — try again'}
          </div>
          <button
            onClick={onStop}
            className="mt-4 text-xs px-4 py-1.5 rounded-md border"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div
          className="rounded-lg p-3 mb-6 border text-sm"
          style={{
            backgroundColor: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.2)',
            color: 'var(--red)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Setup Form */}
      {(status === 'disconnected' || status === 'connected') && (
        <div
          className="rounded-lg p-4 mb-4 border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
        >
          <div className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
            Phone Numbers
          </div>

          <div className="space-y-4">
            <PhoneInput 
              label="Agent WhatsApp Number"
              value={agentNumber}
              onChange={onAgentNumberChange}
              disabled={status === 'connected'}
              onErrorChange={setHasAgentError}
            />

            <PhoneInput 
              label="Your Owner Number"
              value={ownerNumber}
              onChange={onOwnerNumberChange}
              disabled={status === 'connected'}
              onErrorChange={setHasOwnerError}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 mt-auto">
        {status === 'disconnected' && (
          <>
            <button
              onClick={onStart}
              disabled={hasAgentError || hasOwnerError || !agentNumber || !ownerNumber}
              className="w-full py-2.5 rounded-lg font-medium text-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#000',
              }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--accent-hover)' }}
              onMouseLeave={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--accent)' }}
            >
              Link WhatsApp
            </button>
            <button
              onClick={handleUnlinkClick}
              disabled={showClearedFeedback}
              className="w-full py-2 rounded-lg font-medium text-xs active:scale-[0.98] transition-transform"
              style={{
                backgroundColor: showClearedFeedback ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: 'var(--red)',
              }}
            >
              {showClearedFeedback ? 'Session Cleared! ✅' : 'Clear Saved Session (Unlink)'}
            </button>
          </>
        )}

        {status === 'connected' && (
          <>
            <button
              onClick={onStop}
              className="w-full py-2 rounded-lg font-medium text-sm border active:scale-[0.98] transition-transform"
              style={{
                backgroundColor: 'transparent',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              Disconnect
            </button>
            <button
              onClick={handleUnlinkClick}
              disabled={showClearedFeedback}
              className="w-full py-2 rounded-lg font-medium text-xs active:scale-[0.98] transition-transform"
              style={{
                backgroundColor: showClearedFeedback ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: 'var(--red)',
              }}
            >
              {showClearedFeedback ? 'Device Unlinked! ✅' : 'Unlink Device'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
