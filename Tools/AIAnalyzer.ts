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

function buildContext(profile: UserProfile, calc: FireResult, saleProceeds: number, saleProceedsFull: number,
  giftToKids: number, gapYears: number, yearsToRetirement: number, ageActuel: number,
  stocksAtRetirement: number, totalCapital: number, pensionFull: number, pensionReduced: number,
  missingAtRetirement: number, decotePct: string, trimestresRequis: number, quartersAtRetirement: number) {
  const hasPrecisePension = (profile.salaireMoyen||0) > 0;
  return `Profile: age ${ageActuel} (born ${profile.birthYear||1974}), retire at ${profile.targetRetirementAge}, state pension at ${profile.govRetirementAge}.
Bridge period: ${gapYears} years. Monthly budget in retirement: ${fmt(profile.monthlyRetirementExpenses||0)}.

CAPITAL AT RETIREMENT (age ${profile.targetRetirementAge}):
- House sale: ${fmt(profile.realEstateValue||0)} − mortgage ${fmt(profile.mortgageRemaining||0)} − fees 3% = ${fmt(saleProceedsFull)} − gift to kids ${fmt(giftToKids)} = NET ${fmt(saleProceeds)}
- Stock portfolio: ${fmt(profile.stockPortfolio||0)} growing at ${((profile.estimatedReturn||0.05)*100).toFixed(0)}%/yr for ${yearsToRetirement} yrs = ${fmt(stocksAtRetirement)} at retirement
- Cash: ${fmt(profile.currentSavings||0)}
- TOTAL CAPITAL AT ${profile.targetRetirementAge}: ${fmt(totalCapital)}

FRENCH PENSION — ${hasPrecisePension ? 'PRECISE CALCULATION' : 'ESTIMATE ONLY (fill SAM + Agirc points for precision)'}:
- Quarters at retirement: ${quartersAtRetirement}/${trimestresRequis} required
- Missing quarters: ${missingAtRetirement} → decote ${decotePct}%
${hasPrecisePension ? `- Retraite de base (CNAV): ${fmt(calc.pensionBaseMonthly||0)}/month (SAM ${fmt(profile.salaireMoyen||0)}/yr)
- Retraite complémentaire Agirc-Arrco: ${fmt(calc.pensionAgircMonthly||0)}/month (${Math.round(calc.agircPointsAtRetirement||0)} points × €1.4801)
- FULL pension (taux plein): ${fmt(pensionFull)}/month
- REDUCED pension (with decote): ${fmt(pensionReduced)}/month` : `- Estimated pension (manual): ${fmt(profile.govMonthlyPension||0)}/month (reduced with decote: ${fmt(pensionReduced)}/month)`}

Inheritance: ${fmt(profile.inheritanceAmount||0)} at age ${profile.inheritanceAge||65}.
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
  const saleProceedsFull = saleNet - Math.round(saleNet * 0.03);
  const giftToKids      = profile.giftToChildren || 0;
  const saleProceeds    = saleProceedsFull - giftToKids;
  const ageActuel       = profile.age || 51;
  const yearsToRetirement   = Math.max(0, profile.targetRetirementAge - ageActuel);
  // Stock portfolio grows over 9 years before retirement at estimated return
  const r = profile.estimatedReturn || 0.05;
  const stocksAtRetirement = Math.round((profile.stockPortfolio||0) * Math.pow(1 + r, yearsToRetirement));
  const totalCapital    = saleProceeds + (profile.currentSavings||0) + stocksAtRetirement;
  const bridgeTotal     = (profile.monthlyRetirementExpenses||0) * 12 * gapYears;
  const capitalAtPension = Math.round(totalCapital - bridgeTotal + totalCapital * 0.03 * gapYears * 0.5);
  // Use precise values from calculator
  const missingAtRetirement = calc.missingQuarters;
  const decotePct       = (missingAtRetirement * 1.25).toFixed(1);
  const pensionFull     = calc.calculatedPension || (profile.govMonthlyPension||0);
  const pensionReduced  = Math.round(pensionFull * (1 - missingAtRetirement * 0.0125));
  const pensionBase     = calc.pensionBaseMonthly || 0;
  const pensionAgirc    = calc.pensionAgircMonthly || 0;
  const trimestresRequis = calc.trimestresRequis || (profile.targetContributionYears||43) * 4;
  const quartersAtRetirement = calc.quartersAtRetirement || 0;

  const ctx = buildContext(profile, calc, saleProceeds, saleProceedsFull, giftToKids, gapYears,
    yearsToRetirement, ageActuel, stocksAtRetirement, totalCapital, pensionFull, pensionReduced,
    missingAtRetirement, decotePct, trimestresRequis, quartersAtRetirement);

  // ── CALL 1: Financial plan (summary + firePlan + stocks + realEstate + realism) ─────────
  const prompt1 = `You are a retirement financial advisor. Reply ONLY with valid compact JSON (no markdown). ENGLISH. Each JSON value MUST be a plain HTML string, never a nested object.

${ctx}

Return JSON with exactly these 5 keys (each value = plain HTML string):

"summary": Capital breakdown table: house sale ${fmt(saleProceedsFull)} − gift to kids ${fmt(giftToKids)} = ${fmt(saleProceeds)}, stocks grew to ${fmt(stocksAtRetirement)}, cash ${fmt(profile.currentSavings||0)}, TOTAL ${fmt(totalCapital)}. Bridge table: ${fmt(profile.monthlyRetirementExpenses||0)}/mo × ${gapYears*12}mo = ${fmt(bridgeTotal)}. Show capital at ${profile.govRetirementAge} at 0%/3%/4% return. At ${profile.govRetirementAge}: + inheritance ${fmt(profile.inheritanceAmount||0)} + pension ${fmt(pensionFull)}/mo. 2 urgent actions.

"firePlan": Year-by-year table (Year|Age|Event|Capital Start|Expenses|Capital End). ${yearsToRetirement} pre-retirement yrs + ${gapYears} bridge yrs + 3 post-pension yrs. Capital starts at ${fmt(totalCapital)}, depletes at ${fmt(profile.monthlyRetirementExpenses||0)}/month with 3% return. Inheritance ${fmt(profile.inheritanceAmount||0)} at age ${profile.inheritanceAge||65}. After table: 3-line investment split for ${fmt(totalCapital)}.

"stocks": Table: allocation%|product|amount|monthly income. ETFs with ISIN. Platforms.

"realEstate": Table: sale price ${fmt(profile.realEstateValue||0)} − mortgage ${fmt(profile.mortgageRemaining||0)} − fees 3% − gift to kids ${fmt(giftToKids)} = net ${fmt(saleProceeds)}. Stocks: ${fmt(profile.stockPortfolio||0)} growing to ${fmt(stocksAtRetirement)} in ${yearsToRetirement} yrs. Bretagne free housing saving. Best timing to sell.

"realism": 3-row table (optimistic/realistic/pessimistic|monthly budget|capital at ${profile.govRetirementAge}|verdict). Score /10.`;

  // ── CALL 2: French retirement scenarios (govRetirement only) ──────────────────────────────
  const prompt2 = `You are a French retirement law expert. Reply ONLY with valid compact JSON (no markdown). ENGLISH. Use HTML tables. Max 400 words total. The JSON value for "govRetirement" MUST be a plain HTML string, NOT a nested object.

${ctx}

Key numbers (already calculated — use these exactly):
- Full pension (taux plein): ${fmt(pensionFull)}/month
- Pension with decote (do nothing): ${fmt(pensionReduced)}/month
- Monthly pension loss from decote: ${fmt(pensionFull - pensionReduced)}/month for life
- Quarters at retirement: ${quartersAtRetirement}/${trimestresRequis} required, missing: ${missingAtRetirement}, decote: ${decotePct}%
${(profile.salaireMoyen||0) > 0 ? `- Base pension breakdown: CNAV ${fmt(calc.pensionBaseMonthly||0)}/mo + Agirc-Arrco ${fmt(calc.pensionAgircMonthly||0)}/mo = ${fmt(pensionFull)}/mo total` : ''}

Return JSON with 1 key — value MUST be a plain HTML string:

"govRetirement": Build ONE comparison table: Scenario|Quarters at claim|Missing|Decote%|Monthly pension|Strategy cost|Net cost after tax|20yr pension total|Verdict

Row A — Do nothing: ${quartersAtRetirement} quarters, ${missingAtRetirement} missing, -${decotePct}%, ${fmt(pensionReduced)}/mo, €0, 20yr=${fmt(pensionReduced*12*20)}.
Row B — Buy back 12 quarters (Art.L351-14-1, BEFORE retiring): ${quartersAtRetirement+12} quarters, missing=${Math.max(0,trimestresRequis-quartersAtRetirement-12)}, new decote=${(Math.max(0,trimestresRequis-quartersAtRetirement-12)*1.25).toFixed(1)}%, pension=${fmt(Math.round(pensionFull*(1-Math.max(0,trimestresRequis-quartersAtRetirement-12)*0.0125)))}/mo, cost €48,000 (net after 30% tax saving = €33,600), 20yr total, breakeven age.
Row C — CVV ${gapYears} yrs × 4 qtrs = ${gapYears*4} extra quarters: ${quartersAtRetirement+gapYears*4} quarters, missing=${Math.max(0,trimestresRequis-quartersAtRetirement-gapYears*4)}, decote=${(Math.max(0,trimestresRequis-quartersAtRetirement-gapYears*4)*1.25).toFixed(1)}%, pension, cost €${1500*gapYears}, 20yr total, breakeven age.
Row D — Combine B+C: ${quartersAtRetirement+12+gapYears*4} quarters vs ${trimestresRequis} required → ${quartersAtRetirement+12+gapYears*4>=trimestresRequis?'TAUX PLEIN':'still short'}, pension ${fmt(pensionFull)}/mo, total cost €${fmt(48000+1500*gapYears)}, net after tax, 20yr=${fmt(pensionFull*12*20)}.
Row E — Wait until 67 (taux plein automatique, no quarters needed): 0% decote GUARANTEED, ${fmt(pensionFull)}/mo, extra 2 yrs capital needed ${fmt((profile.monthlyRetirementExpenses||0)*24)}, 20yr=${fmt(pensionFull*12*20)}.

After table: RECOMMENDATION (which scenario maximises net lifetime income). Note Agirc-Arrco solidarity coefficient: -10% for 3 years if pension claimed before 63.`;

  try {
    // Run both API calls in parallel
    const [result1, result2] = await Promise.all([
      callAI(client, prompt1),
      callAI(client, prompt2),
    ]);

    console.log('✅ Call1 keys:', Object.keys(result1));
    console.log('✅ Call2 keys:', Object.keys(result2));
    console.log('✅ summary type:', typeof result1.summary, '— first 80 chars:', String(result1.summary).slice(0,80));
    console.log('✅ govRetirement type:', typeof result2.govRetirement, '— first 80 chars:', String(result2.govRetirement).slice(0,80));

    // Flatten nested objects if AI wrapped values inside another object
    const flatten = (v: any): string => {
      if (typeof v === 'string') return v;
      if (!v) return '';
      // If AI returned an object, join all string values
      const vals = Object.values(v).filter(x => typeof x === 'string') as string[];
      if (vals.length > 0) return vals.join('\n');
      return JSON.stringify(v);
    };

    return {
      summary:       flatten(result1.summary),
      firePlan:      flatten(result1.firePlan),
      stocks:        flatten(result1.stocks),
      realEstate:    flatten(result1.realEstate),
      realism:       flatten(result1.realism),
      govRetirement: flatten(result2.govRetirement),
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
