import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { config, PROJECT_ROOT } from '../Config/Config';
import type { UserProfile } from './Calculator';

const defaultProfile: UserProfile = {
  age: 35,
  monthlyIncome: 4000,
  monthlyExpenses: 2500,
  currentSavings: 20000,
  stockPortfolio: 10000,
  realEstateValue: 0,
  mortgageRemaining: 0,
  monthlyRentalIncome: 0,
  targetRetirementAge: 50,
  monthlyRetirementExpenses: 3000,
  estimatedReturn: 0.07,
  inflation: 0.02,
  notes: '',
  govRetirementAge: 64,
  govMonthlyPension: 1500,
  contributionYears: 10,
  targetContributionYears: 42,
};

function profilePath(): string {
  const dir = resolve(PROJECT_ROOT, config.dataDir);
  return resolve(dir, 'profile.json');
}

export function loadProfile(): UserProfile {
  const path = profilePath();
  if (!existsSync(path)) return { ...defaultProfile };
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8'));
    return { ...defaultProfile, ...raw };
  } catch {
    return { ...defaultProfile };
  }
}

export function saveProfile(profile: UserProfile): void {
  const path = profilePath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(profile, null, 2), 'utf-8');
}

export function loadAnalysis(): Record<string, string> | null {
  const path = resolve(PROJECT_ROOT, config.dataDir, 'analysis.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveAnalysis(analysis: Record<string, string>): void {
  const dir = resolve(PROJECT_ROOT, config.dataDir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'analysis.json'), JSON.stringify(analysis, null, 2), 'utf-8');
}
