import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface FireConfig {
  port: number;
  dataDir: string;
  baseCurrency: string;
  enableAI: boolean;
}

const defaultConfig: FireConfig = {
  port: 3743,
  dataDir: './data',
  baseCurrency: 'EUR',
  enableAI: false,
};

function loadConfig(): FireConfig {
  const configPath = resolve(process.cwd(), 'fire.config.json');
  if (!existsSync(configPath)) return defaultConfig;
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return { ...defaultConfig, ...raw };
  } catch {
    return defaultConfig;
  }
}

export const config = loadConfig();
