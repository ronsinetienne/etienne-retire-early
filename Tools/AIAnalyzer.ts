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

export async function analyzeProfile(profile: UserProfile, calc: FireResult): Promise<AIAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY || (globalThis as any).Bun?.env?.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackAnalysis(calc);
  }

  const client = new Anthropic({ apiKey });

  const gapYears   = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
  const saleNet    = Math.max(0, (profile.realEstateValue || 0) - (profile.mortgageRemaining || 0));
  const notaireFees= Math.round(saleNet * 0.03); // ~3% agent/frais
  const saleProceeds = saleNet - notaireFees;
  const bridgeMonths = gapYears * 12;
  const naiveMonthly = bridgeMonths > 0 ? Math.round(saleProceeds / bridgeMonths) : 0;
  const trimestresValides   = (profile.contributionYears || 0) * 4;
  const trimestresRequis    = (profile.targetContributionYears || 43) * 4;
  const trimestresManquants = Math.max(0, trimestresRequis - trimestresValides);
  const ageActuel = profile.age || 51;
  const yearsToRetirement = Math.max(0, profile.targetRetirementAge - ageActuel);

  const prompt = `Tu es un conseiller financier et expert en droit de la retraite française.
L'utilisateur NE veut PAS un calcul FIRE abstrait. Il veut une RÉFLEXION PROFONDE et un PLAN D'ACTION CONCRET basé sur sa situation réelle.

NOTES DE L'UTILISATEUR (lis attentivement, prends tout en compte):
"""
${profile.notes || '(pas de notes)'}
"""

═══════════════════════════════════════
SITUATION FINANCIÈRE RÉELLE DE L'UTILISATEUR
═══════════════════════════════════════
- Âge actuel: ${ageActuel} ans
- Revenu mensuel net actuel: ${fmt(profile.monthlyIncome || 0)}
- Dépenses mensuelles actuelles: ${fmt(profile.monthlyExpenses || 0)}
- Épargne mensuelle actuelle: ${fmt(Math.max(0, (profile.monthlyIncome||0) - (profile.monthlyExpenses||0)))}
- Cash/épargne disponible: ${fmt(profile.currentSavings || 0)}
- Portefeuille boursier: ${fmt(profile.stockPortfolio || 0)}

IMMOBILIER:
- Maison à VENDRE (${profile.secondPropertyCity ? 'résidence principale actuelle' : 'Versailles'}): ${fmt(profile.realEstateValue || 0)} — crédit restant: ${fmt(profile.mortgageRemaining || 0)}
- Net de vente estimé (après remboursement crédit, ~3% frais): ${fmt(saleProceeds)}
- Maison de retraite${profile.secondPropertyCity ? ` (${profile.secondPropertyCity})` : ' (Bretagne)'}: ${fmt(profile.secondPropertyValue || 0)} — SANS crédit → vivra là gratuitement
- Revenu locatif mensuel actuel: ${fmt(profile.monthlyRentalIncome || 0)}

HÉRITAGE:
- Montant attendu: ${fmt(profile.inheritanceAmount || 0)} à l'âge de ${profile.inheritanceAge || 65} ans

OBJECTIF RETRAITE:
- Veut partir à: ${profile.targetRetirementAge || 60} ans (dans ${yearsToRetirement} ans)
- Retraite légale française: ${profile.govRetirementAge || 65} ans
- Période "pont" sans revenus: ${gapYears} ans (de ${profile.targetRetirementAge} à ${profile.govRetirementAge} ans)
- Budget mensuel souhaité en retraite: ${fmt(profile.monthlyRetirementExpenses || 0)}
- Pension d'État estimée: ${fmt(profile.govMonthlyPension || 0)}/mois
- Années de cotisation validées: ${profile.contributionYears || 0} ans = ${trimestresValides} trimestres
- Trimestres requis pour taux plein: ${trimestresRequis}
- Trimestres manquants si arrêt à ${profile.targetRetirementAge}: ${trimestresManquants}

CALCUL CLÉ DE LA PÉRIODE PONT:
- Durée de la période sans revenus: ${gapYears} ans = ${bridgeMonths} mois
- Capital disponible (vente maison): ${fmt(saleProceeds)}
- Budget mensuel maximum (sans investir): ${fmt(naiveMonthly)}
- À 65 ans arrive: héritage de ${fmt(profile.inheritanceAmount || 0)} + pension d'État ${fmt(profile.govMonthlyPension || 0)}/mois
═══════════════════════════════════════

Reply ONLY with valid JSON with exactly these 6 keys (HTML in each value using h4/p/ul/li/strong/table). ENGLISH ONLY. Be concise and use real numbers. NO markdown around the JSON.

IMPORTANT NOTE ON BUDGET: The user wants to know if their STATED monthly budget of ${fmt(profile.monthlyRetirementExpenses||0)} is sustainable. Do NOT show "maximum possible monthly spend". Show: "with ${fmt(profile.monthlyRetirementExpenses||0)}/month, here is how the capital evolves and what is left at age ${profile.govRetirementAge}."

"summary":
- Total capital at age ${profile.targetRetirementAge}: house sale net ${fmt(saleProceeds)} + cash ${fmt(profile.currentSavings||0)} + stocks ${fmt(profile.stockPortfolio||0)} = TOTAL
- Bridge period (${profile.targetRetirementAge}→${profile.govRetirementAge}): spending ${fmt(profile.monthlyRetirementExpenses||0)}/month = ${fmt((profile.monthlyRetirementExpenses||0)*12*gapYears)} total over ${gapYears} years. Show capital remaining at age ${profile.govRetirementAge} in 3 scenarios (no return / 3% return / 4% return)
- At age ${profile.govRetirementAge}: inheritance ${fmt(profile.inheritanceAmount||0)} + state pension ${fmt(profile.govMonthlyPension||0)}/month arrives → total monthly income
- Feasibility verdict in 1 sentence. 2 urgent actions.

"firePlan": HTML table (Year|Age|Key Event|Capital Start|Income|Expenses|Capital End) — ${yearsToRetirement} years before retirement + ${gapYears} bridge years + 5 years after ${profile.govRetirementAge}. Show how ${fmt(saleProceeds)} capital depletes at ${fmt(profile.monthlyRetirementExpenses||0)}/month with 3% annual return. Show inheritance ${fmt(profile.inheritanceAmount||0)} at age ${profile.inheritanceAge||65}. Then: investment allocation of the ${fmt(saleProceeds)} (Livret A/PEA/fonds euros/ETF) + 3 key financial decisions.

"stocks": How to invest the ${fmt(saleProceeds)} from house sale: % safe bonds/fonds euros, % ETF PEA, % Livret A, % cash. Monthly income generated at 3-4% return. Specific ETFs recommended. Platforms (Boursorama, Fortuneo).

"realEstate": House sale: ${fmt(profile.realEstateValue||0)} − mortgage ${fmt(profile.mortgageRemaining||0)} − agent fees 3% = net proceeds. Retirement home ${profile.secondPropertyCity||'Bretagne'}: free housing saves ${fmt((profile.monthlyRetirementExpenses||0)*0.3)}/month vs renting. Property tax estimate.

"govRetirement": THE MOST IMPORTANT SECTION. The user wants a clear comparison of ALL options to maximize their French state pension. Current status: ${trimestresValides} quarters validated, ${trimestresRequis} required for full pension. Stopping work at ${profile.targetRetirementAge} means earning ${yearsToRetirement * 4} more quarters by then = ${trimestresValides + yearsToRetirement * 4} total quarters at retirement, leaving ${Math.max(0, trimestresRequis - (trimestresValides + yearsToRetirement * 4))} quarters missing.

Build a COMPARISON TABLE of these 4 scenarios with columns: Scenario | Quarters at pension claim | Missing quarters | Pension reduction % | Monthly pension € | Total cost of strategy | Capital impact | Verdict:

SCENARIO A — "Do nothing: retire at ${profile.targetRetirementAge}, claim pension at ${profile.govRetirementAge}":
- Quarters at claim: ${trimestresValides + yearsToRetirement * 4}
- Missing: ${Math.max(0, trimestresRequis - (trimestresValides + yearsToRetirement * 4))} → decote ${(Math.max(0, trimestresRequis - (trimestresValides + yearsToRetirement * 4)) * 1.25).toFixed(1)}% on base pension
- Monthly pension = stated ${fmt(profile.govMonthlyPension||0)} × (1 - decote%) — calculate the exact reduced amount
- Cost: €0 but permanent pension reduction for life

SCENARIO B — "Buy back quarters (rachat Art.L351-14-1) — max 12 quarters":
- How many quarters can realistically be bought back (years of higher education + incomplete years)
- Cost per quarter at age ${ageActuel}: approx €3,500–€5,000 depending on salary
- Tax benefit: 100% deductible from taxable income → real net cost after tax savings
- Quarters after buyback: previous total + bought quarters → remaining gap
- Monthly pension after buyback
- VERDICT: cost vs lifetime pension gain (breakeven age calculation)

SCENARIO C — "CVV (Cotisation Volontaire Vieillesse) during bridge period ${profile.targetRetirementAge}→${profile.govRetirementAge}":
- Validates up to 4 quarters/year while not working
- Cost: approx €1,200–€2,000/year for ${gapYears} years = total cost
- Total quarters earned: ${gapYears * 4} additional quarters
- Monthly pension improvement
- VERDICT: most cost-effective option?

SCENARIO D — "Wait until age 67 (taux plein automatique)":
- At 67, full pension is GUARANTEED regardless of quarters — zero decote no matter what
- Monthly pension: ${fmt(profile.govMonthlyPension||0)}/month guaranteed (full rate)
- BUT: 2 extra years without pension vs claiming at ${profile.govRetirementAge} = extra capital needed: ${fmt((profile.monthlyRetirementExpenses||0) * 24)} for 2 more years
- Agirc-Arrco: no solidarity coefficient malus at 67
- VERDICT: is waiting worth it financially?

After the table: RECOMMENDATION — which scenario or combination gives the best result for this specific profile. Calculate the lifetime total pension (pension × 12 × 20 years) for each scenario to show which one maximizes total income. Include Agirc-Arrco solidarity coefficient impact (-10% if claim before 63, for 3 years).

"realism": 3 scenarios (optimistic/realistic/pessimistic) with actual monthly budget figures. 3 main risks (health, real estate market, inheritance delay) with solutions. Feasibility score /10.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    // Strip markdown fences if present
    let cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    // If JSON is truncated (stop_reason = max_tokens), try to close it gracefully
    if (response.stop_reason === 'max_tokens') {
      console.warn('⚠️ Response truncated at max_tokens — attempting repair');
      // Close any open string, then close the JSON object
      cleaned = cleaned.replace(/,\s*"[^"]*$/, ''); // remove last incomplete key
      cleaned = cleaned.replace(/:\s*"[^"]*$/, ': "<truncated>"'); // close open value
      if (!cleaned.endsWith('}')) cleaned += '}';
    }

    const parsed = JSON.parse(cleaned);

    return {
      realism:       parsed.realism       || '',
      firePlan:      parsed.firePlan      || '',
      stocks:        parsed.stocks        || '',
      realEstate:    parsed.realEstate    || '',
      govRetirement: parsed.govRetirement || '',
      summary:       parsed.summary       || '',
      generatedAt:   new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('AI analysis failed:', err?.message || err);
    return errorAnalysis(err?.message || String(err));
  }
}

function errorAnalysis(errMsg: string): AIAnalysis {
  const msg = `<p style="color:#e74c3c;padding:12px;"><strong>Analysis error:</strong> ${errMsg}</p>`;
  return {
    realism: msg, firePlan: msg, stocks: msg,
    realEstate: msg, govRetirement: msg,
    summary: `<p style="color:#e74c3c;"><strong>Error:</strong> ${errMsg}<br>Check server logs for details.</p>`,
    generatedAt: new Date().toISOString(),
  };
}

function fallbackAnalysis(calc: FireResult): AIAnalysis {
  const msg = `<p style="color:var(--muted);padding:12px;">
    <strong>AI unavailable.</strong> Check <code>ANTHROPIC_API_KEY</code> in <code>.env</code>.
  </p>`;
  return {
    realism: msg, firePlan: msg, stocks: msg,
    realEstate: msg, govRetirement: msg,
    summary: `<p>API key not configured — add it to <code>.env</code> and click Analyze with AI.</p>`,
    generatedAt: new Date().toISOString(),
  };
}
