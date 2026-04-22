/**
 * WhatsApp transport layer (Baileys).
 *
 * Handles connection, pairing, auth persistence, and message routing.
 * Includes health-check heartbeats and auto-reconnect with stale session detection.
 */

import baileysExports, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  Browsers,
  type WASocket,
  type WAMessageKey,
  type WAMessageContent,
} from "@whiskeysockets/baileys";
const makeWASocket = (typeof baileysExports === 'function' ? baileysExports : (baileysExports as any).default || baileysExports);

import NodeCache from "node-cache";
import pino from "pino";
import * as fs from "fs";
import * as path from "path";

// ---- SILENCE LIBSIGNAL NOISE ----
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function isIgnoredNoise(args: any[]): boolean {
  const str = args.map(a => String(a?.stack || a?.message || a)).join(" ");
  return (
    str.includes("Failed to decrypt message") ||
    str.includes("Session error:") ||
    str.includes("Bad MAC") ||
    str.includes("Closing open session") ||
    str.includes("Closing session:") ||
    str.includes("SessionEntry {")
  );
}

function appendToDebugLog(type: string, args: any[]) {
  try {
    const logFile = path.join(process.cwd(), "piwa-baileys.log");
    const text = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" ");
    fs.appendFileSync(logFile, `\n[${type}] ${text}`);
  } catch {}
}

console.log = function (...args) {
  if (isIgnoredNoise(args)) return appendToDebugLog("LOG", args);
  originalConsoleLog.apply(console, args);
};
console.error = function (...args) {
  if (isIgnoredNoise(args)) return appendToDebugLog("ERROR", args);
  originalConsoleError.apply(console, args);
};
console.warn = function (...args) {
  if (isIgnoredNoise(args)) return appendToDebugLog("WARN", args);
  originalConsoleWarn.apply(console, args);
};
// ----------------------------------

export interface WhatsAppBridgeOptions {
  authDir: string;
  agentNumber: string;
  ownerNumber: string;
  onMessage: (text: string, jid: string, pushName: string, bridge: WhatsAppBridge) => void;
  onPairingCode?: (code: string) => void;
  onStatusChange?: (status: "connecting" | "waiting-for-code" | "connected" | "disconnected", error?: string) => void;
  onLog?: (message: string) => void;
}

export interface WhatsAppBridge {
  sendMessage: (jid: string, text: string) => Promise<void>;
  readMessage: (key: any) => Promise<void>;
  startTyping: (jid: string) => void;
  stopTyping: (jid: string) => void;
  close: () => void;
}

const HEALTH_CHECK_INTERVAL = 30_000; // Check every 30 seconds
const MAX_RECONNECT_ATTEMPTS = 3;

export function createWhatsAppBridge(
  opts: WhatsAppBridgeOptions,
): WhatsAppBridge {
  const logFile = path.join(process.cwd(), "piwa-baileys.log");

  const credsPath = path.join(opts.authDir, "creds.json");
  if (fs.existsSync(credsPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
      if (!creds.me) {
        fs.rmSync(opts.authDir, { recursive: true, force: true });
      }
    } catch {
      fs.rmSync(opts.authDir, { recursive: true, force: true });
    }
  }

  fs.mkdirSync(opts.authDir, { recursive: true });

  const logger = pino({ level: "silent" }, pino.destination({ dest: logFile, sync: false }));
  const msgRetryCounterCache = new NodeCache();

  let globalSock: WASocket | null = null;
  let typingTimers = new Map<string, ReturnType<typeof setInterval>>();
  let isClosed = false;
  let isResolved = false;
  let healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  let reconnectAttempts = 0;

  const bridgeObject: WhatsAppBridge = {
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
      if (isClosed) return;
      isClosed = true;
      stopHealthCheck();
      for (const timer of typingTimers.values()) clearInterval(timer);
      typingTimers.clear();
      try { globalSock?.logout(); } catch {}
      try { globalSock?.end(undefined); } catch {}
      globalSock = null;
    },
  };

  function stopHealthCheck() {
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
  }

  function startHealthCheck() {
    stopHealthCheck();
    healthCheckTimer = setInterval(async () => {
      if (isClosed || !globalSock || !isResolved) return;

      try {
        // Send a presence update as a heartbeat. If the session is dead,
        // this will throw or the connection will drop, triggering reconnect.
        await globalSock.sendPresenceUpdate("available");
        
        // Also verify we can still query WhatsApp's directory
        const result = await globalSock.onWhatsApp(opts.ownerNumber);
        if (!result?.[0]?.exists) {
          if (opts.onLog) opts.onLog('⚠️ Health check failed: owner lookup returned empty');
          console.log("[WA] Health check failed: owner lookup returned empty. Session may be stale.");
          handleStaleSession();
        } else {
          // Reset reconnect counter on successful health check
          reconnectAttempts = 0;
        }
      } catch (err) {
        if (opts.onLog) opts.onLog(`⚠️ Health check failed: ${(err as any)?.message || err}`);
        console.log("[WA] Health check failed:", (err as any)?.message || err);
        handleStaleSession();
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  function handleStaleSession() {
    if (isClosed) return;
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      if (opts.onLog) opts.onLog(`🔴 Session dead after ${MAX_RECONNECT_ATTEMPTS} failed checks. Clearing auth...`);
      console.log(`[WA] Session appears dead after ${MAX_RECONNECT_ATTEMPTS} failed health checks. Clearing auth for re-pair.`);
      stopHealthCheck();
      isResolved = false;
      try { globalSock?.end(undefined); } catch {}
      globalSock = null;
      
      // Clear stale auth so next connect gets a fresh pairing code
      if (fs.existsSync(opts.authDir)) {
        fs.rmSync(opts.authDir, { recursive: true, force: true });
        fs.mkdirSync(opts.authDir, { recursive: true });
      }
      
      if (opts.onStatusChange) opts.onStatusChange("disconnected", "Session expired. Please re-link your device.");
    } else {
      if (opts.onLog) opts.onLog(`🔄 Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
      console.log(`[WA] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
      try { globalSock?.end(undefined); } catch {}
      globalSock = null;
      isResolved = false;
      if (opts.onStatusChange) opts.onStatusChange("connecting");
      start().catch(() => {});
    }
  }

  async function start(): Promise<void> {
    if (isClosed) return;
    const { state, saveCreds } = await useMultiFileAuthState(opts.authDir);

    let version: [number, number, number] = [2, 3000, 1015901307];
    try {
      const info = await fetchLatestBaileysVersion();
      version = info.version;
    } catch {}

    let pairingCodeRequested = false;

    const sock = makeWASocket({
      auth: state,
      version,
      browser: Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      logger,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      retryRequestDelayMs: 250,
      syncFullHistory: false,
      msgRetryCounterCache,
      getMessage: async (_key: WAMessageKey): Promise<WAMessageContent | undefined> => {
        return undefined;
      },
    });

    globalSock = sock;

    sock.ev.on("connection.update", async (update) => {
      if (isClosed) return;
      const { connection, lastDisconnect } = update;

      if (
        connection === "connecting" &&
        !sock.authState.creds.registered &&
        !pairingCodeRequested
      ) {
        pairingCodeRequested = true;
        if (opts.onStatusChange) opts.onStatusChange("connecting");
        setTimeout(async () => {
          try {
            const code = await sock.requestPairingCode(opts.agentNumber);
            if (isClosed) return;
            if (opts.onPairingCode) opts.onPairingCode(code);
            if (opts.onStatusChange) opts.onStatusChange("waiting-for-code");
          } catch (err: any) {
            if (isClosed) return;
            const msg = err?.message?.toLowerCase() || "";
            if (msg.includes("400") || msg.includes("not-authorized")) {
              if (opts.onStatusChange) opts.onStatusChange("disconnected", "Agent number not registered on WhatsApp");
              bridgeObject.close();
            } else {
              if (opts.onStatusChange) opts.onStatusChange("disconnected", "Failed to request pairing code");
              bridgeObject.close();
            }
          }
        }, 3000);
      }

      if (connection === "open") {
        if (!isResolved) {
          try {
            const res = await sock.onWhatsApp(opts.ownerNumber);
            if (!res?.[0]?.exists) {
              if (opts.onStatusChange) opts.onStatusChange("disconnected", "Owner number not registered on WhatsApp");
              bridgeObject.close();
              return;
            }
            isResolved = true;
            reconnectAttempts = 0;
            if (opts.onLog) opts.onLog('✅ WhatsApp connected and owner verified');
            if (opts.onStatusChange) opts.onStatusChange("connected");
            
            // Start health check heartbeat
            startHealthCheck();
          } catch (err) {
            if (opts.onStatusChange) opts.onStatusChange("disconnected", "Failed to verify owner number");
            bridgeObject.close();
            return;
          }
        } else {
          // Reconnected after a drop — reset health check
          reconnectAttempts = 0;
          if (opts.onStatusChange) opts.onStatusChange("connected");
          startHealthCheck();
        }
      }

      if (connection === "close") {
        stopHealthCheck();
        globalSock = null;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        
        if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
          // Session is definitively dead — clear auth and notify UI
          if (fs.existsSync(opts.authDir)) fs.rmSync(opts.authDir, { recursive: true, force: true });
          if (opts.onStatusChange) opts.onStatusChange("disconnected", "Session logged out. Please re-link.");
        } else if (statusCode === 515 || statusCode === 428) {
          // Normal restart signal during pairing handshake
          start().catch(() => {});
        } else {
          if (isResolved) {
            // Was previously connected — auto-reconnect
            if (opts.onLog) opts.onLog(`🔄 Connection dropped (code ${statusCode}). Auto-reconnecting...`);
            console.log(`[WA] Connection dropped (code ${statusCode}). Auto-reconnecting...`);
            if (opts.onStatusChange) opts.onStatusChange("connecting");
            start().catch(() => {});
          } else {
            if (opts.onStatusChange) opts.onStatusChange("disconnected", `Connection failed (code ${statusCode}). Please try again.`);
          }
        }
      }
    });

    sock.ev.on("creds.update", async () => {
      try { await saveCreds(); } catch {}
    });

    sock.ev.on("messaging-history.set", (payload: any) => {
      const msgs = payload?.messages ?? [];
      for (const msg of msgs) {
        sock.ev.emit("messages.upsert", { messages: [msg], type: "append" } as any);
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const msg of messages) {
        const jid = msg.key?.remoteJid ?? "";
        const sender = jid.split("@")[0]?.replace(/\D/g, "");
        const fromMe = msg.key?.fromMe ?? false;
        const hasMsg = !!msg?.message;
        const isGroup = jid.includes("@g.us") || jid === "status@broadcast";
        const isOwner = sender === opts.ownerNumber;

        // Emit diagnostic to UI
        if (opts.onLog) {
          let reason = '';
          if (!hasMsg) reason = 'no message body';
          else if (fromMe) reason = 'own message (fromMe)';
          else if (isGroup) reason = 'group/broadcast';
          else if (!isOwner) reason = `sender ${sender} ≠ owner ${opts.ownerNumber}`;
          opts.onLog(
            reason
              ? `⏭️ Skipped: ${reason} [jid=${jid.substring(0, 25)}]`
              : `✅ Accepted msg from ${sender} [jid=${jid.substring(0, 25)}]`
          );
        }

        if (!hasMsg || fromMe) continue;
        // Skip group messages
        if (isGroup) continue;
        if (!isOwner) continue;
        const actualMessage = msg.message?.ephemeralMessage?.message ?? msg.message;
        const text = actualMessage?.conversation ?? actualMessage?.extendedTextMessage?.text ?? "";
        if (!text.trim()) continue;
        const pushName = msg.pushName || "owner";
        try { if (msg.key) await sock.readMessages([msg.key]); } catch {}
        if (isResolved && isClosed === false) {
          opts.onMessage(text, jid, pushName, bridgeObject);
        }
      }
    });
  }

  start().catch(() => {});

  return bridgeObject;
}
