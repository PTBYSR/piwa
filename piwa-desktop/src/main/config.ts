import fs from 'fs';
import path from 'path';

export interface PiwaConfig {
  agentNumber: string;
  ownerNumber: string;
}

const configPath = path.join(process.cwd(), 'piwa.config.json');

export function loadConfig(): PiwaConfig | null {
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(data);
    } catch {}
  }
  return null;
}

export function saveConfig(config: PiwaConfig) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}
