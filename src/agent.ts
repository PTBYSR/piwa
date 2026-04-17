import {
  AuthStorage,
  ModelRegistry,
  SessionManager,
  type CreateAgentSessionRuntimeFactory,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  createCodingTools,
  getAgentDir,
} from "@mariozechner/pi-coding-agent";
import type { AgentSessionRuntime } from "@mariozechner/pi-coding-agent";
import { type Model } from "@mariozechner/pi-ai";
import { webSearchTool } from "./web-search.js";
import { createOllamaNativeStream } from "./ollama-provider.js";

const OLLAMA_PROVIDER_ID = "ollama-native";
const OLLAMA_API_ID = "ollama-chat";

export async function createRuntime(modelName: string): Promise<AgentSessionRuntime> {
  const cwd = process.env.WORK_DIR || process.cwd();
  const baseUrl = process.env.OLLAMA_HOST || "http://localhost:11434";

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  // Register a native Ollama provider that talks to /api/chat directly.
  // This bypasses Ollama's OpenAI-compat layer, which fails to parse
  // Qwen2.5-coder tool calls and leaks them as raw JSON text.
  modelRegistry.registerProvider(OLLAMA_PROVIDER_ID, {
    baseUrl,
    apiKey: "ollama",
    api: OLLAMA_API_ID as any,
    streamSimple: createOllamaNativeStream as any,
    models: [
      {
        id: modelName,
        name: `${modelName} (Ollama)`,
        reasoning: false,
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: 32000,
      },
    ],
  });

  const model: Model<any> = modelRegistry.find(OLLAMA_PROVIDER_ID, modelName)!;

  const runtimeFactory: CreateAgentSessionRuntimeFactory = async ({
    sessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({ cwd });
    services.authStorage.setRuntimeApiKey(OLLAMA_PROVIDER_ID, "piwa-local-dummy-key");

    const sessionResult = await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,
      model,
      tools: [...createCodingTools(cwd), webSearchTool as any],
    });

    return {
      ...sessionResult,
      services,
      diagnostics: services.diagnostics,
    };
  };

  return await createAgentSessionRuntime(runtimeFactory, {
    cwd,
    agentDir: getAgentDir(),
    sessionManager: SessionManager.inMemory(),
  });
}
