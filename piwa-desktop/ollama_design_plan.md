# PIWA Desktop — UI Refactor Implementation Plan
## Design Reference: Ollama Desktop App

---

## 🎨 Design System (Ollama's Visual Language)

| Element | Ollama Value |
|---|---|
| **Background** | `#1a1a1a` (main), `#0f0f0f` (sidebar) |
| **Surface** | `#262626` (cards/inputs) |
| **Border** | `#333333` |
| **Text Primary** | `#e5e5e5` |
| **Text Secondary** | `#737373` |
| **Accent** | White on dark (buttons), minimal color |
| **Font** | System sans-serif, 13-14px base |
| **Radius** | `8px` cards, `6px` inputs, `20px` pills |
| **Sidebar** | 56px wide, icon-only, dark strip on the left |
| **Window** | Frameless, custom title bar, dark-mode only |

---

## 📐 Layout Architecture

```
┌──────────────────────────────────────────────┐
│  ● ● ●   PIWA                    ─  □  ✕   │  ← Custom Titlebar (draggable)
├────┬─────────────────────────────────────────┤
│    │                                         │
│ 💬 │   Main Content Area                     │
│    │   (changes based on active sidebar icon) │
│ 🔌 │                                         │
│    │                                         │
│ ⚙️ │                                         │
│    │                                         │
│    │                                         │
│    │                                         │
├────┴─────────────────────────────────────────┤
│  🟢 Connected  ·  claude-opus-4-6-thinking   │  ← Status Bar
└──────────────────────────────────────────────┘
```

---

## 📋 Sidebar Icons & Pages

### 1. 💬 Chat / Activity (default page)
- Shows real-time agent status: `Idle`, `Thinking...`, `Executing bash...`
- Displays the last few WhatsApp messages received/sent (read-only feed)
- "Clear Memory" button (calls `session.compact()`)
- Token usage bar (from `session.getSessionStats()`)

### 2. 🔌 Connection
- WhatsApp connection status with health indicator
- Setup wizard (agent number / owner number inputs)
- Pairing code display with countdown timer
- "Link WhatsApp" / "Unlink Device" buttons
- Auto-reconnect status feedback

### 3. ⚙️ Settings
Split into sections:

#### Model
- Model dropdown (from `modelRegistry.getAll()`)
- Thinking level selector: `off | minimal | low | medium | high` (from `session.setThinkingLevel()`)
- Current model display with provider badge

#### Authentication
- List of providers with auth status (from `authStorage.list()` + `authStorage.has()`)
- "Login" button per provider (calls `authStorage.login()`)
- "Logout" button (calls `authStorage.logout()`)
- API key input field (calls `authStorage.set()`)

#### Agent
- Auto-compaction toggle (`settingsManager.setCompactionEnabled()`)
- Auto-retry toggle (`settingsManager.setRetryEnabled()`)
- Streaming chunk interval slider (FLUSH_MS)
- System prompt preview (read-only, from `session.systemPrompt`)

---

## 🔧 Implementation Phases

### Phase 1: Layout Shell & Design System (do first)
- [ ] Create `tailwind.config` with Ollama color tokens
- [ ] Build `<Sidebar>` component (56px icon strip)
- [ ] Build `<Titlebar>` component (frameless window controls)
- [ ] Build `<StatusBar>` component
- [ ] Set up React Router or state-based page switching
- [ ] Resize window to `900×600` (wider for sidebar layout)

### Phase 2: Connection Page (port existing logic)
- [ ] Move current setup/pairing UI into `<ConnectionPage>`
- [ ] Add health check status indicator
- [ ] Add auto-reconnect feedback

### Phase 3: IPC Endpoints for New Features
New `ipcMain.handle` endpoints in `whatsapp-manager.ts`:
- [ ] `get-models` → returns `modelRegistry.getAll()` serialized
- [ ] `set-model` → calls `session.setModel()` + `settingsManager.setDefaultModelAndProvider()`
- [ ] `get-thinking-level` → returns current thinking level
- [ ] `set-thinking-level` → calls `session.setThinkingLevel()`
- [ ] `get-providers` → returns auth status for each provider
- [ ] `login-provider` → calls `authStorage.login()` (opens browser)
- [ ] `logout-provider` → calls `authStorage.logout()`
- [ ] `set-api-key` → calls `authStorage.set(provider, { type: "api_key", key })`
- [ ] `get-session-stats` → returns `session.getSessionStats()`
- [ ] `compact-session` → calls `session.compact()`
- [ ] `get-settings` → returns compaction, retry, thinking level settings
- [ ] `set-setting` → generic setter for toggle settings

### Phase 4: Settings Page
- [ ] Build `<ModelSelector>` dropdown with provider grouping
- [ ] Build `<ThinkingLevelSelector>` pill group
- [ ] Build `<AuthProviderList>` with login/logout/API key entry
- [ ] Build `<AgentSettings>` toggles section

### Phase 5: Activity Page
- [ ] Build `<ActivityFeed>` showing message log from WhatsApp
- [ ] Build `<TokenUsage>` bar visualization
- [ ] Build `<AgentStatus>` indicator (Idle / Thinking / Executing)
- [ ] Wire `session.subscribe()` events through IPC to renderer

### Phase 6: Polish
- [ ] Window min/max/close buttons in titlebar
- [ ] Keyboard shortcuts
- [ ] Persist window position/size
- [ ] System tray with right-click "Quit"
- [ ] `.exe` installer branding (icon, name, publisher)

---

## 📁 New File Structure

```
src/
├── main/
│   ├── index.ts              (Electron main, window, tray)
│   ├── whatsapp.ts           (Baileys bridge)
│   ├── whatsapp-manager.ts   (IPC endpoints - expanded)
│   ├── agent.ts              (session bridge)
│   └── config.ts             (piwa.config.json)
├── preload/
│   └── index.ts
├── renderer/
│   └── src/
│       ├── App.tsx            (layout shell + router)
│       ├── components/
│       │   ├── Sidebar.tsx
│       │   ├── Titlebar.tsx
│       │   └── StatusBar.tsx
│       ├── pages/
│       │   ├── ActivityPage.tsx
│       │   ├── ConnectionPage.tsx
│       │   └── SettingsPage.tsx
│       └── assets/
│           └── main.css       (Tailwind + Ollama tokens)
```

---

## 🔑 Key pi-coding-agent APIs Used

### AgentSession
```typescript
session.prompt(text)                    // Send a message
session.abort()                         // Abort current generation
session.compact()                       // Compress conversation history
session.setModel(model)                 // Switch AI model
session.setThinkingLevel(level)         // Set thinking depth
session.subscribe(listener)             // Listen for streaming events
session.getSessionStats()               // Token usage & message counts
session.getLastAssistantText()          // Get last response text
session.isStreaming                      // Check if currently generating
session.model                           // Current model
session.thinkingLevel                   // Current thinking level
session.systemPrompt                    // Current system prompt
session.messages                        // Full conversation transcript
```

### ModelRegistry
```typescript
modelRegistry.getAll()                  // All registered models
modelRegistry.getAvailable()            // Models with valid auth
modelRegistry.find(provider, modelId)   // Find specific model
```

### SettingsManager
```typescript
settingsManager.getDefaultProvider()           // Current default provider
settingsManager.getDefaultModel()              // Current default model ID
settingsManager.setDefaultModelAndProvider()    // Change default model
settingsManager.getDefaultThinkingLevel()      // Thinking level preference
settingsManager.setDefaultThinkingLevel()      // Change thinking level
settingsManager.getCompactionEnabled()         // Auto-compaction on/off
settingsManager.setCompactionEnabled()         // Toggle auto-compaction
settingsManager.getRetryEnabled()              // Auto-retry on/off
settingsManager.setRetryEnabled()              // Toggle auto-retry
```

### AuthStorage
```typescript
authStorage.list()                      // All providers with credentials
authStorage.has(provider)               // Check if provider has auth
authStorage.hasAuth(provider)           // Check any form of auth
authStorage.login(providerId, cbs)      // OAuth login (opens browser)
authStorage.logout(provider)            // Remove credentials
authStorage.set(provider, credential)   // Set API key manually
authStorage.getApiKey(provider)         // Resolve API key
authStorage.getOAuthProviders()         // List OAuth-capable providers
```
