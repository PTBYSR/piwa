/**
 * WhatsApp transport layer (Baileys).
 *
 * Handles connection, pairing, auth persistence, and message routing.
 * Emits inbound owner messages via a callback; exposes sendMessage for replies.
 */

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
  type WAMessageKey,
  type WAMessageContent,
} from "@whiskeysockets/baileys";
import NodeCache from "node-cache";
import pino from "pino";
import * as fs from "fs";
import * as path from "path";

export interface WhatsAppBridgeOptions {
  workDir: string;
  agentNumber: string;
  ownerNumber: string;
  /** Called when a text message arrives from the owner. */
  onMessage: (text: string, jid: string, pushName: string, bridge: WhatsAppBridge) => void;
}

export interface WhatsAppBridge {
  /** Send a text message to a JID. */
  sendMessage: (jid: string, text: string) => Promise<void>;
  /** Send read receipt for a message key. */
  readMessage: (key: any) => Promise<void>;
  /** Show "typing…" indicator. */
  startTyping: (jid: string) => void;
  /** Clear "typing…" indicator. */
  stopTyping: (jid: string) => void;
  /** Graceful shutdown. */
  close: () => void;
}

export async function createWhatsAppBridge(
  opts: WhatsAppBridgeOptions,
): Promise<WhatsAppBridge> {
  const authDir = path.join(opts.workDir, "auth");
  const logFile = path.join(opts.workDir, "baileys.log");

  fs.mkdirSync(opts.workDir, { recursive: true });
  fs.mkdirSync(authDir, { recursive: true });

  const logger = pino(
    { level: "silent" },
    pino.destination({ dest: logFile, sync: false }),
  );

  const msgRetryCounterCache = new NodeCache();

  let globalSock: WASocket | null = null;
  let typingTimers = new Map<string, ReturnType<typeof setInterval>>();

  function clearAuth() {
    if (fs.existsSync(authDir)) {
      try {
        fs.rmSync(authDir, { recursive: true, force: true });
      } catch {}
    }
  }

  const bridge: WhatsAppBridge = {
    sendMessage: async (jid: string, text: string) => {
      if (globalSock) await globalSock.sendMessage(jid, { text });
    },
    readMessage: async (key: any) => {
      if (globalSock) await globalSock.readMessages([key]);
    },
    startTyping: (jid: string) => {
      if (typingTimers.has(jid)) return;
      globalSock?.sendPresenceUpdate("composing", jid).catch(() => {});
      const timer = setInterval(() => {
        globalSock?.sendPresenceUpdate("composing", jid).catch(() => {});
      }, 10_000);
      typingTimers.set(jid, timer);
    },
    stopTyping: (jid: string) => {
      const timer = typingTimers.get(jid);
      if (timer) {
        clearInterval(timer);
        typingTimers.delete(jid);
      }
      globalSock?.sendPresenceUpdate("paused", jid).catch(() => {});
    },
    close: () => {
      for (const timer of typingTimers.values()) clearInterval(timer);
      typingTimers.clear();
      try {
        globalSock?.end(undefined);
      } catch {}
    },
  };

  async function start(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    let version: [number, number, number];
    try {
      const info = await fetchLatestBaileysVersion();
      version = info.version;
      console.log(`📦 Using WA Web version: ${version.join(".")}`);
    } catch {
      console.warn("⚠️  Could not fetch latest version, using fallback");
      version = [2, 3000, 1015901307];
    }

    const browser: [string, string, string] = ["Mac OS", "Safari", "10.15.7"];
    let pairingCodeRequested = false;

    const sock = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false,
      logger,
      browser,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      retryRequestDelayMs: 250,
      syncFullHistory: false,
      msgRetryCounterCache,
      getMessage: async (key: WAMessageKey): Promise<WAMessageContent | undefined> => {
        return undefined; // Usually you'd fetch from a local DB here if you had one.
      },
    });

    globalSock = sock;

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;

      if (
        connection === "connecting" &&
        !sock.authState.creds.registered &&
        !pairingCodeRequested
      ) {
        pairingCodeRequested = true;
        setTimeout(async () => {
          try {
            console.log(
              `\n📞 Requesting pairing code for ${opts.agentNumber}...`,
            );
            const code = await sock.requestPairingCode(opts.agentNumber);
            console.log(`\n📢 YOUR PAIRING CODE: \x1b[32m${code}\x1b[0m`);
            console.log(
              "👉 WhatsApp → Linked Devices → Link a Device → Link with phone number instead",
            );
          } catch (err) {
            console.error("Failed to request pairing code:", err);
            pairingCodeRequested = false;
          }
        }, 3000);
      }

      if (connection === "open") {
        const botJid = sock.user?.id ?? "";
        const botNumber = botJid.split(":")[0];
        console.log("\n✅ Connected to WhatsApp!");
        console.log(`📱 Bot Number: +${botNumber}`);
        console.log(`👤 Listening for messages from OWNER: +${opts.ownerNumber}`);
      }

      if (connection === "close") {
        globalSock = null;
        const err = lastDisconnect?.error as
          | { output?: { statusCode?: number } }
          | undefined;
        const statusCode = err?.output?.statusCode;

        console.log(`\n🔍 Connection closed: ${statusCode ?? "unknown"}`);

        if (
          statusCode === DisconnectReason.loggedOut ||
          statusCode === 401
        ) {
          console.log("👋 Session invalid. Clearing auth...");
          clearAuth();
          console.log("✅ Auth cleared. Run `npm start` again to re-pair.");
          process.exit(0);
        }

        console.log("♻️  Reconnecting...");
        start().catch((e) => console.error("[WA] restart failed:", e));
      }
    });

    sock.ev.on("creds.update", async () => {
      try {
        await saveCreds();
      } catch (e: any) {
        if (e?.code !== "ENOENT") {
          console.error("[Auth] saveCreds failed:", e?.message || e);
        }
      }
    });

    // Replay offline messages
    sock.ev.on("messaging-history.set" as any, (payload: any) => {
      const msgs: any[] = payload?.messages ?? [];
      if (!msgs.length) return;
      for (const msg of msgs) {
        sock.ev.emit("messages.upsert", {
          messages: [msg],
          type: "append",
        } as any);
      }
    });

    // Inbound messages
    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        fs.appendFileSync("piwa-debug.log", `\n[${new Date().toISOString()}] RAW UPSERT: remoteJid=${msg.key?.remoteJid}, fromMe=${msg.key?.fromMe}, hasMessage=${!!msg.message}`);

        if (!msg?.message) continue;
        if (msg.key?.fromMe) continue;

        const jid = msg.key?.remoteJid ?? "";
        const sender = jid.split("@")[0]?.replace(/\D/g, "");
        
        fs.appendFileSync("piwa-debug.log", `\n[${new Date().toISOString()}] MSG RECEIVED: sender=${sender}, remoteJid=${jid}, text=${JSON.stringify(msg.message)}`);
        
        if (sender !== opts.ownerNumber) {
          fs.appendFileSync("piwa-debug.log", `\n  -> Ignored: sender ${sender} !== owner ${opts.ownerNumber}`);
          continue;
        }

        const actualMessage = msg.message?.ephemeralMessage?.message ?? msg.message;
        const text =
          actualMessage?.conversation ??
          actualMessage?.extendedTextMessage?.text ??
          "";
        
        fs.appendFileSync("piwa-debug.log", `\n  -> Extracted text: "${text}"`);
        
        if (!text.trim()) {
          fs.appendFileSync("piwa-debug.log", `\n  -> Ignored: empty text`);
          continue;
        }

        const pushName = msg.pushName || "owner";

        // Blue ticks
        try {
          if (msg.key) await sock.readMessages([msg.key]);
        } catch {}

        opts.onMessage(text, jid, pushName, bridge);
      }
    });
  }

  await start();

  return bridge;
}
