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
  agircAtLegalAge: number, bridgePhase2NetMonthly: number,
  yearsBeforeAgirc: number, yearsAfterAgircBeforePension: number,
  legalRetAge: number, cvvCostTotal: number, bridgeTotal: number,
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
- ✅ CVV (cotisation volontaire) during bridge: ${gapYears} yrs × ~€2,000 = ${fmt(cvvCostTotal)} total
- ✅ Agirc-Arrco claimed at age ${legalRetAge} (legal retirement age for born ${birthYear_})
  → No permanent reduction (minoration viagère) since claiming AT the legal age, not before
  → ⚠️ Solidarity malus was ABOLISHED on Dec 1, 2023 — no longer relevant (was -10% for 3yrs)
  → Agirc monthly from age ${legalRetAge}: ${fmt(agircAtLegalAge)}/month
- ✅ CNAV base pension claimed at age ${govAge} → taux plein AUTOMATIQUE (0% décote guaranteed by law)
  → CVV improves CNAV proportion: ${quartersAtRetirement} + ${gapYears*4} CVV quarters = ${Math.min(quartersAtRetirement+gapYears*4, trimestresRequis)}/${trimestresRequis}
- ✅ Scenario F total pension at ${govAge}: CNAV ${fmt(Math.round(pensionScenF - pensionAgirc))} + Agirc ${fmt(pensionAgirc)} = ${fmt(pensionScenF)}/month

BRIDGE CASH-FLOW WITH SCENARIO F:
- Phase 1 age ${retAge}–${legalRetAge-1} (${yearsBeforeAgirc} yrs): full withdrawal ${fmt(monthly)}/mo = ${fmt(monthly*12)}/yr from capital — no pension income
- Phase 2 age ${legalRetAge}–${govAge-1} (${yearsAfterAgircBeforePension} yrs): ${fmt(monthly)}/mo budget − ${fmt(agircAtLegalAge)}/mo Agirc = NET ${fmt(bridgePhase2NetMonthly)}/mo from capital
- Total capital drawn from bridge: ${fmt(bridgeTotal)} (saves ${fmt(agircAtLegalAge*12*yearsAfterAgircBeforePension)} vs claiming Agirc only at ${govAge})
- Age ${govAge}+: full pension ${fmt(pensionScenF)}/mo — capital preserved

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

  // ── Scenario F: CVV + Agirc at legal age + CNAV at govRetirementAge ───────
  // Legal retirement age under 2023 reform (for born 1974 → 64)
  const birthYear_    = profile.birthYear || 1974;
  const legalRetAge   = birthYear_ >= 1968 ? 64 : birthYear_ >= 1964 ? 63 : 62;
  const agircAtLegalAge   = pensionAgirc; // same Agirc points — no new points after retirement
  const yearsBeforeAgirc  = Math.max(0, legalRetAge - (profile.targetRetirementAge || 60)); // 60→64: 4 yrs
  const yearsAfterAgircBeforePension = Math.max(0, (profile.govRetirementAge || 67) - legalRetAge); // 64→67: 3 yrs
  const bridgePhase2NetMonthly = Math.max(0, (profile.monthlyRetirementExpenses||0) - agircAtLegalAge);
  const bridgeTotal    = (profile.monthlyRetirementExpenses||0) * 12 * yearsBeforeAgirc
                       + bridgePhase2NetMonthly * 12 * yearsAfterAgircBeforePension;
  const cvvCostTotal   = gapYears * 2160; // ~€2,160/yr CVV (Category 4 minimum, 25% PASS 2026)

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
    agircAtLegalAge, bridgePhase2NetMonthly,
    yearsBeforeAgirc, yearsAfterAgircBeforePension,
    legalRetAge, cvvCostTotal, bridgeTotal,
  );

  const BASE = `You are a retirement financial advisor. Reply ONLY with valid compact JSON (no markdown, no extra text). ENGLISH. Every JSON value MUST be a plain HTML string — never a nested object or array.

${ctx}`;

  // ── CALL A: summary + realism ─────────────────────────────────────────────
  const promptA = `${BASE}

Return JSON with exactly 2 keys:

"summary": HTML with: (1) capital table — house sale ${fmt(saleProceedsFull)} − gift ${fmt(giftToKids)} = ${fmt(saleProceeds)}, stocks ${fmt(stocksAtRetirement)}, cash ${fmt(profile.currentSavings||0)}, TOTAL ${fmt(totalCapital)}. (2) bridge table with 2 phases: Phase 1 age ${profile.targetRetirementAge}–${legalRetAge-1} (${yearsBeforeAgirc} yrs, no pension): ${fmt((profile.monthlyRetirementExpenses||0)*12)}/yr × ${yearsBeforeAgirc} = ${fmt((profile.monthlyRetirementExpenses||0)*12*yearsBeforeAgirc)}; Phase 2 age ${legalRetAge}–${profile.govRetirementAge-1} (${yearsAfterAgircBeforePension} yrs, Agirc ${fmt(agircAtLegalAge)}/mo): net ${fmt(bridgePhase2NetMonthly)}/mo × ${yearsAfterAgircBeforePension*12}mo = ${fmt(bridgePhase2NetMonthly*12*yearsAfterAgircBeforePension)}; TOTAL from capital: ${fmt(bridgeTotal)}. (3) capital at ${profile.govRetirementAge} at 0%/${(br*100).toFixed(0)}%/${(br*100+1).toFixed(0)}% bridge return. (4) at ${profile.govRetirementAge}: +inheritance ${fmt(profile.inheritanceAmount||0)} +pension ${fmt(pensionScenF)}/mo (Scenario F). (5) 2 urgent actions.

"realism": HTML 3-row table: scenario(optimistic/realistic/pessimistic) | monthly budget | capital at ${profile.govRetirementAge} | verdict. End with score /10.`;

  // ── CALL B: firePlan — year-by-year with Pension Income column ────────────
  const promptB = `${BASE}

Return JSON with exactly 1 key:

"firePlan": HTML year-by-year table columns: Year|Age|Event|Capital Start|Withdrawals|Pension Income|Net Draw|Return ${(br*100).toFixed(0)}%|Capital End.
Rows:
- ${yearsToRetirement} working years: capital grows at ${((profile.estimatedReturn||0.07)*100).toFixed(0)}%, Withdrawals=€0, Pension=€0, Net Draw=€0.
- ${yearsBeforeAgirc} bridge years age ${profile.targetRetirementAge}–${legalRetAge-1}: Withdrawals=${fmt(profile.monthlyRetirementExpenses||0)}/mo, Pension Income=€0, Net Draw=${fmt(profile.monthlyRetirementExpenses||0)}/mo, Return ${(br*100).toFixed(0)}%.
- Age ${legalRetAge}: Event="✅ Agirc claimed (legal age ${legalRetAge}, no reduction)", Pension Income=+${fmt(agircAtLegalAge)}/mo.
- ${yearsAfterAgircBeforePension} bridge years age ${legalRetAge}–${profile.govRetirementAge-1}: Withdrawals=${fmt(profile.monthlyRetirementExpenses||0)}/mo, Pension Income=+${fmt(agircAtLegalAge)}/mo, Net Draw=${fmt(bridgePhase2NetMonthly)}/mo.
- Age ${profile.govRetirementAge}: Event="✅ CNAV taux plein auto + Inheritance ${fmt(profile.inheritanceAmount||0)}", Pension Income=+${fmt(pensionScenF)}/mo (full Scenario F).
- 3 post-pension years: Withdrawals=${fmt(profile.monthlyRetirementExpenses||0)}/mo, Pension=${fmt(pensionScenF)}/mo, Net Draw=surplus.
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
★ F-CHOSEN: CVV ${gapYears}yrs + Agirc at ${legalRetAge} + CNAV at ${profile.govRetirementAge}: ${qtrsWithCvv}q, taux plein auto, CNAV ${fmt(pensionScenF_CNAV)}, Agirc ${fmt(pensionAgirc)}, Total ${fmt(pensionScenF)}/mo, ${fmt(cvvCostTotal)} CVV only, 20yr=${fmt(pensionScenF*12*20)} — BEST VALUE
After table: 1-paragraph RECOMMENDATION highlighting Scenario F as chosen, explaining: (1) no solidarity malus (abolished 2023), (2) Agirc at ${legalRetAge} = legal age, no permanent reduction, (3) CNAV taux plein auto at ${profile.govRetirementAge}, (4) monthly income improvement vs doing nothing: +${fmt(pensionScenF-scenA_pension)}/mo.`;

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
