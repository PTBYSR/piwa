<p align="center">
  <img src="piwa-hero.png" alt="Piwa" width="100"/>
</p>

# Piwa

Interact with your machine via a coding agent on WhatsApp.

---

## Get Started (3 Steps)

1. **Install it**
```bash
npm install -g pi-whatsapp-agent
```

2. **Log in**
```bash
piwa login
```

3. **Run it**
```bash
piwa
```

On first run, a QR code will appear. Open **WhatsApp → Settings → Linked Devices → Link a Device**, scan the code, and you're live.

> **Desktop app coming soon** — contributions are very welcome! See the [Development](#development) section to run locally.

---

## Detailed Usage

### Prerequisites
- **Node.js** v18.0.0 or higher.
- A **WhatsApp account** with a secondary phone number for the agent.
- **API keys** for at least one supported LLM provider (Google Gemini, Anthropic, or OpenAI).

### Installation
If you cloned the repository locally:

```bash
cd piwa
npm install
```

Or install globally:

```bash
npm install -g pi-whatsapp-agent
```

### Authenticate
Piwa looks for API keys in `~/.pi/agent/auth.json`. If you haven't authenticated yet, run:

```bash
piwa login
```

Or manually add your API keys to `~/.pi/agent/auth.json`.

### First Run & Pairing
Launch the WhatsApp bridge and terminal UI:

```bash
piwa
```

You'll be guided through a zero-friction pairing process:
- A QR code appears in your terminal.
- Open WhatsApp on your phone → Settings → Linked Devices → Link a Device.
- Scan the QR code to connect your agent number.

Once paired, the bridge stays active and you can send commands via WhatsApp.

### Common CLI Commands
| Command      | Description                                       |
|--------------|---------------------------------------------------|
| `piwa`       | Starts the agent bridge and TUI                 |
| `piwa status`| Shows current pairing and configuration status    |
| `piwa help`  | Displays the help menu                            |
| `piwa logout`| Removes saved authentication                      |

### Stopping the Agent
Press `Ctrl + C` in the terminal to gracefully shut down the bridge.

---

## Features

- **Hardware-Aware Safety:** Proactively prevents running intensive agent tasks that exceed your system's hardware limits.
- **Instant Public URLs:** Generates secure, public URLs for your agent endpoints automatically.
- **Real-Time Telemetry:** Monitor agent performance (CPU, GPU, RAM) directly from the desktop interface.
- **Dual Interface:** Run the native terminal UI and the WhatsApp bridge simultaneously.

## Development

### Desktop App
```bash
cd piwa-desktop
npm install
npm run dev
```

### CLI Bridge
```bash
npm install
npm start
```

## Requirements

- **Runtime:** Node.js (v18.0.0 or higher).
- **WhatsApp:** A secondary number for the Agent and your personal number for the Owner.
- **API Keys:** Supports Google Gemini, Anthropic, and OpenAI.

## Authentication

Piwa uses the native `pi-coding-agent` for authentication. It will automatically find existing keys in `~/.pi/agent/auth.json`. You can also use `/login` in the terminal to connect OAuth providers.

## License

MIT
