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
  return `€${Math.round(n).toLocaleString('en-US')}`;
}

export async function analyzeProfile(profile: UserProfile, calc: FireResult): Promise<AIAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackAnalysis(calc);
  }

  const client = new Anthropic({ apiKey });

  const gapYears = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
  const bridgeCost = profile.monthlyRetirementExpenses * 12 * gapYears;
  const trimestresManquants = Math.max(0, profile.targetContributionYears * 4 - profile.contributionYears * 4);

  const prompt = `Tu es un conseiller financier expert en retraite anticipée (FIRE) et en droit de la retraite française.
Tu dois analyser en profondeur le profil de cet utilisateur et lui fournir des conseils TRÈS détaillés, personnalisés, et actionnables.

IMPORTANT: L'utilisateur a écrit ce texte dans la zone de notes — lis-le attentivement et base toute ton analyse dessus:
"""
${profile.notes || '(aucune note fournie)'}
"""

## Profil financier complet
- Âge actuel: ${profile.age} ans
- Revenu mensuel net: ${fmt(profile.monthlyIncome)}
- Dépenses mensuelles actuelles: ${fmt(profile.monthlyExpenses)}
- Épargne disponible (cash/livrets): ${fmt(profile.currentSavings)}
- Portefeuille boursier: ${fmt(profile.stockPortfolio)}
- Valeur immobilier: ${fmt(profile.realEstateValue)}
- Crédit immobilier restant: ${fmt(profile.mortgageRemaining)}
- Revenu locatif mensuel: ${fmt(profile.monthlyRentalIncome)}

## Objectifs retraite
- Âge de retraite souhaité (FIRE): ${profile.targetRetirementAge} ans
- Âge légal de retraite (gouvernement): ${profile.govRetirementAge} ans
- Écart à couvrir: ${gapYears} ans entre retraite anticipée et retraite légale
- Budget mensuel souhaité en retraite: ${fmt(profile.monthlyRetirementExpenses)}
- Coût total de la période "pont": ${fmt(bridgeCost)} (sans rendement)
- Pension d'État estimée: ${fmt(profile.govMonthlyPension)}/mois
- Trimestres validés: ${profile.contributionYears * 4} / ${profile.targetContributionYears * 4} requis
- Trimestres manquants: ${trimestresManquants}

## Calculs FIRE actuels
- Nombre FIRE (sans pension): ${fmt(calc.fireNumber)}
- Nombre FIRE (avec pension): ${fmt(calc.fireNumberWithPension)}
- Actifs investissables actuels: ${fmt(calc.totalAssets)}
- Patrimoine net total: ${fmt(calc.totalNetWorth)}
- Progression vers FIRE: ${calc.progressPercent.toFixed(1)}%
- Années estimées avant FIRE: ${calc.yearsToFire} (âge ${calc.fireAge})
- Taux d'épargne: ${calc.savingsRate.toFixed(1)}%
- Manque mensuel pour atteindre l'objectif: ${fmt(calc.monthlyShortfall)}

---

Fournis une réponse JSON avec exactement ces 6 clés. Chaque valeur est un LONG snippet HTML riche (utilise <h4>, <p>, <ul>, <li>, <strong>, <table>, <tr>, <td>, <th>).
Chaque section doit faire au minimum 500 mots. Sois TRÈS spécifique, chiffré, et actionnable. Utilise des tableaux HTML partout où c'est pertinent.

=== 1. "realism" ===
Analyse honnête et détaillée de faisabilité. Score /10 justifié. Ce qui est réaliste, ce qui ne l'est pas, les 3 plus grands obstacles, et comment les surmonter concrètement. Prends en compte les notes de l'utilisateur.

=== 2. "firePlan" ===
SIMULATION FINANCIÈRE DÉTAILLÉE ANNÉE PAR ANNÉE.

Construis obligatoirement un tableau HTML complet avec ces colonnes:
Année | Âge | Revenus | Dépenses | Épargne annuelle | Investissement cumulé | Patrimoine total | Étape clé

Couvre TOUTES les années depuis aujourd'hui jusqu'à la retraite (âge ${profile.targetRetirementAge}) puis la période pont jusqu'à ${profile.govRetirementAge} ans.
Pour chaque ligne, calcule:
- Les revenus attendus (salaire, locatif, dividendes progressifs)
- Les dépenses projetées (inflation ${(profile.inflation*100).toFixed(1)}%/an)
- L'épargne annuelle (revenus - dépenses)
- L'investissement cumulé avec rendement ${(profile.estimatedReturn*100).toFixed(1)}%/an
- Le patrimoine total (investissements + immobilier net)
- L'étape clé: "CoastFIRE atteint", "FIRE atteint", "Retraite légale", "Pont: décaissement", etc.

Après le tableau, ajoute:
- Plan d'investissement mensuel précis (combien mettre où: PEA, CTO, livret A, PER, immo)
- Les 5 décisions financières les plus importantes à prendre cette année
- Basé sur les notes de l'utilisateur: réponse personnalisée sur ses préoccupations spécifiques

=== 3. "stocks" ===
Allocation boursière précise avec ETFs spécifiques (IWDA, MSCI World, S&P500, obligations, etc.), pourcentages, et rationale détaillé selon l'âge et le profil. Inclure les plateformes recommandées (PEA, CTO, etc.).

=== 4. "realEstate" ===
Stratégie immobilière personnalisée: achat/location/investissement locatif/SCPI/REITs. Calculs de rendement, impact sur le nombre FIRE, conseils fiscaux français (SCI, LMNP, etc.).

=== 5. "govRetirement" ===
SECTION LA PLUS IMPORTANTE — Analyse ULTRA-DÉTAILLÉE du système de retraite français pour quelqu'un qui veut partir à ${profile.targetRetirementAge} ans alors que l'âge légal est ${profile.govRetirementAge} ans:

A) SITUATION ACTUELLE:
- Calcul précis des trimestres validés vs requis (${profile.contributionYears * 4} / ${profile.targetContributionYears * 4})
- Impact d'un départ anticipé sur la pension (décote, nombre de trimestres manquants)
- Estimation de la pension avec et sans décote

B) PÉRIODE PONT (${profile.targetRetirementAge} → ${profile.govRetirementAge} ans = ${gapYears} ans):
- Comment vivre financièrement pendant ces ${gapYears} ans sans revenus du travail
- Calcul précis du capital nécessaire pour couvrir cette période: ${fmt(bridgeCost)} minimum
- Stratégie de décaissement optimale (ordre des comptes à utiliser: PER, PEA, CTO, livrets)
- Droits aux allocations chômage éventuels

C) CONTINUER À ACQUÉRIR DES DROITS RETRAITE APRÈS L'ARRÊT DE TRAVAIL:
- **Rachat de trimestres (Art. L351-14-1 CSS)**: explique en détail comment racheter jusqu'à 12 trimestres (années d'études supérieures, années incomplètes). Donne les coûts indicatifs selon l'âge (coût d'un trimestre racheté à ${profile.age} ans vs plus tard), la déductibilité fiscale (déductible des revenus imposables), et la procédure (demande CNAV/MSA).
- **Cotisation volontaire à l'assurance vieillesse (CVV)**: comment cotiser volontairement à la Sécurité Sociale après l'arrêt du travail pour continuer à valider des trimestres. Montants, conditions, plafonds.
- **Retraite progressive**: possibilité de travailler à temps partiel tout en touchant une partie de sa retraite à partir de 60 ans (si conditions remplies).
- **Statut de micro-entrepreneur ou consultant**: créer une activité marginale (même très limitée) pour continuer à valider des trimestres tout en étant pseudo-retraité.
- **Points Agirc-Arrco (retraite complémentaire)**: comment fonctionne la capitalisation des points, impact de l'arrêt prématuré sur les points accumulés, coefficient de solidarité (malus de 10% si départ avant 63 ans depuis 2019).
- **PER (Plan Épargne Retraite)**: utilisation du PER comme outil de bridge, déductibilité des versements, conditions de sortie anticipée.

D) STRATÉGIE OPTIMALE RECOMMANDÉE:
- Plan chiffré et priorisé: dans quel ordre faire quoi (rachat trimestres, CVV, PER, etc.)
- Estimation du coût total des rachats de trimestres pour ${trimestresManquants} trimestres manquants
- Simulation de la pension finale avec et sans ces optimisations
- Points de vigilance légaux et administratifs

=== 6. "summary" ===
Commence par répondre directement et personnellement aux notes de l'utilisateur (cite ce qu'il a écrit, réponds précisément à chaque question posée).
Puis fournis:
- Un résumé de la situation financière actuelle en 2-3 phrases chiffrées
- La réponse à la question centrale: est-ce que partir à ${profile.targetRetirementAge} ans est faisable avec ce profil?
- Les 3 risques principaux identifiés et comment les mitiger
- Un plan d'action en 5 étapes concrètes à faire dans les 6 prochains mois (avec montants précis)
- Une projection encourageante: si tout va bien, à quoi ressemble la vie à ${profile.targetRetirementAge} ans?
Format: HTML avec <h4>, <p>, <ul><li>, <strong>. Minimum 600 mots. Ton: expert financier qui parle à un ami.

LANGUE: Réponds en français dans toutes les sections sauf si l'utilisateur a écrit ses notes en anglais.
IMPORTANT: Réponds UNIQUEMENT avec le JSON valide. Pas de markdown, pas de \`\`\`json.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';

    // Strip markdown fences if model wraps anyway
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);

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
    <strong>Analyse IA indisponible.</strong> Ajoutez votre <code>ANTHROPIC_API_KEY</code> dans le fichier <code>.env</code> pour activer les recommandations personnalisées.<br>
    Les projections mathématiques sont déjà actives et calculées localement.
  </p>`;
  return {
    realism: msg,
    firePlan: msg,
    stocks: msg,
    realEstate: msg,
    govRetirement: msg,
    summary: `<p>Calculs actuels : Nombre FIRE ${Math.round(calc.fireNumber).toLocaleString('fr-FR')} € —
      environ ${calc.yearsToFire} ans avant l'indépendance financière (âge ${calc.fireAge}).
      Taux d'épargne actuel : ${calc.savingsRate.toFixed(1)} %.</p>
      <p class="ai-unavailable"><strong>Pour une analyse complète et personnalisée incluant le système de retraite français,
      le rachat de trimestres, et la stratégie de période pont,</strong> configurez votre clé API Anthropic dans le fichier <code>.env</code>.</p>`,
    generatedAt: new Date().toISOString(),
  };
}
