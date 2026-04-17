import type {
  AssistantMessage,
  Context,
  Message,
  Model,
  Tool,
} from "@mariozechner/pi-ai";
import { createAssistantMessageEventStream } from "@mariozechner/pi-ai";

type OllamaToolCall = {
  id?: string;
  function?: { name?: string; arguments?: Record<string, unknown> };
};

type OllamaChunk = {
  message?: {
    role?: string;
    content?: string;
    thinking?: string;
    tool_calls?: OllamaToolCall[];
  };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
};

function toOllamaMessages(context: Context) {
  const out: Array<Record<string, unknown>> = [];
  if (context.systemPrompt) {
    out.push({ role: "system", content: context.systemPrompt });
  }
  for (const msg of context.messages as Message[]) {
    if (msg.role === "user") {
      const text =
        typeof msg.content === "string"
          ? msg.content
          : msg.content
              .filter((c) => c.type === "text")
              .map((c) => (c as { text: string }).text)
              .join("");
      out.push({ role: "user", content: text });
    } else if (msg.role === "assistant") {
      const textParts: string[] = [];
      const toolCalls: OllamaToolCall[] = [];
      for (const c of msg.content) {
        if (c.type === "text") textParts.push(c.text);
        else if (c.type === "toolCall") {
          toolCalls.push({
            function: { name: c.name, arguments: c.arguments },
          });
        }
      }
      const entry: Record<string, unknown> = {
        role: "assistant",
        content: textParts.join(""),
      };
      if (toolCalls.length > 0) entry.tool_calls = toolCalls;
      out.push(entry);
    } else if (msg.role === "toolResult") {
      const text = msg.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { text: string }).text)
        .join("");
      out.push({ role: "tool", content: text });
    }
  }
  return out;
}

function toOllamaTools(tools: Tool[]) {
  return tools.map((t) => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function newId() {
  return `call_${Math.random().toString(36).slice(2, 11)}`;
}

export function createOllamaNativeStream(
  model: Model<any>,
  context: Context,
  options?: { signal?: AbortSignal; temperature?: number; maxTokens?: number },
) {
  const stream = createAssistantMessageEventStream();

  const output: AssistantMessage = {
    role: "assistant",
    content: [],
    api: model.api,
    provider: model.provider,
    model: model.id,
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: Date.now(),
  };

  (async () => {
    try {
      const baseUrl = (model.baseUrl || "http://localhost:11434").replace(
        /\/v1\/?$/,
        "",
      );

      const body: Record<string, unknown> = {
        model: model.id,
        messages: toOllamaMessages(context),
        stream: true,
      };
      if (context.tools && context.tools.length > 0) {
        body.tools = toOllamaTools(context.tools);
      }
      const ollamaOptions: Record<string, unknown> = {};
      if (options?.temperature !== undefined)
        ollamaOptions.temperature = options.temperature;
      if (options?.maxTokens !== undefined)
        ollamaOptions.num_predict = options.maxTokens;
      if (Object.keys(ollamaOptions).length > 0) body.options = ollamaOptions;

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        output.stopReason = "error";
        output.errorMessage = `Ollama ${res.status}: ${errText || res.statusText}`;
        stream.push({ type: "error", reason: "error", error: output });
        stream.end(output);
        return;
      }

      stream.push({ type: "start", partial: output });

      type Block =
        | { type: "text"; text: string }
        | { type: "thinking"; thinking: string }
        | {
            type: "toolCall";
            id: string;
            name: string;
            arguments: Record<string, unknown>;
          };
      let current: Block | null = null;
      const blockIndex = () => output.content.length - 1;

      const finishCurrent = () => {
        if (!current) return;
        const idx = blockIndex();
        if (current.type === "text") {
          stream.push({
            type: "text_end",
            contentIndex: idx,
            content: current.text,
            partial: output,
          });
        } else if (current.type === "thinking") {
          stream.push({
            type: "thinking_end",
            contentIndex: idx,
            content: current.thinking,
            partial: output,
          });
        } else {
          stream.push({
            type: "toolcall_end",
            contentIndex: idx,
            toolCall: {
              type: "toolCall",
              id: current.id,
              name: current.name,
              arguments: current.arguments,
            },
            partial: output,
          });
        }
        current = null;
      };

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let chunk: OllamaChunk;
          try {
            chunk = JSON.parse(trimmed);
          } catch {
            continue;
          }

          const msg = chunk.message;
          if (msg) {
            if (msg.thinking && msg.thinking.length > 0) {
              if (!current || current.type !== "thinking") {
                finishCurrent();
                current = { type: "thinking", thinking: "" };
                output.content.push(current as any);
                stream.push({
                  type: "thinking_start",
                  contentIndex: blockIndex(),
                  partial: output,
                });
              }
              current.thinking += msg.thinking;
              (output.content[blockIndex()] as any).thinking = current.thinking;
              stream.push({
                type: "thinking_delta",
                contentIndex: blockIndex(),
                delta: msg.thinking,
                partial: output,
              });
            }

            if (msg.content && msg.content.length > 0) {
              if (!current || current.type !== "text") {
                finishCurrent();
                current = { type: "text", text: "" };
                output.content.push(current as any);
                stream.push({
                  type: "text_start",
                  contentIndex: blockIndex(),
                  partial: output,
                });
              }
              current.text += msg.content;
              (output.content[blockIndex()] as any).text = current.text;
              stream.push({
                type: "text_delta",
                contentIndex: blockIndex(),
                delta: msg.content,
                partial: output,
              });
            }

            if (Array.isArray(msg.tool_calls)) {
              for (const tc of msg.tool_calls) {
                finishCurrent();
                const name = tc.function?.name ?? "";
                const args = (tc.function?.arguments ?? {}) as Record<
                  string,
                  unknown
                >;
                const id = tc.id ?? newId();
                current = { type: "toolCall", id, name, arguments: args };
                output.content.push({
                  type: "toolCall",
                  id,
                  name,
                  arguments: args,
                } as any);
                stream.push({
                  type: "toolcall_start",
                  contentIndex: blockIndex(),
                  partial: output,
                });
                stream.push({
                  type: "toolcall_delta",
                  contentIndex: blockIndex(),
                  delta: JSON.stringify(args),
                  partial: output,
                });
              }
            }
          }

          if (chunk.done) {
            finishCurrent();
            const inTok = chunk.prompt_eval_count ?? 0;
            const outTok = chunk.eval_count ?? 0;
            output.usage = {
              input: inTok,
              output: outTok,
              cacheRead: 0,
              cacheWrite: 0,
              totalTokens: inTok + outTok,
              cost: {
                input: 0,
                output: 0,
                cacheRead: 0,
                cacheWrite: 0,
                total: 0,
              },
            };
            const hasTool = output.content.some((c) => c.type === "toolCall");
            const reason: "stop" | "length" | "toolUse" = hasTool
              ? "toolUse"
              : chunk.done_reason === "length"
                ? "length"
                : "stop";
            output.stopReason = reason;
            stream.push({ type: "done", reason, message: output });
          }
        }
      }

      stream.end(output);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const aborted =
        (e as { name?: string })?.name === "AbortError" ||
        /aborted/i.test(msg);
      output.stopReason = aborted ? "aborted" : "error";
      output.errorMessage = msg;
      stream.push({
        type: "error",
        reason: aborted ? "aborted" : "error",
        error: output,
      });
      stream.end(output);
    }
  })();

  return stream;
}
