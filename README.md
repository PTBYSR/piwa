<p align="center">
  <img src="piwa-hero.png" alt="Piwa" width="200"/>
</p>

# Piwa

Interact with your machine via a coding agent on WhatsApp.

## Download

### Windows

[Download Piwa Setup for Windows](https://github.com/PTBYSR/piwa/releases/download/v1.0.0/Piwa.Setup.1.0.0.exe)

> **Note:** If Windows SmartScreen shows a "Windows protected your PC" warning, click **More info** and then **Run anyway**. This appears because the app is currently unsigned.

### macOS & Linux

Coming soon.

---

## Get started

### Running the Terminal CLI (User Guide)

#### 1. Prerequisites
Make sure you have the following before starting:
- **Node.js** v18.0.0 or higher installed on your machine.
- A **WhatsApp account** with a secondary phone number for the agent.
- **API keys** for at least one supported LLM provider (Google Gemini, Anthropic, or OpenAI).

#### 2. Install Piwa
If you have cloned the repository locally, install the dependencies:

```bash
cd piwa
npm install
```

Alternatively, if you installed Piwa globally:

```bash
npm install -g pi-whatsapp-agent
```

#### 3. Authenticate
Piwa will look for existing API keys in `~/.pi/agent/auth.json`. If you haven't authenticated yet, run the following in your terminal:

```bash
piwa login
```

Or manually add your API keys to `~/.pi/agent/auth.json`.

#### 4. Start the Agent
To launch the WhatsApp bridge and terminal UI:

```bash
piwa
```

On your **first run**, you will be guided through a zero-friction pairing process:
- A QR code will appear in your terminal.
- Open WhatsApp on your phone → Settings → Linked Devices → Link a Device.
- Scan the QR code to connect your agent number.

Once paired, the agent bridge will stay active and you can start sending commands via WhatsApp.

#### 5. Common CLI Commands
| Command | Description |
|---------|-------------|
| `piwa` | Starts the agent bridge and TUI |
| `piwa status` | Shows current pairing and configuration status |
| `piwa help` | Displays the help menu with all available commands |
| `piwa logout` | Removes saved authentication |

#### 6. Stopping the Agent
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
