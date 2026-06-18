import * as fs from "fs";
import * as path from "path";
import { intro, text, outro, select, log, isCancel, cancel } from "@clack/prompts";
import color from "picocolors";
import { spawn } from "child_process";

const CONFIG_FILE = path.resolve(process.cwd(), "piwa.config.json");

export interface PiwaConfig {
  agentNumber: string;
  ownerNumber: string;
}

export function deleteConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    fs.unlinkSync(CONFIG_FILE);
  }
}

export function hasAnyProvider(authStorage: any): boolean {
  if (authStorage.list().length > 0) return true;

  const commonEnvKeys = [
    "GEMINI_API_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
    "DEEPSEEK_API_KEY",
    "GROQ_API_KEY",
    "MISTRAL_API_KEY",
    "GOOGLE_APPLICATION_CREDENTIALS"
  ];
  for (const envKey of commonEnvKeys) {
    if (process.env[envKey]) return true;
  }

  return false;
}

export async function ensureAIProvider(authStorage: any): Promise<void> {
  if (hasAnyProvider(authStorage)) {
    return;
  }

  console.log(color.yellow("\n⚠️  No AI provider credentials detected!"));
  console.log("To run Piwa, you need to connect to an AI provider.\n");

  const choice = await select({
    message: "Select an option to authenticate:",
    options: [
      {
        value: "google-antigravity",
        label: "Google Antigravity (Free - Gemini 3, Claude, GPT-OSS)",
        hint: "Login with a Google account"
      },
      {
        value: "google-gemini-cli",
        label: "Google Gemini CLI (Free - Gemini models)",
        hint: "Login with a Google account"
      },
      {
        value: "api-key",
        label: "Enter an API Key manually (Gemini, Anthropic, OpenAI, etc.)",
      },
      {
        value: "skip",
        label: "Skip / Already configured via environment variables"
      }
    ]
  });

  if (isCancel(choice) || choice === "skip") {
    return;
  }

  if (choice === "google-antigravity" || choice === "google-gemini-cli") {
    console.log(color.cyan("\nStarting Google login flow..."));

    await authStorage.login(choice, {
      onAuth: ({ url }: { url: string }) => {
        console.log(`\n🔗 Visit this link to authenticate:\n${color.blue(url)}\n`);

        try {
          if (process.platform === "win32") {
            spawn("cmd", ["/c", `start "" "${url}"`], { shell: true });
          } else if (process.platform === "darwin") {
            spawn("open", [url]);
          } else {
            spawn("xdg-open", [url]);
          }
        } catch {}
      },
      onProgress: () => {
        // Keep progress silent to match pi's clean aesthetic
      },
      onManualCodeInput: async () => {
        const input = await text({
          message: "Paste redirect URL or auth code if browser login failed:",
          placeholder: "https://localhost:..."
        });
        if (isCancel(input)) return "";
        return input || "";
      }
    });

    console.log(color.green("\n✅ Google authentication successful!\n"));
  } else if (choice === "api-key") {
    const provider = await select({
      message: "Select your AI provider:",
      options: [
        { value: "google", label: "Google Gemini" },
        { value: "anthropic", label: "Anthropic Claude" },
        { value: "openai", label: "OpenAI" },
        { value: "deepseek", label: "DeepSeek" },
        { value: "groq", label: "Groq" }
      ]
    });

    if (isCancel(provider)) return;

    const key = await text({
      message: `Enter your API key for ${provider}:`,
      validate(value) {
        if (!value || typeof value !== "string" || !value.trim()) return "API key cannot be empty.";
      }
    });

    if (isCancel(key)) return;

    authStorage.set(provider, { type: "api_key", key: key.trim() });
    console.log(color.green(`\n✅ API key saved for ${provider}!\n`));
  }
}

export async function loadOrPromptConfig(): Promise<PiwaConfig> {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (data.agentNumber && data.ownerNumber) {
        return data as PiwaConfig;
      }
    } catch (e) {
      console.warn("⚠️ Could not read existing piwa.config.json. Prompting again.");
    }
  }

  console.clear();
  
  const piwaLogo = `
 ________  ___  ___       __   ________     
|\\   __  \\|\\  \\|\\  \\     |\\  \\|\\   __  \\    
\\ \\  \\|\\  \\ \\  \\ \\  \\    \\ \\  \\ \\  \\|\\  \\   
 \\ \\   ____\\ \\  \\ \\  \\  __\\ \\  \\ \\   __  \\  
  \\ \\  \\___|\\ \\  \\ \\  \\|\\__\\_\\  \\ \\  \\ \\  \\ 
   \\ \\__\\    \\ \\__\\ \\____________\\ \\__\\ \\__\\
    \\|__|     \\|__|\\|____________|\\|__|\\|__|
  `;
  
  console.log(color.cyan(piwaLogo));
  console.log(color.white("Piwa acts as a bridge between your computers terminal and your WhatsApp account,"));
  console.log(color.white("allowing you to interact with your coding agent straight from your phone.\n"));
  console.log(color.gray("Please follow through this quick onboarding process to get set up."));
  console.log(color.gray("Author: PTBYSR ( Paul-Simon Emechebe )\n"));

  intro(color.bgCyan(color.black(" Piwa (Pi WhatsApp Agent) Setup ")));

  const agentNumber = await text({
    message: "What is the BOT's WhatsApp number? (This should be a separate, dedicated WhatsApp account that you will scan the pairing code with, NOT your personal number. Must be a regular account, not Business.)",
    placeholder: "e.g. 2347066499537",
    validate(value) {
      if (!value) return color.red("Please enter a valid number.");
      const stripped = value.replace(/\D/g, "");
      if (stripped.length === 0) return color.red("Please enter a valid number.");
      if (stripped.length < 10 || stripped.length > 15) {
        return color.red("Invalid length. Did you forget the country code? (10-15 digits)");
      }
    },
  });

  if (isCancel(agentNumber)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const ownerNumber = await text({
    message: "What is YOUR personal WhatsApp number? (Only you can command the bot)",
    placeholder: "e.g. 2347088436930",
    validate(value) {
      if (!value) return color.red("Please enter a valid number.");
      const stripped = value.replace(/\D/g, "");
      if (stripped.length === 0) return color.red("Please enter a valid number.");
      if (stripped.length < 10 || stripped.length > 15) {
        return color.red("Invalid length. Did you forget the country code? (10-15 digits)");
      }
    },
  });

  if (isCancel(ownerNumber)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  const config: PiwaConfig = {
    agentNumber: (agentNumber as string).replace(/\D/g, ""),
    ownerNumber: (ownerNumber as string).replace(/\D/g, "")
  };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));

  outro(color.green("✅ Configuration saved locally!"));
  return config;
}
