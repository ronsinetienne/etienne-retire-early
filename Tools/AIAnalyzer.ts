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

"govRetirement": MOST IMPORTANT SECTION. Keep it SHORT and actionable. A) Status: ${trimestresValides}/${trimestresRequis} quarters, ${trimestresManquants} missing, penalty ${(trimestresManquants*1.25).toFixed(1)}%, estimated pension with vs without penalty. B) 3 solutions: (1) Buy back quarters Art.L351-14-1: cost/quarter at age ${ageActuel}, tax deductible, CNAV procedure; (2) Voluntary contribution CVV form S3705: annual cost, quarters earned over ${gapYears} years; (3) Micro-entrepreneur: min €1,500/yr CA to validate quarters. C) Agirc-Arrco solidarity coefficient -10%. D) Short action table: Action|Cost|Quarters|Priority. E) Pension simulation: without vs with optimization.

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
