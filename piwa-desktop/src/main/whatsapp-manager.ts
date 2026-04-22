import { ipcMain, BrowserWindow, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { loadConfig, saveConfig } from './config';
import { createWhatsAppBridge, WhatsAppBridge } from './whatsapp';
import { handleWhatsAppMessage } from './agent';
import {
  AuthStorage,
  SessionManager,
  createAgentSessionRuntime,
  createAgentSessionFromServices,
  createAgentSessionServices,
  getAgentDir,
  type AgentSession,
  type AgentSessionEvent,
} from "@mariozechner/pi-coding-agent";

let activeBridge: WhatsAppBridge | null = null;
let waProcessing: Promise<unknown> = Promise.resolve();

// Shared runtime references (set when agent starts)
let activeSession: AgentSession | null = null;
let activeRuntime: any = null;

export function initWhatsAppManager(mainWindow: BrowserWindow) {
  // ── Config ──
  ipcMain.handle('get-config', () => loadConfig());
  ipcMain.handle('save-config', (_, config) => { saveConfig(config); return true; });

  // ── Start Agent ──
  ipcMain.handle('start-agent', async (_, { agentNumber, ownerNumber }) => {
    if (activeBridge) return;

    saveConfig({ agentNumber, ownerNumber });

    const cwd = process.cwd();
    const agentDir = getAgentDir();
    const authStorage = AuthStorage.create();
    const sessionManager = SessionManager.create(cwd);

    const createRuntime = async () => {
      const services = await createAgentSessionServices({
        cwd,
        agentDir,
        authStorage,
        resourceLoaderOptions: {
          appendSystemPrompt: [
            "You are Piwa, a WhatsApp AI coding agent. When the user says a generic greeting like 'hi', 'hello', or 'hey', SIMPLY greet them back and ask how you can help. DO NOT autonomously explore the filesystem or project inventory unless explicitly requested to do so. Keep your WhatsApp responses concise."
          ]
        }
      });

      const { settingsManager, modelRegistry } = services;

      const savedProvider = settingsManager.getDefaultProvider();
      const savedModelId = settingsManager.getDefaultModel();

      let model: any;
      if (savedProvider && savedModelId) {
        model = modelRegistry.find(savedProvider, savedModelId);
      }

      if (!model) {
        const allModels = modelRegistry.getAll();
        model = allModels.length > 0 ? allModels[0] : null;
      }

      if (!model) {
        throw new Error("No models available. Please set an API key using the pi CLI.");
      }

      const thinkingLevel = settingsManager.getDefaultThinkingLevel() || "medium";

      console.log(`[Piwa] Using model: ${model.provider}/${model.id}`);

      const sessionObj = await createAgentSessionFromServices({
        services,
        sessionManager,
        model,
        thinkingLevel: thinkingLevel as any,
      });

      return {
        ...sessionObj,
        services,
        diagnostics: [],
      };
    };

    const runtime = await createAgentSessionRuntime(createRuntime, {
      cwd,
      agentDir,
      sessionManager,
    });

    activeSession = runtime.session;
    activeRuntime = runtime;

    // Send initial model info to renderer
    if (runtime.session.model) {
      mainWindow.webContents.send('agent-status', 'idle');
    }

    // Subscribe to agent events for activity feed
    runtime.session.subscribe((event: AgentSessionEvent) => {
      if (event.type === 'message_start') {
        mainWindow.webContents.send('agent-status', 'thinking');
      }
      if (event.type === 'message_end') {
        mainWindow.webContents.send('agent-status', 'idle');
      }
    });

    activeBridge = createWhatsAppBridge({
      authDir: path.join(cwd, ".piwa-auth"),
      agentNumber,
      ownerNumber,
      onPairingCode: (code) => {
        mainWindow.webContents.send('wa-pairing-code', code);
      },
      onStatusChange: (status, error) => {
        mainWindow.webContents.send('wa-status', { status, error });
        if (status === 'disconnected') {
          activeBridge?.close();
          activeBridge = null;
        }
      },
      onLog: (message) => {
        mainWindow.webContents.send('wa-log', message);
      },
      onMessage: (text, jid, _pushName, bridge) => {
        if (!bridge) return;

        // Send to activity feed
        mainWindow.webContents.send('wa-message', {
          id: Date.now().toString(),
          direction: 'in' as const,
          text,
          time: new Date().toLocaleTimeString(),
        });

        waProcessing = waProcessing.then(async () => {
          bridge.startTyping(jid);
          const sendChunk = async (chunk: string) => {
            await bridge.sendMessage(jid, chunk);
            mainWindow.webContents.send('wa-message', {
              id: Date.now().toString(),
              direction: 'out' as const,
              text: chunk,
              time: new Date().toLocaleTimeString(),
            });
          };

          try {
            const reply = await handleWhatsAppMessage(runtime.session, text, sendChunk);
            if (reply) {
              await bridge.sendMessage(jid, reply);
              mainWindow.webContents.send('wa-message', {
                id: Date.now().toString(),
                direction: 'out' as const,
                text: reply,
                time: new Date().toLocaleTimeString(),
              });
            }
          } catch (err: any) {
            const errorMsg = err?.message?.toLowerCase() || "";
            if (errorMsg.includes("api key")) {
              await bridge.sendMessage(jid, "⚠️ API Key Missing! Please check settings.");
            } else {
              await bridge.sendMessage(jid, "⚠️ agent error, check app");
            }
          } finally {
            bridge.stopTyping(jid);
          }
        }).catch(() => {});
      }
    });
  });

  // ── Stop / Unlink ──
  ipcMain.handle('stop-agent', () => {
    if (activeBridge) {
      activeBridge.close();
      activeBridge = null;
      activeSession = null;
      activeRuntime = null;
      mainWindow.webContents.send('wa-status', { status: 'disconnected' });
    }
  });

  ipcMain.handle('unlink-agent', () => {
    if (activeBridge) {
      activeBridge.close();
      activeBridge = null;
      activeSession = null;
      activeRuntime = null;
    }
    const authDir = path.join(process.cwd(), ".piwa-auth");
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    mainWindow.webContents.send('wa-status', { status: 'disconnected' });
  });

  // ── Models ──
  ipcMain.handle('get-models', () => {
    if (!activeSession) return [];
    try {
      const all = activeSession.modelRegistry.getAll();
      return all.map((m: any) => ({
        provider: m.provider,
        id: m.id,
        name: m.name || m.id,
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('set-model', async (_, { provider, modelId }) => {
    if (!activeSession || !activeRuntime) return false;
    try {
      const model = activeSession.modelRegistry.find(provider, modelId);
      if (!model) return false;
      await activeSession.setModel(model);
      activeRuntime.services.settingsManager.setDefaultModelAndProvider(provider, modelId);
      console.log(`[Piwa] Model changed to: ${provider}/${modelId}`);
      return true;
    } catch (err) {
      console.error('[Piwa] Failed to set model:', err);
      return false;
    }
  });

  // ── Thinking Level ──
  ipcMain.handle('get-thinking-level', () => {
    return activeSession?.thinkingLevel || 'medium';
  });

  ipcMain.handle('set-thinking-level', (_, level) => {
    if (!activeSession || !activeRuntime) return false;
    try {
      activeSession.setThinkingLevel(level);
      activeRuntime.services.settingsManager.setDefaultThinkingLevel(level);
      console.log(`[Piwa] Thinking level changed to: ${level}`);
      return true;
    } catch {
      return false;
    }
  });

  // ── Providers / Auth ──
  ipcMain.handle('get-providers', () => {
    if (!activeSession) return [];
    try {
      const authStorage = activeSession.modelRegistry.authStorage;
      const oauthProviders = authStorage.getOAuthProviders();
      const oauthIds = new Set(oauthProviders.map((p: any) => p.id));

      // Collect unique providers from all models
      const allModels = activeSession.modelRegistry.getAll();
      const providerSet = new Set(allModels.map((m: any) => m.provider));

      return Array.from(providerSet).map((id) => ({
        id,
        name: id,
        hasAuth: authStorage.hasAuth(id as string),
        isOAuth: oauthIds.has(id),
      }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('login-provider', async (_, providerId) => {
    if (!activeSession) return false;
    try {
      const authStorage = activeSession.modelRegistry.authStorage;
      await authStorage.login(providerId, {
        onAuth: (info: { url: string }) => {
          shell.openExternal(info.url);
        },
        onPrompt: async (_prompt: { message: string }) => {
          // For OAuth prompts, we just return empty — the browser handles it
          return '';
        },
        onProgress: (message: string) => {
          console.log(`[Piwa] OAuth: ${message}`);
        },
      });
      return true;
    } catch (err) {
      console.error('[Piwa] Login failed:', err);
      return false;
    }
  });

  ipcMain.handle('logout-provider', (_, provider) => {
    if (!activeSession) return false;
    try {
      activeSession.modelRegistry.authStorage.logout(provider);
      return true;
    } catch {
      return false;
    }
  });

  ipcMain.handle('set-api-key', (_, { provider, key }) => {
    if (!activeSession) return false;
    try {
      activeSession.modelRegistry.authStorage.set(provider, { type: 'api_key', key });
      return true;
    } catch {
      return false;
    }
  });

  // ── Session Stats ──
  ipcMain.handle('get-session-stats', () => {
    if (!activeSession) return null;
    try {
      const stats = activeSession.getSessionStats();
      return {
        totalMessages: stats.totalMessages,
        tokens: {
          total: stats.tokens.total,
          input: stats.tokens.input,
          output: stats.tokens.output,
        },
      };
    } catch {
      return null;
    }
  });

  // ── Compact ──
  ipcMain.handle('compact-session', async () => {
    if (!activeSession) return null;
    try {
      const result = await activeSession.compact();
      return { tokensBefore: result.tokensBefore };
    } catch (err: any) {
      console.error('[Piwa] Compaction failed:', err);
      return null;
    }
  });

  // ── Settings ──
  ipcMain.handle('get-settings', () => {
    if (!activeSession || !activeRuntime) return null;
    try {
      const sm = activeRuntime.services.settingsManager;
      const model = activeSession.model;
      return {
        model: model?.id || sm.getDefaultModel(),
        provider: model?.provider || sm.getDefaultProvider(),
        thinkingLevel: activeSession.thinkingLevel || sm.getDefaultThinkingLevel() || 'medium',
        autoCompaction: sm.getCompactionEnabled(),
        autoRetry: sm.getRetryEnabled(),
      };
    } catch {
      return null;
    }
  });

  ipcMain.handle('set-setting', (_, { key, value }) => {
    if (!activeRuntime) return false;
    try {
      const sm = activeRuntime.services.settingsManager;
      switch (key) {
        case 'autoCompaction':
          sm.setCompactionEnabled(value);
          break;
        case 'autoRetry':
          sm.setRetryEnabled(value);
          break;
        default:
          return false;
      }
      return true;
    } catch {
      return false;
    }
  });
}
