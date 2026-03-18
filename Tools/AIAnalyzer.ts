import Anthropic from '@anthropic-ai/sdk';
import type { UserProfile } from './Calculator';
import type { FireResult } from './Calculator';

export interface AIAnalysis {
  realism: string;
  firePlan: string;
  stocks: string;
  realEstate: string;
  govRetirement: string;
  summary: string;
  generatedAt: string;
}

function fmt(n: number, currency = '€'): string {
  return `${currency}${Math.round(n).toLocaleString('en-US')}`;
}

export async function analyzeProfile(profile: UserProfile, calc: FireResult): Promise<AIAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackAnalysis(calc);
  }

  const client = new Anthropic({ apiKey });

  const prompt = `You are an expert FIRE (Financial Independence, Retire Early) advisor.
Analyze this user's financial profile and provide personalized, actionable advice.

## User Profile
- Age: ${profile.age}
- Monthly net income: ${fmt(profile.monthlyIncome)}
- Monthly expenses: ${fmt(profile.monthlyExpenses)}
- Monthly surplus: ${fmt(profile.monthlyIncome - profile.monthlyExpenses)}
- Current savings (cash/bonds): ${fmt(profile.currentSavings)}
- Stock portfolio: ${fmt(profile.stockPortfolio)}
- Real estate value: ${fmt(profile.realEstateValue)}
- Mortgage remaining: ${fmt(profile.mortgageRemaining)}
- Monthly rental income: ${fmt(profile.monthlyRentalIncome)}
- Legal retirement age: ${profile.govRetirementAge}
- Estimated monthly state pension: ${fmt(profile.govMonthlyPension)}
- Contribution years so far: ${profile.contributionYears} / ${profile.targetContributionYears} required
- Target retirement age: ${profile.targetRetirementAge}
- Desired monthly retirement income: ${fmt(profile.monthlyRetirementExpenses)}
- Assumed annual return: ${(profile.estimatedReturn * 100).toFixed(1)}%
- Assumed inflation: ${(profile.inflation * 100).toFixed(1)}%
- User notes: "${profile.notes}"

## Current FIRE Calculations
- FIRE Number (without pension): ${fmt(calc.fireNumber)}
- FIRE Number (with state pension): ${fmt(calc.fireNumberWithPension)}
- Gap between FIRE target and legal retirement: ${calc.govGap} years
- Lean FIRE: ${fmt(calc.leanFireNumber)} | Fat FIRE: ${fmt(calc.fatFireNumber)}
- Current investable assets: ${fmt(calc.totalAssets)}
- Net worth: ${fmt(calc.totalNetWorth)}
- Progress toward FIRE: ${calc.progressPercent.toFixed(1)}%
- Estimated years to FIRE: ${calc.yearsToFire} (age ${calc.fireAge})
- Savings rate: ${calc.savingsRate.toFixed(1)}%
- Monthly shortfall to hit target age: ${fmt(calc.monthlyShortfall)}

Provide a JSON response with exactly these 5 keys. Each value is an HTML snippet (no <html>/<body> tags):

1. "realism" — Honest feasibility assessment. Is the target age realistic? What's the biggest gap? What score (1-10) and why?
2. "firePlan" — Step-by-step action plan with specific milestones, contribution amounts, and timeline.
3. "stocks" — Portfolio allocation recommendation with specific ETFs (e.g., MSCI World, S&P 500, bonds), percentages, and rationale based on age and goal.
4. "realEstate" — Real estate strategy: should they buy, keep renting, invest in REITs, rental property? Specific advice.
5. "govRetirement" — Government/state pension strategy: bridge period between FIRE and legal retirement age, how to optimize pension entitlements, impact on FIRE number, risks of early retirement on pension rights.
6. "summary" — Executive summary in 3-4 sentences.

Use <strong>, <ul>, <li>, <p>, <h4> tags. Be specific, data-driven, and actionable.
Respond ONLY with valid JSON. No markdown fences.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const parsed = JSON.parse(text.trim());

    return {
      realism: parsed.realism || '',
      firePlan: parsed.firePlan || '',
      stocks: parsed.stocks || '',
      realEstate: parsed.realEstate || '',
      govRetirement: parsed.govRetirement || '',
      summary: parsed.summary || '',
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('AI analysis failed:', err);
    return fallbackAnalysis(calc);
  }
}

function fallbackAnalysis(calc: FireResult): AIAnalysis {
  const msg = `<p class="ai-unavailable">
    <strong>AI analysis unavailable.</strong> Add your <code>ANTHROPIC_API_KEY</code> to a <code>.env</code> file to enable personalized recommendations.<br>
    Mathematical projections above are calculated locally and are already active.
  </p>`;
  return {
    realism: msg,
    firePlan: msg,
    stocks: msg,
    realEstate: msg,
    govRetirement: msg,
    summary: `<p>Based on current inputs: FIRE Number ${Math.round(calc.fireNumber).toLocaleString('en-US')}€ —
      estimated ${calc.yearsToFire} years to financial independence at age ${calc.fireAge}.
      Current savings rate: ${calc.savingsRate.toFixed(1)}%.</p>`,
    generatedAt: new Date().toISOString(),
  };
}
