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
- House sale: ${fmt(profile.realEstateValue||0)} − mortgage ${fmt(profile.mortgageRemaining||0)} − agency fees 4% (${fmt(Math.round((profile.realEstateValue||0)*0.04))}) − diagnostics €1,000 = ${fmt(saleProceedsFull)} − gift to kids ${fmt(giftToKids)} = NET ${fmt(saleProceeds)}
- NOTE: notary fees (frais de notaire) are paid by the BUYER in France, not the seller
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
  // Agency fees: ~4% for a high-value property (€900k range) in France
  // NOTE: notary fees (frais de notaire) are paid by the BUYER, not the seller
  // Seller pays: agency fees (3-5%) + diagnostics (~€1,000) + IRA mortgage penalty if any
  const agencyFeeRate   = 0.04;
  const diagnostics     = 1000;
  const saleProceedsFull = saleNet - Math.round(saleNet * agencyFeeRate) - diagnostics;
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

  const BASE = `You are a retirement financial advisor. Reply ONLY with valid compact JSON (no markdown, no extra text). ENGLISH. Every JSON value MUST be a plain HTML string — never a nested object or array.

${ctx}`;

  // ── CALL A: summary + realism (short sections) ───────────────────────────
  const promptA = `${BASE}

Return JSON with exactly 2 keys:

"summary": HTML with: (1) capital table — house sale ${fmt(saleProceedsFull)} − gift ${fmt(giftToKids)} = ${fmt(saleProceeds)}, stocks ${fmt(stocksAtRetirement)}, cash ${fmt(profile.currentSavings||0)}, TOTAL ${fmt(totalCapital)}. (2) bridge table — ${fmt(profile.monthlyRetirementExpenses||0)}/mo × ${gapYears*12} months = ${fmt(bridgeTotal)}. (3) capital at ${profile.govRetirementAge} at 0%/3%/4% return. (4) at ${profile.govRetirementAge}: +inheritance ${fmt(profile.inheritanceAmount||0)} +pension ${fmt(pensionFull)}/mo. (5) 2 urgent actions.

"realism": HTML 3-row table: scenario(optimistic/realistic/pessimistic) | monthly budget | capital at ${profile.govRetirementAge} | verdict. End with score /10.`;

  // ── CALL B: firePlan (year-by-year — dedicated call for length) ──────────
  const promptB = `${BASE}

Return JSON with exactly 1 key:

"firePlan": HTML year-by-year table columns: Year|Age|Event|Capital Start|Withdrawals|Return 3%|Capital End. Rows: ${yearsToRetirement} working years (capital grows, no withdrawal), then ${gapYears} bridge years at −${fmt(profile.monthlyRetirementExpenses||0)}/mo, then 3 post-pension years. Capital at retirement = ${fmt(totalCapital)}. Mark inheritance ${fmt(profile.inheritanceAmount||0)} at age ${profile.inheritanceAge||65}. After table: 3-line recommended investment split for ${fmt(totalCapital)}.`;

  // ── CALL C: stocks + realEstate ──────────────────────────────────────────
  const promptC = `${BASE}

Return JSON with exactly 2 keys:

"stocks": HTML table: Allocation%|ETF Product|ISIN|Amount €|Est. Monthly Income. Include 4–5 ETFs, recommended platform (PEA/CTO/Assurance-vie), tax note.

"realEstate": HTML with: (1) sale calculation table — ${fmt(profile.realEstateValue||0)} − mortgage ${fmt(profile.mortgageRemaining||0)} − agency 4% ${fmt(Math.round((profile.realEstateValue||0)*0.04))} − diagnostics €1,000 − gift ${fmt(giftToKids)} = net ${fmt(saleProceeds)}. Note: notary fees paid by BUYER. (2) stock portfolio grows from ${fmt(profile.stockPortfolio||0)} to ${fmt(stocksAtRetirement)} over ${yearsToRetirement} yrs at ${((profile.estimatedReturn||0.07)*100).toFixed(0)}%. (3) Bretagne free housing value. (4) Best timing advice to sell.`;

  // ── CALL D: govRetirement (French pension scenarios) ─────────────────────
  const promptD = `You are a French retirement law expert. Reply ONLY with valid compact JSON (no markdown). ENGLISH. Every JSON value MUST be a plain HTML string — never a nested object.

${ctx}

Pre-calculated numbers — use exactly:
- Taux plein pension: ${fmt(pensionFull)}/mo | With décote (do nothing): ${fmt(pensionReduced)}/mo | Monthly loss: ${fmt(pensionFull-pensionReduced)}/mo
- Quarters at retirement: ${quartersAtRetirement}/${trimestresRequis} required | Missing: ${missingAtRetirement} | Décote: ${decotePct}%
${(profile.salaireMoyen||0)>0?`- CNAV ${fmt(calc.pensionBaseMonthly||0)}/mo + Agirc ${fmt(calc.pensionAgircMonthly||0)}/mo = ${fmt(pensionFull)}/mo`:''}

Return JSON with 1 key:

"govRetirement": HTML table — Scenario|Qtrs at claim|Missing|Décote|Monthly €|Cost|Net cost (−30% tax)|20yr total|Verdict
A-Do nothing: ${quartersAtRetirement}q, ${missingAtRetirement} missing, −${decotePct}%, ${fmt(pensionReduced)}/mo, €0, 20yr=${fmt(pensionReduced*12*20)}
B-Rachat 12q: ${quartersAtRetirement+12}q, ${Math.max(0,trimestresRequis-quartersAtRetirement-12)} missing, −${(Math.max(0,trimestresRequis-quartersAtRetirement-12)*1.25).toFixed(1)}%, ${fmt(Math.round(pensionFull*(1-Math.max(0,trimestresRequis-quartersAtRetirement-12)*0.0125)))}/mo, €54k gross/€38k net, 20yr+breakeven
C-CVV ${gapYears}yrs: ${quartersAtRetirement+gapYears*4}q, ${Math.max(0,trimestresRequis-quartersAtRetirement-gapYears*4)} missing, −${(Math.max(0,trimestresRequis-quartersAtRetirement-gapYears*4)*1.25).toFixed(1)}%, pension/mo, €${gapYears*2000} total, 20yr+breakeven
D-Rachat+CVV: ${quartersAtRetirement+12+gapYears*4}q vs ${trimestresRequis} → ${quartersAtRetirement+12+gapYears*4>=trimestresRequis?'TAUX PLEIN':'still short'}, ${fmt(pensionFull)}/mo, combined cost, 20yr=${fmt(pensionFull*12*20)}
E-Wait 67: 0% guaranteed, ${fmt(pensionFull)}/mo, extra bridge ${fmt((profile.monthlyRetirementExpenses||0)*24)}, 20yr=${fmt(pensionFull*12*20)}
After table: 1-paragraph RECOMMENDATION. Note: Agirc solidarity −10% for 3yr if claimed before 63.`;

  try {
    // Run all 4 API calls in parallel
    const [resultA, resultB, resultC, resultD] = await Promise.all([
      callAI(client, promptA),
      callAI(client, promptB),
      callAI(client, promptC),
      callAI(client, promptD),
    ]);

    console.log('✅ CallA keys:', Object.keys(resultA));
    console.log('✅ CallB keys:', Object.keys(resultB));
    console.log('✅ CallC keys:', Object.keys(resultC));
    console.log('✅ CallD keys:', Object.keys(resultD));

    const flatten = (v: any): string => {
      if (typeof v === 'string') return v;
      if (!v) return '';
      const vals = Object.values(v).filter(x => typeof x === 'string') as string[];
      if (vals.length > 0) return vals.join('\n');
      return JSON.stringify(v);
    };

    return {
      summary:       flatten(resultA.summary),
      realism:       flatten(resultA.realism),
      firePlan:      flatten(resultB.firePlan),
      stocks:        flatten(resultC.stocks),
      realEstate:    flatten(resultC.realEstate),
      govRetirement: flatten(resultD.govRetirement),
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
