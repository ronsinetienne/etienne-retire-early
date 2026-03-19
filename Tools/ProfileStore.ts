import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { config, PROJECT_ROOT } from '../Config/Config';
import type { UserProfile } from './Calculator';

const defaultProfile: UserProfile = {
  age: 51,
  monthlyIncome: 5000,
  monthlyExpenses: 3500,
  currentSavings: 20000,
  stockPortfolio: 0,
  // Maison à vendre (ex: Versailles)
  realEstateValue: 900000,
  mortgageRemaining: 134124,
  monthlyRentalIncome: 0,
  // Maison de retraite (ex: Bretagne) — sans crédit
  secondPropertyValue: 300000,
  secondPropertyCity: 'Bretagne',
  // Gift to children at retirement
  giftToChildren: 0,
  // Héritage
  inheritanceAmount: 500000,
  inheritanceAge: 65,
  targetRetirementAge: 60,
  monthlyRetirementExpenses: 3500,
  estimatedReturn: 0.04,
  bridgeReturn: 0.03,
  lastGrossSalary: 85000,
  inflation: 0.02,
  notes: '',
  govRetirementAge: 65,
  govMonthlyPension: 1800,
  contributionQuarters: 100,       // validated work quarters (excl. military)
  militaryServiceQuarters: 0,
  targetContributionYears: 43,    // legacy compat
  birthYear: 1974,
  salaireMoyen: 0,
  agircPoints: 0,
  agircPointsPerYear: 0,
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
