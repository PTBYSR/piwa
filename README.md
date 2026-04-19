<p align="center">
  <img src="header.png" alt="PIWA Header">
</p>

<p align="center">
  <b>Pi WhatsApp Agent</b><br>
  A WhatsApp bridge for the <a href="https://github.com/badlogic/pi-mono">pi coding agent</a>.
</p>

---

PIWA lets you interact with an autonomous AI coding agent directly via WhatsApp. It acts as a lightweight messaging layer on top of the Pi agent framework. 

Adapt your agent to your commute. No laptop required—just text your agent architectural questions, ask it to read logs, or have it write code on your host machine while you are away from your desk.

## 📋 Requirements

* **Runtime:** Node.js (v18.0.0 or higher).
* **WhatsApp Accounts:** 
  * A secondary phone number to act as the "Agent".
  * Your personal phone number to act as the "Owner".
* **API Key:** A Google Gemini API key (defaults to `gemini-2.5-flash`).

## 🚀 Quick Start

```bash
git clone https://github.com/PTBYSR/piwa-local.git
cd piwa-local
npm install
```

Create and configure your `.env` file:
```text
WORK_DIR=./work
# AGENT_NUMBER: The bot's number (Country code + number, NO plus sign)
AGENT_NUMBER=1234567890   
# OWNER_NUMBER: YOUR number (Only this number can command the agent)
OWNER_NUMBER=0987654321   
# GEMINI API KEY: Your Google AI Studio key
GEMINI_API_KEY=your_google_gemini_api_key
```

Start the bridge:
```bash
npm start
```

## 🛠️ WhatsApp Linking

PIWA uses a seamless pairing code (no QR code scanning required):

1. Run `npm start`.
2. Wait a few seconds for an **8-character Pairing Code** to appear in your terminal.
3. Open WhatsApp on your **Agent phone**.
4. Go to **Settings > Linked Devices > Link a Device**.
5. Select **Link with phone number instead**.
6. Enter the code from your terminal.

Once linked, the `work/auth/` folder will securely store your session keys so you don't have to re-pair on restarts.

## ⚙️ How It Works

* **Dual Interface:** When you run `npm start`, the native `pi` Terminal UI (TUI) opens on your machine. You can watch the agent "think", run `bash` commands, and edit files in real-time on your computer screen while it simultaneously chats with you on WhatsApp.
* **Agentic Tools:** Inherits the Pi framework's powerful capabilities (`read`, `write`, `bash`, `edit`, `ls`, `grep`, `find`).
* **Secure:** A hardcoded whitelist ensures that **only** the `OWNER_NUMBER` can execute commands on the host machine. All other messages (group chats, spam, etc.) are silently dropped.
* **WhatsApp Commands:** Text `/help` to the bot to see available commands like `/compact` (to summarize old context and save tokens) or `/tokens` (to see usage stats).

## Acknowledgements

PIWA is built entirely on top of [Mario Zechner's](https://github.com/badlogic) fantastic **Pi** agent framework. Uses `@whiskeysockets/baileys` for the WhatsApp Web protocol.

## License
MIT