/**
 * PIWA — Pi WhatsApp Agent with native terminal TUI.
 *
 * Starts two systems sharing one AgentSession:
 *   1. The native pi InteractiveMode TUI (full terminal coding-agent view)
 *   2. A WhatsApp bridge (Baileys) that mirrors messages in/out
 *
 * Messages from WhatsApp appear in the TUI as user messages.
 * Agent responses are rendered in the TUI AND sent back via WhatsApp.
 * You can also type directly in the TUI — WhatsApp is just a remote input.
 */

import "dotenv/config";

import * as fs from "fs";
import * as path from "path";
import { getModel } from "@mariozechner/pi-ai";
import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  SettingsManager,
  InteractiveMode,
  createAgentSessionRuntime,
  createAgentSessionFromServices,
  createAgentSessionServices,
  getAgentDir,
  initTheme,
  type AgentSessionRuntime,
  type CreateAgentSessionRuntimeFactory,
} from "@mariozechner/pi-coding-agent";

import { createWhatsAppBridge, type WhatsAppBridge } from "./whatsapp.js";
import { handleWhatsAppMessage } from "./agent.js";

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------

const WORK_DIR = process.env.WORK_DIR || process.cwd();
const AGENT_NUMBER = (process.env.AGENT_NUMBER || "").replace(/[^0-9]/g, "");
const OWNER_NUMBER = (process.env.OWNER_NUMBER || "").replace(/[^0-9]/g, "");

if (!AGENT_NUMBER) {
  console.error("⚠️  AGENT_NUMBER env var is required (digits only, no +).");
  process.exit(1);
}
if (!OWNER_NUMBER) {
  console.error("⚠️  OWNER_NUMBER env var is required (digits only, no +).");
  process.exit(1);
}

fs.mkdirSync(WORK_DIR, { recursive: true });

// -----------------------------------------------------------------------------
// Bootstrap
// -----------------------------------------------------------------------------

async function main() {
  const cwd = process.cwd();
  const agentDir = getAgentDir();
  const authStorage = AuthStorage.create();

  // ---- Create runtime factory (simplified from pi's main.ts) ----
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd: runtimeCwd,
    agentDir: runtimeAgentDir,
    sessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({
      cwd: runtimeCwd,
      agentDir: runtimeAgentDir,
      authStorage,
      resourceLoaderOptions: {
        appendSystemPrompt: [
          "You are PIWA, a WhatsApp AI coding agent. When the user says a generic greeting like 'hi', 'hello', or 'hey', SIMPLY greet them back and ask how you can help. DO NOT autonomously explore the filesystem or project inventory unless explicitly requested to do so. Keep your WhatsApp responses concise."
        ]
      }
    });

    const { settingsManager, modelRegistry, resourceLoader } = services;

    // Resolve model
    const model = getModel("google", "gemini-2.5-flash");

    const created = await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,
      model,
      thinkingLevel: "medium",
    });

    return {
      ...created,
      services,
      diagnostics: [...services.diagnostics],
    };
  };

  // ---- Create session manager ----
  const sessionManager = SessionManager.create(cwd);

  // ---- Build runtime ----
  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir,
    sessionManager,
  });

  const { services } = runtime;
  const { settingsManager } = services;

  // ---- Initialize theme ----
  initTheme(settingsManager.getTheme(), true);

  // ---- Start the native pi TUI ----
  const interactiveMode = new InteractiveMode(runtime, {
    verbose: false,
  });

  // ---- Start WhatsApp bridge (non-blocking) ----
  let waBridge: WhatsAppBridge | null = null;

  // Processing lock — one WhatsApp message at a time
  let waProcessing: Promise<unknown> = Promise.resolve();

  createWhatsAppBridge({
    workDir: WORK_DIR,
    agentNumber: AGENT_NUMBER,
    ownerNumber: OWNER_NUMBER,
    onMessage: (text, jid, pushName, bridge) => {
      // Serialize WhatsApp message handling
      waProcessing = waProcessing.then(async () => {
        bridge.startTyping(jid);

        const sendChunk = async (chunk: string) => {
          await bridge.sendMessage(jid, chunk);
        };

        try {
          const reply = await handleWhatsAppMessage(
            runtime.session,
            text,
            sendChunk,
          );
          if (reply) {
            await bridge.sendMessage(jid, reply);
          }
        } catch (err) {
          // Send simple error to WhatsApp
          await bridge
            .sendMessage(jid, "⚠️ agent error, check terminal")
            .catch(() => {});
        } finally {
          bridge.stopTyping(jid);
        }
      }).catch(err => {
        // Prevent the waProcessing queue from permanently failing if an unexpected error occurs
      });
    },
  })
    .then((bridge) => {
      waBridge = bridge;
    })
    .catch((err) => {
      console.error("[PIWA] WhatsApp bridge failed to start:", err);
      console.error("[PIWA] Terminal TUI is still running without WhatsApp.");
    });

  // ---- Graceful shutdown ----
  process.on("SIGINT", () => {
    waBridge?.close();
    // InteractiveMode handles its own SIGINT cleanup
  });

  // ---- Run the TUI (blocks until exit) ----
  await interactiveMode.run();
}

main().catch((err) => {
  console.error("Failed to start PIWA:", err);
  process.exit(1);
});
