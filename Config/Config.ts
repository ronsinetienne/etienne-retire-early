import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// Project root = directory containing this file's parent (Config/../)
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadConfig(): FireConfig {
  const configPath = resolve(PROJECT_ROOT, 'fire.config.json');
  if (!existsSync(configPath)) return defaultConfig;
  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return { ...defaultConfig, ...raw };
  } catch {
    return defaultConfig;
  }
}

export const config = loadConfig();
