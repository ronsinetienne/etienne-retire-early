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

function fmt(n: number): string {
  return `€${Math.round(n).toLocaleString('fr-FR')}`;
}

function buildContext(profile: UserProfile, saleProceeds: number, gapYears: number,
  trimestresValides: number, trimestresRequis: number, yearsToRetirement: number, ageActuel: number) {
  return `Profile: age ${ageActuel}, retire at ${profile.targetRetirementAge}, state pension at ${profile.govRetirementAge}.
House sale net: ${fmt(saleProceeds)}. Monthly budget: ${fmt(profile.monthlyRetirementExpenses||0)}. Bridge: ${gapYears} yrs.
Quarters validated: ${trimestresValides}/${trimestresRequis}. At retirement (age ${profile.targetRetirementAge}): ${trimestresValides + yearsToRetirement*4} quarters, missing ${Math.max(0, trimestresRequis-(trimestresValides+yearsToRetirement*4))}.
State pension estimate: ${fmt(profile.govMonthlyPension||0)}/month. Inheritance: ${fmt(profile.inheritanceAmount||0)} at age ${profile.inheritanceAge||65}.
Cash: ${fmt(profile.currentSavings||0)}. Stocks: ${fmt(profile.stockPortfolio||0)}.
Retirement home (${profile.secondPropertyCity||'Bretagne'}): owned, no mortgage.
User notes: ${profile.notes || 'none'}`;
}

async function callAI(client: Anthropic, prompt: string): Promise<Record<string, string>> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  let cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  if (response.stop_reason === 'max_tokens') {
    console.warn('⚠️ Response truncated — attempting JSON repair');
    cleaned = cleaned.replace(/,\s*"[^"]*$/, '');
    const lastColon = cleaned.lastIndexOf(':"');
    if (lastColon > 0 && !cleaned.endsWith('}')) {
      const lastClose = cleaned.lastIndexOf('"}');
      if (lastClose < lastColon) {
        cleaned = cleaned.substring(0, lastColon) + ':"<truncated>"}';
      } else {
        cleaned += '}';
      }
    }
    if (!cleaned.endsWith('}')) cleaned += '}';
  }
  return JSON.parse(cleaned);
}

export async function analyzeProfile(profile: UserProfile, calc: FireResult): Promise<AIAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY || (globalThis as any).Bun?.env?.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackAnalysis(calc);

  const client = new Anthropic({ apiKey });

  const gapYears        = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
  const saleNet         = Math.max(0, (profile.realEstateValue||0) - (profile.mortgageRemaining||0));
  const saleProceeds    = saleNet - Math.round(saleNet * 0.03);
  const trimestresValides   = (profile.contributionYears||0) * 4;
  const trimestresRequis    = (profile.targetContributionYears||43) * 4;
  const ageActuel       = profile.age || 51;
  const yearsToRetirement   = Math.max(0, profile.targetRetirementAge - ageActuel);
  const quartersAtRetirement = trimestresValides + yearsToRetirement * 4;
  const missingAtRetirement  = Math.max(0, trimestresRequis - quartersAtRetirement);
  const decotePct       = (missingAtRetirement * 1.25).toFixed(1);
  const pensionReduced  = Math.round((profile.govMonthlyPension||0) * (1 - missingAtRetirement * 0.0125));
  const totalCapital    = saleProceeds + (profile.currentSavings||0) + (profile.stockPortfolio||0);
  const bridgeTotal     = (profile.monthlyRetirementExpenses||0) * 12 * gapYears;
  const capitalAt65     = Math.round(totalCapital - bridgeTotal + totalCapital * 0.03 * gapYears * 0.5);

  const ctx = buildContext(profile, saleProceeds, gapYears, trimestresValides, trimestresRequis, yearsToRetirement, ageActuel);

  // ── CALL 1: Financial plan (summary + firePlan + stocks + realEstate + realism) ─────────
  const prompt1 = `You are a retirement financial advisor. Reply ONLY with valid compact JSON (no markdown). ENGLISH. Use HTML (h4,p,ul,li,strong,table,tr,td,th) in values. Be concise — max 300 words per section.

${ctx}

Return JSON with these 5 keys:

"summary": 3 things: (1) Total capital at ${profile.targetRetirementAge}: ${fmt(totalCapital)}. Budget ${fmt(profile.monthlyRetirementExpenses||0)}/month × ${gapYears*12} months = ${fmt(bridgeTotal)} needed. Capital remaining at ${profile.govRetirementAge}: ~${fmt(capitalAt65)} + inheritance ${fmt(profile.inheritanceAmount||0)} = ${fmt(capitalAt65+(profile.inheritanceAmount||0))}. Show as 3-row table (conservative/moderate/optimistic). (2) Monthly income at ${profile.govRetirementAge}: pension + investment returns. (3) 2 urgent actions in next 6 months.

"firePlan": Year-by-year table (Year|Age|Event|Capital Start|Expenses|Capital End). Cover: ${yearsToRetirement} yrs pre-retirement + ${gapYears} bridge years + 3 yrs post-${profile.govRetirementAge}. Show capital depleting at ${fmt(profile.monthlyRetirementExpenses||0)}/month with 3% return. Mark inheritance at age ${profile.inheritanceAge||65}. Then: 3-line investment allocation for the ${fmt(saleProceeds)}.

"stocks": Compact table: allocation % | product | amount | monthly income. Total monthly passive income. 2 specific ETFs with ISIN. Platforms.

"realEstate": Sale calculation table (price − mortgage − fees = net). Bretagne savings vs renting. Best timing to sell.

"realism": 3 scenarios table (optimistic/realistic/pessimistic | monthly budget | capital at 65 | verdict). Score /10 with 2-line justification.`;

  // ── CALL 2: French retirement scenarios (govRetirement only) ──────────────────────────────
  const prompt2 = `You are a French retirement law expert. Reply ONLY with valid compact JSON (no markdown). ENGLISH. Use HTML tables. Max 400 words total.

${ctx}

Key calculations already done:
- Quarters at retirement age ${profile.targetRetirementAge}: ${quartersAtRetirement} (missing: ${missingAtRetirement})
- Decote if no action: ${decotePct}% → pension reduced to ${fmt(pensionReduced)}/month vs full ${fmt(profile.govMonthlyPension||0)}/month
- Monthly pension loss: ${fmt((profile.govMonthlyPension||0) - pensionReduced)}/month for life

Return JSON with 1 key:

"govRetirement": Build ONE comparison table with columns: Scenario|Quarters at claim|Missing|Pension reduction|Monthly pension|Total strategy cost|20yr pension total|Verdict

Row A — Do nothing, claim at ${profile.govRetirementAge}: ${quartersAtRetirement} quarters, ${missingAtRetirement} missing, -${decotePct}%, ${fmt(pensionReduced)}/mo, €0 cost, calculate 20yr total.
Row B — Buy back 12 quarters (max, Art.L351-14-1): quarters=${quartersAtRetirement+12}, recalculate missing & decote, cost ~€4,000×12=€48,000 (tax deductible ~30% = net ~€33,600), calculate 20yr total. Breakeven age.
Row C — CVV during bridge (${gapYears} yrs × 4 quarters = ${gapYears*4} quarters): quarters=${quartersAtRetirement+gapYears*4}, recalculate, cost ~€1,500/yr × ${gapYears} = ${fmt(1500*gapYears)}, calculate 20yr total. Breakeven age.
Row D — Combine B+C: quarters=${quartersAtRetirement+12+gapYears*4}, likely reaches ${trimestresRequis} → 0% decote, full pension ${fmt(profile.govMonthlyPension||0)}/mo, total cost ~${fmt(48000+1500*gapYears)}, 20yr total.
Row E — Wait until 67 (taux plein automatique): 0% decote guaranteed, ${fmt(profile.govMonthlyPension||0)}/mo, extra capital needed for 2 more years ${fmt((profile.monthlyRetirementExpenses||0)*24)}, 20yr total.

After table: 2-sentence RECOMMENDATION on which scenario is best for this profile. Note Agirc-Arrco solidarity malus -10% if claim before 63.`;

  try {
    // Run both API calls in parallel
    const [result1, result2] = await Promise.all([
      callAI(client, prompt1),
      callAI(client, prompt2),
    ]);

    return {
      summary:       result1.summary       || '',
      firePlan:      result1.firePlan      || '',
      stocks:        result1.stocks        || '',
      realEstate:    result1.realEstate    || '',
      realism:       result1.realism       || '',
      govRetirement: result2.govRetirement || '',
      generatedAt:   new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('AI analysis failed:', err?.message || err);
    return errorAnalysis(err?.message || String(err));
  }
}

function errorAnalysis(errMsg: string): AIAnalysis {
  const msg = `<p style="color:#e74c3c;padding:12px;"><strong>Analysis error:</strong> ${errMsg}</p>`;
  return { realism: msg, firePlan: msg, stocks: msg, realEstate: msg, govRetirement: msg,
    summary: `<p style="color:#e74c3c;"><strong>Error:</strong> ${errMsg}<br>Check server logs for details.</p>`,
    generatedAt: new Date().toISOString() };
}

function fallbackAnalysis(calc: FireResult): AIAnalysis {
  const msg = `<p style="color:var(--muted);padding:12px;"><strong>AI unavailable.</strong> Check <code>ANTHROPIC_API_KEY</code> in <code>.env</code>.</p>`;
  return { realism: msg, firePlan: msg, stocks: msg, realEstate: msg, govRetirement: msg,
    summary: `<p>API key not configured — add it to <code>.env</code> and click Analyze with AI.</p>`,
    generatedAt: new Date().toISOString() };
}
