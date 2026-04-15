<p align="center">
  <img src="header.png" alt="PIWA Header">
</p>

<p align="center">
  <b>Pi WhatsApp Agent</b><br>
  A minimalistic WhatsApp bridge for the <a href="https://github.com/badlogic/pi-mono">pi coding agent</a>.
</p>

> ⚠️ **Alpha / Work-In-Progress:** The core bridge works, but there is currently a [known bug with how local models output their responses](https://github.com/PTBYSR/piwa-local/issues/1). PRs welcome!

---

PIWA lets you interact with an autonomous AI coding agent directly via WhatsApp. It runs entirely locally on your own hardware using Ollama, acting as a lightweight layer on top of the Pi agent framework. 

Adapt your agent to your commute, not the other way around. No heavy laptop required, no API tokens spent on quick brainstorming.

## Quick Start

```bash
git clone https://github.com/PTBYSR/piwa-local.git
cd piwa-local
npm install
npm run build
```

Set up your `.env` file (copy from `.env.example`):
```text
WORK_DIR=./work
PHONE_NUMBER=your_whatsapp_number
OWNER_NUMBER=your_owner_jid
```

Start the bridge:
```bash
npm start
```

## How It Works

PIWA uses `baileys` to listen to an authorized WhatsApp number. Any incoming messages are forwarded to a local Pi agent session.

- **Local-First:** Designed specifically for Ollama and lightweight local LLMs.
- **Agentic Tools:** Inherits Pi framework capabilities (`read`, `write`, `bash`).
- **Secure:** Hardcoded whitelist ensures only the owner can execute commands on the host machine.

## Philosophy

I built PIWA because opening a laptop on a packed train just to ask my agent for an architectural strategy is a massive pain. Throwing down cash for a Mac Mini just to run a portable server felt like overkill.

PIWA is ridiculously lightweight. It does precisely one thing: ties a messaging app to a local code reasoning engine. No bloat, no unnecessary token fees.

## Acknowledgements

PIWA is built entirely on top of [Mario Zechner's](https://github.com/badlogic) fantastic **Pi** agent framework.

## License
MIT
