#!/usr/bin/env tsx
/**
 * Test script: sends a message from the bot to the owner's WhatsApp number.
 *
 * Usage:
 *   npx tsx src/test-send.ts
 *   npx tsx src/test-send.ts "Your custom message here"
 */

import * as fs from "fs";
import * as path from "path";
import makeWASocket, {
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import pino from "pino";

const CONFIG_PATH = path.resolve(process.cwd(), "piwa.config.json");
const AUTH_DIR = path.resolve(process.cwd(), ".piwa-auth");

async function main() {
  // 1. Load config
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("❌ piwa.config.json not found. Run 'piwa' first to set up.");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const ownerNumber: string = config.ownerNumber;

  if (!ownerNumber) {
    console.error("❌ ownerNumber not set in piwa.config.json.");
    process.exit(1);
  }

  // 2. Check auth exists
  if (!fs.existsSync(AUTH_DIR) || fs.readdirSync(AUTH_DIR).length === 0) {
    console.error("❌ No WhatsApp auth found. Run 'piwa' first to pair the bot.");
    process.exit(1);
  }

  // 3. Message to send
  const message = process.argv[2] || "👋 Hello! This is a test message from Piwa. The bot is working!";

  console.log(`📱 Owner number: ${ownerNumber}`);
  console.log(`💬 Message: "${message}"`);
  console.log("⏳ Connecting to WhatsApp...\n");

  // 4. Connect
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  let version: [number, number, number];
  try {
    const info = await fetchLatestBaileysVersion();
    version = info.version;
  } catch {
    version = [2, 3000, 1015901307];
  }

  const logger = pino({ level: "silent" });

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    logger,
    connectTimeoutMs: 30000,
  });

  sock.ev.on("creds.update", saveCreds);

  // 5. Wait for connection, then send
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ Connected!\n");

      try {
        // Resolve owner JID
        const res = await sock.onWhatsApp(ownerNumber);
        const ownerCheck = res?.[0];

        if (!ownerCheck || !ownerCheck.exists) {
          console.error(`❌ Owner number ${ownerNumber} not found on WhatsApp.`);
          sock.end(undefined);
          process.exit(1);
        }

        const ownerJid = ownerCheck.jid;
        console.log(`📍 Resolved owner JID: ${ownerJid}`);
        console.log(`📤 Sending message...\n`);

        await sock.sendMessage(ownerJid, { text: message });

        console.log("✅ Message sent successfully!");
      } catch (err: any) {
        console.error("❌ Failed to send message:", err?.message || err);
      }

      // Give it a moment to flush, then exit
      setTimeout(() => {
        sock.end(undefined);
        process.exit(0);
      }, 2000);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      console.error(`❌ Connection closed (code: ${statusCode}). Make sure 'piwa' has been paired first.`);
      process.exit(1);
    }
  });
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
