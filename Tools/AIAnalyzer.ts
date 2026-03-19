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

function buildContext(
  profile: UserProfile, calc: FireResult,
  saleProceeds: number, saleProceedsFull: number, giftToKids: number,
  gapYears: number, yearsToRetirement: number, ageActuel: number,
  stocksAtRetirement: number, totalCapital: number,
  pensionFull: number, pensionReduced: number, pensionFullCNAV: number,
  pensionAgirc: number, pensionScenF: number,
  missingAtRetirement: number, decotePct: string, trimestresRequis: number, quartersAtRetirement: number,
  cvvCostTotal: number, cvvAnnualCost: number, cvvBracket: number, cvvCostNet: number, cvvTMI: number, bridgeTotal: number,
) {
  const hasPrecisePension = (profile.salaireMoyen||0) > 0;
  const retAge = profile.targetRetirementAge;
  const govAge = profile.govRetirementAge;
  const monthly = profile.monthlyRetirementExpenses || 0;
  const birthYear_ = profile.birthYear || 1974;
  return `Profile: age ${ageActuel} (born ${birthYear_}), retire at ${retAge}, state pension at ${govAge}.
Bridge period: ${gapYears} years. Monthly budget in retirement: ${fmt(monthly)}.

CAPITAL AT RETIREMENT (age ${retAge}):
- House sale: ${fmt(profile.realEstateValue||0)} − mortgage ${fmt(profile.mortgageRemaining||0)} − agency fees 4% (${fmt(Math.round((profile.realEstateValue||0)*0.04))}) − diagnostics €1,000 = ${fmt(saleProceedsFull)} − gift to kids ${fmt(giftToKids)} = NET ${fmt(saleProceeds)}
- NOTE: notary fees (frais de notaire) are paid by the BUYER in France, not the seller
- Stock portfolio: ${fmt(profile.stockPortfolio||0)} growing at ${((profile.estimatedReturn||0.05)*100).toFixed(0)}%/yr for ${yearsToRetirement} yrs = ${fmt(stocksAtRetirement)} at retirement
- Cash: ${fmt(profile.currentSavings||0)}
- TOTAL CAPITAL AT ${retAge}: ${fmt(totalCapital)}

FRENCH PENSION — ${hasPrecisePension ? 'PRECISE CALCULATION' : 'ESTIMATE ONLY (fill SAM + Agirc points for precision)'}:
- Quarters at retirement (age ${retAge}): ${quartersAtRetirement}/${trimestresRequis} required
- Missing quarters: ${missingAtRetirement} → décote capped at ${decotePct}% (legal max 25%)
${hasPrecisePension ? `- Retraite de base (CNAV) at age ${retAge} with ${decotePct}% décote: ${fmt(calc.pensionBaseMonthly||0)}/month (SAM ${fmt(profile.salaireMoyen||0)}/yr)
- Retraite de base (CNAV) at TAUX PLEIN (0% décote, i.e. claimed at ${govAge}): ${fmt(pensionFullCNAV)}/month
- Retraite complémentaire Agirc-Arrco: ${fmt(pensionAgirc)}/month (${Math.round(calc.agircPointsAtRetirement||0)} points × €1.4801 ÷ 12)
- TOTAL pension at TAUX PLEIN (age ${govAge}, no CVV): ${fmt(pensionFull)}/month
- TOTAL pension at age ${retAge} with décote (do nothing): ${fmt(pensionReduced)}/month` : `- Estimated pension: ${fmt(profile.govMonthlyPension||0)}/month`}

CHOSEN STRATEGY — SCENARIO F (confirmed by user):
- ✅ CVV Category ${cvvBracket} during bridge: ${gapYears} yrs × €${cvvAnnualCost}/yr = ${fmt(cvvCostTotal)} gross / ~${fmt(cvvCostNet)} net after ${Math.round(cvvTMI*100)}% tax deduction (last gross salary determines bracket)
- ✅ CNAV + Agirc-Arrco BOTH claimed simultaneously at age ${govAge} (French law: liquidation globale — cannot split CNAV and Agirc claims)
  → ⚠️ Solidarity malus ABOLISHED Dec 1, 2023 — no longer relevant
  → CNAV: taux plein AUTOMATIQUE at ${govAge} (0% décote guaranteed by law regardless of missing quarters)
  → CVV improves CNAV proportion: ${quartersAtRetirement} + ${gapYears*4} CVV quarters = ${Math.min(quartersAtRetirement+gapYears*4, trimestresRequis)}/${trimestresRequis}
- ✅ Scenario F total pension from ${govAge}: CNAV ${fmt(Math.round(pensionScenF - pensionAgirc))} + Agirc ${fmt(pensionAgirc)} = ${fmt(pensionScenF)}/month

BRIDGE CASH-FLOW WITH SCENARIO F:
- SINGLE PHASE: age ${retAge}–${govAge-1} (${gapYears} yrs, NO pension income — both pensions start at ${govAge} only)
- Full withdrawal: ${fmt(monthly)}/mo = ${fmt(monthly*12)}/yr from capital for all ${gapYears} bridge years
- Total capital drawn: ${fmt(bridgeTotal)} (age ${retAge} to ${govAge})
- Age ${govAge}+: full pension ${fmt(pensionScenF)}/mo — capital preserved, withdrawal drops to near zero

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
  const agencyFeeRate   = 0.04;
  const diagnostics     = 1000;
  const saleProceedsFull = saleNet - Math.round(saleNet * agencyFeeRate) - diagnostics;
  const giftToKids      = profile.giftToChildren || 0;
  const saleProceeds    = saleProceedsFull - giftToKids;
  const ageActuel       = profile.age || 51;
  const yearsToRetirement = Math.max(0, profile.targetRetirementAge - ageActuel);
  const r               = profile.estimatedReturn || 0.05;
  const stocksAtRetirement = Math.round((profile.stockPortfolio||0) * Math.pow(1 + r, yearsToRetirement));
  const totalCapital    = saleProceeds + (profile.currentSavings||0) + stocksAtRetirement;
  const br              = profile.bridgeReturn ?? 0.03;

  // ── French pension — CORRECTED calculations ────────────────────────────────
  const missingAtRetirement = calc.missingQuarters;
  // ✅ FIX: décote is CAPPED at 25% by French law
  const decoteRateCapped = Math.min(0.25, missingAtRetirement * 0.0125);
  const decotePct        = (decoteRateCapped * 100).toFixed(1); // max "25.0", was wrongly showing "37.5"

  const pensionBase      = calc.pensionBaseMonthly || 0; // CNAV at retirement age WITH décote applied
  const pensionAgirc     = calc.pensionAgircMonthly || 0; // Agirc — points-based, no quarter décote
  const trimestresRequis = calc.trimestresRequis || 172;
  const quartersAtRetirement = calc.quartersAtRetirement || 0;

  // ✅ FIX: pensionFull = TRUE taux plein (undo the capped décote from CNAV, Agirc unchanged)
  const pensionFullCNAV  = pensionBase > 0 ? Math.round(pensionBase / (1 - decoteRateCapped)) : 0;
  const pensionFull      = pensionFullCNAV + pensionAgirc; // TRUE taux plein — no décote, full Agirc

  // ✅ FIX: pensionReduced = pension at targetRetirementAge WITH décote (calc already applied it)
  const pensionReduced   = calc.calculatedPension || (profile.govMonthlyPension||0);

  // ── Scenario F: CVV during bridge + claim CNAV + Agirc simultaneously at govRetirementAge ──
  // French law: "liquidation globale" — CNAV and Agirc-Arrco must be claimed together
  // Bridge is ONE single phase: age retAge→govAge, NO pension income, full withdrawal throughout
  const birthYear_    = profile.birthYear || 1974;
  const bridgeTotal    = (profile.monthlyRetirementExpenses||0) * 12 * gapYears;
  const legalRetAge    = birthYear_ >= 1968 ? 64 : birthYear_ >= 1964 ? 63 : 62; // info only — Scenario F waits until govRetirementAge

  // CVV bracket based on last gross salary vs PASS 2026 (€48,060)
  const PASS_2026      = 48060;
  const lastGrossSal   = profile.lastGrossSalary || 85000;
  const passRatio_     = lastGrossSal / PASS_2026;
  const cvvAnnualCost  = passRatio_ >= 1.0 ? 8632 : passRatio_ >= 0.75 ? 6474 : passRatio_ >= 0.50 ? 4316 : 2160;
  const cvvBracket     = passRatio_ >= 1.0 ? 1 : passRatio_ >= 0.75 ? 2 : passRatio_ >= 0.50 ? 3 : 4;
  const cvvTMI         = lastGrossSal > 82341 ? 0.41 : lastGrossSal > 28797 ? 0.30 : 0.11;
  const cvvCostTotal   = gapYears * cvvAnnualCost;
  const cvvCostNet     = Math.round(cvvCostTotal * (1 - cvvTMI));

  // Scenario F CNAV: taux plein auto at 67, with CVV quarters improving proportion
  const qtrsWithCvv    = Math.min(quartersAtRetirement + gapYears * 4, trimestresRequis);
  const pensionScenF_CNAV = Math.round(pensionFullCNAV * qtrsWithCvv / Math.max(1, Math.min(quartersAtRetirement, trimestresRequis)));
  const pensionScenF   = pensionScenF_CNAV + pensionAgirc; // Scenario F total pension

  // ── Pre-calculate all scenario pensions for govRetirement table ─────────
  // Agirc is NEVER reduced by missing quarters — it's purely points-based
  // Décote only applies to CNAV (base pension rate)
  const scenA_pension  = pensionReduced; // do nothing, claim at targetRetirementAge
  const scenB_missing  = Math.max(0, trimestresRequis - quartersAtRetirement - 12);
  const scenB_CNAV     = Math.round(pensionFullCNAV * (1 - Math.min(0.25, scenB_missing * 0.0125)));
  const scenB_pension  = scenB_CNAV + pensionAgirc;
  const scenC_qtrs     = Math.min(quartersAtRetirement + gapYears * 4, trimestresRequis);
  const scenC_missing  = Math.max(0, trimestresRequis - scenC_qtrs);
  const scenC_CNAV     = Math.round(pensionFullCNAV * (1 - Math.min(0.25, scenC_missing * 0.0125)));
  const scenC_pension  = scenC_CNAV + pensionAgirc;
  const scenD_qtrs     = Math.min(quartersAtRetirement + 12 + gapYears * 4, trimestresRequis);
  const scenD_missing  = Math.max(0, trimestresRequis - scenD_qtrs);
  const scenD_CNAV     = Math.round(pensionFullCNAV * (1 - Math.min(0.25, scenD_missing * 0.0125)));
  const scenD_pension  = scenD_CNAV + pensionAgirc;
  const wait67ExtraBridge = (profile.monthlyRetirementExpenses||0) * 24; // extra 2yr bridge vs age 65

  const capitalAtPension = Math.round(totalCapital - bridgeTotal + totalCapital * br * gapYears * 0.5);

  const ctx = buildContext(
    profile, calc,
    saleProceeds, saleProceedsFull, giftToKids,
    gapYears, yearsToRetirement, ageActuel,
    stocksAtRetirement, totalCapital,
    pensionFull, pensionReduced, pensionFullCNAV, pensionAgirc, pensionScenF,
    missingAtRetirement, decotePct, trimestresRequis, quartersAtRetirement,
    cvvCostTotal, cvvAnnualCost, cvvBracket, cvvCostNet, cvvTMI, bridgeTotal,
  );

  const BASE = `You are a retirement financial advisor. Reply ONLY with valid compact JSON (no markdown, no extra text). ENGLISH. Every JSON value MUST be a plain HTML string — never a nested object or array.

${ctx}`;

  // ── CALL A: summary + realism ─────────────────────────────────────────────
  const promptA = `${BASE}

Return JSON with exactly 2 keys:

"summary": HTML with: (1) capital table — house sale ${fmt(saleProceedsFull)} − gift ${fmt(giftToKids)} = ${fmt(saleProceeds)}, stocks ${fmt(stocksAtRetirement)}, cash ${fmt(profile.currentSavings||0)}, TOTAL ${fmt(totalCapital)}. (2) bridge table SINGLE PHASE — age ${profile.targetRetirementAge}–${profile.govRetirementAge-1} (${gapYears} yrs, NO pension income — CNAV+Agirc both start at ${profile.govRetirementAge} only, French law requires simultaneous claim): ${fmt((profile.monthlyRetirementExpenses||0)*12)}/yr × ${gapYears} = ${fmt(bridgeTotal)} total from capital. CVV cost: €${cvvAnnualCost}/yr × ${gapYears} = ${fmt(cvvCostTotal)} gross / ~${fmt(cvvCostNet)} net. (3) capital at ${profile.govRetirementAge} at 0%/${(br*100).toFixed(0)}%/${(br*100+1).toFixed(0)}% bridge return. (4) at ${profile.govRetirementAge}: +inheritance ${fmt(profile.inheritanceAmount||0)} +pension ${fmt(pensionScenF)}/mo (Scenario F). (5) 2 urgent actions.

"realism": HTML 3-row table: scenario(optimistic/realistic/pessimistic) | monthly budget | capital at ${profile.govRetirementAge} | verdict. End with score /10.`;

  // ── CALL B: firePlan — year-by-year with Pension Income column ────────────
  const promptB = `${BASE}

Return JSON with exactly 1 key:

"firePlan": HTML year-by-year table columns: Year|Age|Event|Capital Start|Withdrawals|Pension Income|Net Draw|Return ${(br*100).toFixed(0)}%|Capital End.
Rows:
- ${yearsToRetirement} working years: capital grows at ${((profile.estimatedReturn||0.07)*100).toFixed(0)}%, Withdrawals=€0, Pension=€0, Net Draw=€0.
- ${gapYears} bridge years age ${profile.targetRetirementAge}–${profile.govRetirementAge-1}: SINGLE PHASE, Withdrawals=${fmt(profile.monthlyRetirementExpenses||0)}/mo, Pension Income=€0 (NO pension during bridge — CNAV+Agirc only start at ${profile.govRetirementAge}), Net Draw=${fmt(profile.monthlyRetirementExpenses||0)}/mo, Return ${(br*100).toFixed(0)}%. Add CVV cost €${cvvAnnualCost}/yr each bridge year as a note.
- Age ${profile.govRetirementAge}: Event="✅ CNAV+Agirc claimed simultaneously (taux plein auto) + Inheritance ${fmt(profile.inheritanceAmount||0)}", Pension Income=+${fmt(pensionScenF)}/mo (Scenario F: CNAV ${fmt(Math.round(pensionScenF-pensionAgirc))} + Agirc ${fmt(pensionAgirc)}).
- 3 post-pension years: Withdrawals=${fmt(profile.monthlyRetirementExpenses||0)}/mo, Pension=${fmt(pensionScenF)}/mo, Net Draw=surplus (pension > expenses = capital grows).
Capital at retirement = ${fmt(totalCapital)}. Bridge return = ${(br*100).toFixed(0)}%. Mark inheritance ${fmt(profile.inheritanceAmount||0)} at age ${profile.inheritanceAge||65}. After table: 3-line recommended investment split for ${fmt(totalCapital)}.`;

  // ── CALL C: stocks + realEstate ──────────────────────────────────────────
  const promptC = `${BASE}

Return JSON with exactly 2 keys:

"stocks": HTML table: Allocation%|ETF Product|ISIN|Amount €|Est. Monthly Income. Include 4–5 ETFs, recommended platform (PEA/CTO/Assurance-vie), tax note.

"realEstate": HTML with: (1) sale calculation table — ${fmt(profile.realEstateValue||0)} − mortgage ${fmt(profile.mortgageRemaining||0)} − agency 4% ${fmt(Math.round((profile.realEstateValue||0)*0.04))} − diagnostics €1,000 − gift ${fmt(giftToKids)} = net ${fmt(saleProceeds)}. Note: notary fees paid by BUYER. (2) stock portfolio grows from ${fmt(profile.stockPortfolio||0)} to ${fmt(stocksAtRetirement)} over ${yearsToRetirement} yrs at ${((profile.estimatedReturn||0.07)*100).toFixed(0)}%. (3) Bretagne free housing value. (4) Best timing advice to sell.`;

  // ── CALL D: govRetirement — all scenarios with correct pre-calculated pensions
  const promptD = `You are a French retirement law expert. Reply ONLY with valid compact JSON (no markdown). ENGLISH. Every JSON value MUST be a plain HTML string — never a nested object.

${ctx}

PRE-CALCULATED PENSIONS — use these EXACT numbers (Agirc never reduced by quarters — points-based only):
- Taux plein CNAV at ${profile.govRetirementAge} (no CVV): ${fmt(pensionFullCNAV)}/mo | Agirc: ${fmt(pensionAgirc)}/mo | TRUE TAUX PLEIN = ${fmt(pensionFull)}/mo
- Pension at retirement age ${profile.targetRetirementAge} (do nothing, ${decotePct}% décote on CNAV only): CNAV ${fmt(pensionBase)}/mo + Agirc ${fmt(pensionAgirc)}/mo = ${fmt(scenA_pension)}/mo
- Legal retirement age for born ${birthYear_}: ${legalRetAge} (2023 reform)
- Solidarity malus: ABOLISHED Dec 1 2023 — no longer applicable

Return JSON with 1 key:

"govRetirement": HTML table — Scenario|Qtrs at claim|Missing|Décote|CNAV/mo|Agirc/mo|Total/mo|Cost|20yr total|Verdict
A-Do nothing (claim at ${profile.targetRetirementAge}): ${quartersAtRetirement}q, ${missingAtRetirement} missing, −${decotePct}%, CNAV ${fmt(pensionBase)}, Agirc ${fmt(pensionAgirc)}, Total ${fmt(scenA_pension)}/mo, €0 cost, 20yr=${fmt(scenA_pension*12*20)}
B-Rachat 12q (then claim at ${profile.targetRetirementAge}): ${quartersAtRetirement+12}q, ${scenB_missing} missing, −${(Math.min(25,scenB_missing*1.25)).toFixed(1)}%, CNAV ${fmt(scenB_CNAV)}, Agirc ${fmt(pensionAgirc)}, Total ${fmt(scenB_pension)}/mo, €54k gross/€38k net after tax, 20yr=${fmt(scenB_pension*12*20)}
C-CVV ${gapYears}yrs (claim at ${profile.targetRetirementAge}): ${scenC_qtrs}q, ${scenC_missing} missing, −${(Math.min(25,scenC_missing*1.25)).toFixed(1)}%, CNAV ${fmt(scenC_CNAV)}, Agirc ${fmt(pensionAgirc)}, Total ${fmt(scenC_pension)}/mo, ${fmt(cvvCostTotal)} CVV cost, 20yr=${fmt(scenC_pension*12*20)}
D-Rachat+CVV (claim at ${profile.targetRetirementAge}): ${scenD_qtrs}q vs ${trimestresRequis} → ${scenD_missing===0?'TAUX PLEIN':'still short'}, CNAV ${fmt(scenD_CNAV)}, Agirc ${fmt(pensionAgirc)}, Total ${fmt(scenD_pension)}/mo, €54k+${fmt(cvvCostTotal)} combined, 20yr=${fmt(scenD_pension*12*20)}
E-Wait 67 (no CVV): ${quartersAtRetirement}q, taux plein auto, CNAV ${fmt(pensionFullCNAV)}, Agirc ${fmt(pensionAgirc)}, Total ${fmt(pensionFull)}/mo, €0 cost but extra bridge ${fmt(wait67ExtraBridge)}, 20yr=${fmt(pensionFull*12*20)}
★ F-CHOSEN: CVV Cat.${cvvBracket} ${gapYears}yrs (€${cvvAnnualCost}/yr × ${gapYears} = ${fmt(cvvCostTotal)} gross / ~${fmt(cvvCostNet)} net) + CNAV+Agirc BOTH at ${profile.govRetirementAge} (simultaneous, French law): ${qtrsWithCvv}q, taux plein auto, CNAV ${fmt(pensionScenF_CNAV)}, Agirc ${fmt(pensionAgirc)}, Total ${fmt(pensionScenF)}/mo, 20yr=${fmt(pensionScenF*12*20)} — BEST VALUE
After table: 1-paragraph RECOMMENDATION highlighting Scenario F as chosen, explaining: (1) solidarity malus ABOLISHED Dec 2023, (2) CNAV+Agirc must be claimed simultaneously at ${profile.govRetirementAge} (French law — cannot split), (3) CNAV taux plein auto at ${profile.govRetirementAge}, (4) CVV cost: ${fmt(cvvCostTotal)} gross / ~${fmt(cvvCostNet)} net, (5) monthly income improvement vs doing nothing: +${fmt(pensionScenF-scenA_pension)}/mo.`;

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

// ── Scenario-specific fire plan ─────────────────────────────────────────────
export async function analyzeFirePlan(profile: UserProfile, calc: FireResult, scenario: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY || (globalThis as any).Bun?.env?.ANTHROPIC_API_KEY;
  if (!apiKey) return '<p style="color:var(--muted);">No API key configured.</p>';
  const client = new Anthropic({ apiKey });

  const gapYears        = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
  const retAge          = profile.targetRetirementAge;
  const govAge          = profile.govRetirementAge;
  const ageActuel       = profile.age || 51;
  const yearsToRetirement = Math.max(0, retAge - ageActuel);
  const r               = profile.estimatedReturn || 0.05;
  const br              = profile.bridgeReturn ?? 0.03;
  const monthly         = profile.monthlyRetirementExpenses || 0;
  const saleNet         = Math.max(0, (profile.realEstateValue||0) - (profile.mortgageRemaining||0));
  const saleProceedsFull = saleNet - Math.round(saleNet * 0.04) - 1000;
  const saleProceeds    = saleProceedsFull - (profile.giftToChildren||0);
  const stocksAtRetirement = Math.round((profile.stockPortfolio||0) * Math.pow(1+r, yearsToRetirement));
  const totalCapital    = saleProceeds + (profile.currentSavings||0) + stocksAtRetirement;

  const missingAtRetirement = calc.missingQuarters || 0;
  const decoteRateCapped = Math.min(0.25, missingAtRetirement * 0.0125);
  const trimestresRequis = calc.trimestresRequis || 172;
  const quartersAtRetirement = calc.quartersAtRetirement || 0;
  const pensionBase     = calc.pensionBaseMonthly || 0;
  const pensionAgirc    = calc.pensionAgircMonthly || 0;
  const pensionFullCNAV = pensionBase > 0 ? Math.round(pensionBase / (1 - decoteRateCapped)) : 0;
  const pensionFull     = pensionFullCNAV + pensionAgirc;
  const pensionReduced  = calc.calculatedPension || 0;

  const PASS_2026       = 48060;
  const lastGrossSal    = profile.lastGrossSalary || 85000;
  const passRatio_      = lastGrossSal / PASS_2026;
  const cvvAnnualCost   = passRatio_ >= 1.0 ? 8632 : passRatio_ >= 0.75 ? 6474 : passRatio_ >= 0.50 ? 4316 : 2160;
  const cvvBracket      = passRatio_ >= 1.0 ? 1 : passRatio_ >= 0.75 ? 2 : passRatio_ >= 0.50 ? 3 : 4;
  const cvvTMI          = lastGrossSal > 82341 ? 0.41 : lastGrossSal > 28797 ? 0.30 : 0.11;
  const cvvCostTotal    = gapYears * cvvAnnualCost;
  const cvvCostNet      = Math.round(cvvCostTotal * (1 - cvvTMI));
  const qtrsWithCvv     = Math.min(quartersAtRetirement + gapYears * 4, trimestresRequis);
  const pensionScenF_CNAV = Math.round(pensionFullCNAV * qtrsWithCvv / Math.max(1, Math.min(quartersAtRetirement, trimestresRequis)));
  const pensionScenF    = pensionScenF_CNAV + pensionAgirc;

  const scenB_missing   = Math.max(0, trimestresRequis - quartersAtRetirement - 12);
  const scenB_CNAV      = Math.round(pensionFullCNAV * (1 - Math.min(0.25, scenB_missing * 0.0125)));
  const scenB_pension   = scenB_CNAV + pensionAgirc;
  const scenC_qtrs      = Math.min(quartersAtRetirement + gapYears * 4, trimestresRequis);
  const scenC_missing   = Math.max(0, trimestresRequis - scenC_qtrs);
  const scenC_CNAV      = Math.round(pensionFullCNAV * (1 - Math.min(0.25, scenC_missing * 0.0125)));
  const scenC_pension   = scenC_CNAV + pensionAgirc;
  const scenD_qtrs      = Math.min(quartersAtRetirement + 12 + gapYears * 4, trimestresRequis);
  const scenD_missing   = Math.max(0, trimestresRequis - scenD_qtrs);
  const scenD_CNAV      = Math.round(pensionFullCNAV * (1 - Math.min(0.25, scenD_missing * 0.0125)));
  const scenD_pension   = scenD_CNAV + pensionAgirc;

  // Scenarios G & H: work longer, extra Agirc points
  const agircPerYrMo    = ((profile.agircPointsPerYear||0) * 1.4801) / 12;
  const yearsTo65       = Math.max(0, 65 - retAge);
  const yearsTo67       = Math.max(0, 67 - retAge);
  const quartersAt65    = Math.min(quartersAtRetirement + yearsTo65 * 4, trimestresRequis);
  const quartersAt67    = Math.min(quartersAtRetirement + yearsTo67 * 4, trimestresRequis);
  const propBase        = Math.max(1, Math.min(quartersAtRetirement, trimestresRequis));
  const pensionG_CNAV   = Math.round(pensionFullCNAV * quartersAt65 / propBase);
  const pensionG_Agirc  = Math.round(pensionAgirc + agircPerYrMo * yearsTo65);
  const pensionG        = pensionG_CNAV + pensionG_Agirc;
  const pensionH_CNAV   = Math.round(pensionFullCNAV * quartersAt67 / propBase);
  const pensionH_Agirc  = Math.round(pensionAgirc + agircPerYrMo * yearsTo67);
  const pensionH        = pensionH_CNAV + pensionH_Agirc;

  // Map scenario to variables
  type ScenDef = { label: string; pension: number; claimAge: number; costNote: string; bridgeRows: string; workYears: number; stopAge: number; };
  const scenMap: Record<string, ScenDef> = {
    A: { label: 'A — Do nothing', pension: pensionReduced, claimAge: govAge, costNote: '€0 cost, but pension reduced by décote', bridgeRows: `- ${gapYears} bridge years age ${retAge}–${govAge-1}: SINGLE PHASE, Withdrawals=${fmt(monthly)}/mo, Pension=€0, Net Draw=${fmt(monthly)}/mo, Return ${(br*100).toFixed(0)}%.`, workYears: yearsToRetirement, stopAge: retAge },
    B: { label: 'B — Rachat 12 quarters', pension: scenB_pension, claimAge: govAge, costNote: `Rachat cost ~€54k gross / ~€38k net after 30% tax, paid before age 60`, bridgeRows: `- ${gapYears} bridge years age ${retAge}–${govAge-1}: Withdrawals=${fmt(monthly)}/mo, Pension=€0, Net Draw=${fmt(monthly)}/mo, Return ${(br*100).toFixed(0)}%.`, workYears: yearsToRetirement, stopAge: retAge },
    C: { label: `C — CVV ${gapYears} yrs`, pension: scenC_pension, claimAge: govAge, costNote: `CVV Cat.${cvvBracket}: €${cvvAnnualCost}/yr × ${gapYears} yrs = ${fmt(cvvCostTotal)} gross / ~${fmt(cvvCostNet)} net after tax`, bridgeRows: `- ${gapYears} bridge years age ${retAge}–${govAge-1}: Withdrawals=${fmt(monthly)}/mo, Pension=€0, CVV cost €${cvvAnnualCost}/yr each year (tax-deductible), Net Draw=${fmt(monthly)}/mo, Return ${(br*100).toFixed(0)}%.`, workYears: yearsToRetirement, stopAge: retAge },
    D: { label: 'D — Rachat + CVV', pension: scenD_pension, claimAge: govAge, costNote: `Rachat ~€38k net + CVV ~${fmt(cvvCostNet)} net = combined cost`, bridgeRows: `- ${gapYears} bridge years age ${retAge}–${govAge-1}: Withdrawals=${fmt(monthly)}/mo, Pension=€0, CVV cost €${cvvAnnualCost}/yr each year, Net Draw=${fmt(monthly)}/mo, Return ${(br*100).toFixed(0)}%.`, workYears: yearsToRetirement, stopAge: retAge },
    E: { label: 'E — Wait until 67 (no CVV)', pension: pensionFull, claimAge: 67, costNote: `€0 CVV cost but extra 2yr bridge (age 65→67): ${fmt(monthly)} × 24 = ${fmt(monthly*24)}`, bridgeRows: `- ${gapYears} bridge years age ${retAge}–66: Withdrawals=${fmt(monthly)}/mo, Pension=€0, No CVV cost, Net Draw=${fmt(monthly)}/mo, Return ${(br*100).toFixed(0)}%. (Note: extra 2 years vs claiming at 65)`, workYears: yearsToRetirement, stopAge: retAge },
    F: { label: `F — CVV Cat.${cvvBracket} + claim at 67`, pension: pensionScenF, claimAge: 67, costNote: `CVV Cat.${cvvBracket}: ${fmt(cvvCostTotal)} gross / ~${fmt(cvvCostNet)} net after ${Math.round(cvvTMI*100)}% tax`, bridgeRows: `- ${gapYears} bridge years age ${retAge}–66: SINGLE PHASE, Withdrawals=${fmt(monthly)}/mo, Pension=€0 (CNAV+Agirc both start at 67 only — liquidation globale), CVV cost €${cvvAnnualCost}/yr each bridge year (add as note), Net Draw=${fmt(monthly)}/mo, Return ${(br*100).toFixed(0)}%.`, workYears: yearsToRetirement, stopAge: retAge },
    G: { label: 'G — Work until 65, claim at 67', pension: pensionG, claimAge: 67, costNote: '€0 strategy cost — no CVV needed', bridgeRows: `- 2 bridge years age 65–66 (stopped working, waiting for pension at 67): Withdrawals=${fmt(monthly)}/mo, Pension=€0, Net Draw=${fmt(monthly)}/mo, Return ${(br*100).toFixed(0)}%.`, workYears: 65 - ageActuel, stopAge: 65 },
    H: { label: 'H — Work until 67, claim at 67', pension: pensionH, claimAge: 67, costNote: '€0 cost — no bridge period at all', bridgeRows: '(No bridge period — pension starts immediately at 67)', workYears: 67 - ageActuel, stopAge: 67 },
  };

  const sc = scenMap[scenario] || scenMap['F'];
  const isGH = scenario === 'G' || scenario === 'H';
  const capitalNote = isGH
    ? `Capital at retirement (age ${sc.stopAge}): not recalculated here — compare against base capital ${fmt(totalCapital)} at age ${retAge}. User keeps job income until ${sc.stopAge}, no house sale assumed at 60 in this comparison.`
    : `Capital at retirement (age ${retAge}): house sale ${fmt(saleProceedsFull)} − gift ${fmt(profile.giftToChildren||0)} = ${fmt(saleProceeds)}, stocks ${fmt(stocksAtRetirement)}, cash ${fmt(profile.currentSavings||0)}, TOTAL ${fmt(totalCapital)}.`;

  const prompt = `You are a French retirement financial advisor. Reply ONLY with valid compact JSON (no markdown). ENGLISH. Every JSON value MUST be a plain HTML string.

Profile: age ${ageActuel}, retire at ${sc.stopAge}, state pension at ${sc.claimAge}.
${capitalNote}
Bridge return: ${(br*100).toFixed(0)}%.
Monthly retirement budget: ${fmt(monthly)}.
Inheritance: ${fmt(profile.inheritanceAmount||0)} at age ${profile.inheritanceAge||65}.

SCENARIO ${scenario}: ${sc.label}
Pension from age ${sc.claimAge}: CNAV + Agirc = ${fmt(sc.pension)}/mo gross (before income tax — deduct ~30% for net)
Cost: ${sc.costNote}

Return JSON with exactly 1 key:
"firePlan": HTML styled table (same dark-theme style as existing page) with title "Retirement Financial Plan: Scenario ${scenario} — ${sc.label}" at top.
Columns: Year | Age | Event | Capital Start | Withdrawals | Pension Income (gross) | Net Draw | Return ${(br*100).toFixed(0)}% | Capital End.
Rows:
- ${sc.workYears} working years (age ${ageActuel}–${sc.stopAge-1}): Withdrawals=€0, Pension=€0, Net Draw=€0, capital grows at ${((r)*100).toFixed(0)}%.
${sc.bridgeRows}
- Age ${sc.claimAge}: Event="✅ CNAV+Agirc claimed simultaneously${scenario==='G'||scenario==='H'?' (claim at 67)':''} + Inheritance ${fmt(profile.inheritanceAmount||0)}", Pension Income=+${fmt(sc.pension)}/mo.
- 3 post-pension years at age ${sc.claimAge}+: show surplus or deficit vs monthly budget.
After table: 2-line note on (1) whether pension covers monthly budget, (2) strategy cost summary.
⚠ Note in table header: "Monthly pension figures are GROSS before income tax — deduct ~30% (CSG 8.3% + income tax) for net amount."`;

  try {
    const result = await callAI(client, prompt);
    return result.firePlan || '<p>No response from AI.</p>';
  } catch (err: any) {
    return `<p style="color:#e74c3c;">AI error: ${err?.message || err}</p>`;
  }
}
