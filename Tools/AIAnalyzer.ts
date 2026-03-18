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
  const apiKey = process.env.ANTHROPIC_API_KEY;
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

Fournis une réponse JSON avec exactement ces 6 clés. Chaque valeur est du HTML riche (h4, p, ul, li, strong, table, tr, td, th).
RÉPONDS EN FRANÇAIS. Chaque section doit être CONCRÈTE, CHIFFRÉE et ACTIONNELLE.
IMPORTANT: Réponds UNIQUEMENT avec le JSON valide, sans markdown, sans \`\`\`json.

=== 1. "summary" ===
RÉPONSE DIRECTE à la question principale de l'utilisateur.
Commence par: "Voici votre situation en chiffres:"
Puis donne:
- Le capital net disponible à ${profile.targetRetirementAge} ans: vente maison + cash + bourse = TOTAL
- Le budget mensuel possible de ${profile.targetRetirementAge} à ${profile.govRetirementAge} ans si capital bien géré (3 scénarios: conservateur, modéré, optimiste)
- Ce qui se passe à ${profile.govRetirementAge} ans: héritage + pension d'État → nouvelle situation
- Une phrase honnête sur la faisabilité globale
- Les 2 actions les plus urgentes à faire dans les 6 prochains mois

=== 2. "firePlan" ===
SIMULATION ANNÉE PAR ANNÉE — PAS DE FIRE, mais un plan de VIE concret.

Construit un tableau HTML avec ces colonnes:
Année | Âge | Événement clé | Capital début d'année | Revenus (détail) | Dépenses | Capital fin d'année | Commentaire

Couvre:
- Les ${yearsToRetirement} années AVANT la retraite (jusqu'à ${profile.targetRetirementAge} ans) — accumuler du capital
- Les ${gapYears} années PONT (${profile.targetRetirementAge} → ${profile.govRetirementAge} ans) — décaisser sur la vente de la maison
- Les 5 premières années APRÈS ${profile.govRetirementAge} ans — avec pension + héritage

Pour la période pont, montre:
- Comment le capital de la vente (${fmt(saleProceeds)}) diminue chaque année
- Si placé à 3-4% en attendant, combien ça rapporte chaque mois
- L'impact de l'héritage de ${fmt(profile.inheritanceAmount || 0)} à ${profile.inheritanceAge || 65} ans

Après le tableau:
- Plan d'investissement du capital de la vente: où placer les ${fmt(saleProceeds)} (livret A, PEA, PER, fonds euros, ETF)
- Les 5 décisions financières prioritaires à prendre dès maintenant

=== 3. "stocks" ===
Comment placer intelligemment le produit de la vente de la maison (${fmt(saleProceeds)}) pour maximiser le revenu passif pendant la période pont.
- Allocation recommandée: % en fonds euros sécurisé, % en ETF, % en livret, % en PEA
- Quel montant garder en cash liquide pour les 2 premières années
- Montant mensuel généré par les investissements (3% à 5% de rendement)
- ETFs spécifiques recommandés pour quelqu'un à ${ageActuel} ans qui part à ${profile.targetRetirementAge} ans
- Plateforme: PEA chez qui (Boursorama, Fortuneo), CTO

=== 4. "realEstate" ===
Stratégie immobilière complète:
A) La vente de la maison à ${profile.targetRetirementAge} ans:
- Prix de vente: ${fmt(profile.realEstateValue || 0)}
- Crédit remboursé: ${fmt(profile.mortgageRemaining || 0)}
- Frais d'agence (~3-4%), notaire (si résidence principale: exonération plus-value)
- Net réel après tous frais: estimation précise

B) La maison de retraite${profile.secondPropertyCity ? ` (${profile.secondPropertyCity})` : ' (Bretagne)'}:
- Avantage: logement GRATUIT en retraite → économie de ${fmt((profile.monthlyRetirementExpenses||0) * 0.3)}/mois vs loyer
- Frais d'entretien, taxe foncière estimés

C) Ce que faire avec le produit de vente:
- Ne pas tout dépenser immédiatement
- Stratégie de décaissement sur ${gapYears} ans

=== 5. "govRetirement" ===
SECTION CRITIQUE — Retraite gouvernementale française: comment partir à ${profile.targetRetirementAge} ans ET conserver une retraite maximale à ${profile.govRetirementAge} ans.

A) DIAGNOSTIC ACTUEL:
- ${trimestresValides} trimestres validés sur ${trimestresRequis} requis pour taux plein
- Si arrêt du travail à ${profile.targetRetirementAge} ans: ${trimestresManquants} trimestres manquants
- Impact: décote de ${(trimestresManquants * 1.25).toFixed(1)}% sur la retraite de base (1,25% par trimestre manquant)
- Estimation pension avec décote vs sans décote (chiffre en euros)

B) LES 3 SOLUTIONS POUR COMBLER CES ${trimestresManquants} TRIMESTRES:

**Solution 1 — Rachat de trimestres (Article L351-14-1 CSS)**:
- Peut racheter jusqu'à 12 trimestres: années d'études supérieures + années incomplètes
- Coût indicatif à ${ageActuel} ans: entre 3 000€ et 5 000€ par trimestre (selon le salaire)
- Coût total estimé pour maximiser les rachats disponibles
- AVANTAGE FISCAL: 100% déductible de l'impôt sur le revenu → économie réelle après impôt
- Procédure: faire la demande à la CNAV (www.lassuranceretraite.fr) AVANT de partir
- IMPORTANT: à faire AVANT l'arrêt de travail car le coût augmente avec l'âge

**Solution 2 — Cotisation volontaire à l'Assurance Vieillesse (CVV)**:
- Permet de cotiser à la Sécu APRÈS l'arrêt du travail pour valider des trimestres
- Condition: avoir cessé toute activité salariée
- Montant de cotisation: entre 1 200€ et 7 000€ par an selon le niveau choisi
- Valide jusqu'à 4 trimestres par an
- Comment s'inscrire: formulaire S3705 auprès de la CPAM
- Coût pour ${gapYears} ans × 4 trimestres = ${gapYears * 4} trimestres supplémentaires

**Solution 3 — Activité minimale (micro-entrepreneur ou profession libérale)**:
- Créer une micro-entreprise même à revenus très faibles (consultation, formation, etc.)
- Pour valider 4 trimestres/an: CA minimum d'environ 1 500€/an (moins de 150€/mois)
- Continue à cotiser Agirc-Arrco complémentaire
- Avantage: flexibilité totale, rythme choisi

C) AGIRC-ARRCO (retraite complémentaire):
- Le coefficient de solidarité: malus de 10% si départ avant 63 ans depuis 2019 (pendant 3 ans)
- Stratégie pour éviter ou minimiser ce malus
- Impact en euros sur la pension complémentaire

D) PER (Plan Épargne Retraite):
- Ouvrir un PER MAINTENANT et y verser: déductible des revenus imposables
- Permet une sortie en capital à ${profile.govRetirementAge} ans en complément de la pension
- Montants et fiscalité de sortie

E) PLAN D'ACTION CHIFFRÉ ET PRIORISÉ:
Tableau: Action | Coût | Gain trimestres | À faire quand | Priorité
- Rachat de X trimestres avant ${profile.targetRetirementAge} ans
- CVV pendant la période pont: ${gapYears} ans
- Micro-entrepreneur minimal: validation de trimestres
- Total coût de la stratégie de préservation des droits

F) SIMULATION FINALE:
Tableau comparatif: Pension sans optimisation | Pension avec optimisation complète
→ Gain mensuel à vie et gain sur 20 ans de retraite

=== 6. "realism" ===
Analyse honnête de faisabilité en 3 scénarios:

**Scénario A (optimiste)**: Tout se passe bien
- Budget mensuel disponible: X€ pendant la période pont
- Situation à ${profile.govRetirementAge} ans avec héritage + pension: X€/mois confortablement

**Scénario B (réaliste)**: Quelques imprévus
- Vente moins bonne, inflation, imprévus santé
- Budget mensuel: Y€ — les ajustements nécessaires

**Scénario C (pessimiste)**: Problèmes multiples
- Les risques réels, les garde-fous à mettre en place

Risques principaux:
1. Risque de longévité (vivre jusqu'à 90 ans: budget sur 30 ans)
2. Inflation sur les dépenses
3. Problème de santé entre 60 et 65 ans (pas de mutuelle employeur)
4. Chute du marché immobilier avant la vente
5. Héritage pas au rendez-vous ou retardé

Pour chaque risque: probabilité, impact, solution concrète.

Score de faisabilité global: X/10 avec justification détaillée.`;

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
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
  } catch (err) {
    console.error('AI analysis failed:', err);
    return fallbackAnalysis(calc);
  }
}

function fallbackAnalysis(calc: FireResult): AIAnalysis {
  const msg = `<p style="color:var(--muted);padding:12px;">
    <strong>Analyse IA indisponible.</strong> Vérifiez votre <code>ANTHROPIC_API_KEY</code> dans le fichier <code>.env</code>.
  </p>`;
  return {
    realism: msg, firePlan: msg, stocks: msg,
    realEstate: msg, govRetirement: msg,
    summary: `<p>Clé API Anthropic non configurée — cliquez sur Analyze with AI après avoir ajouté la clé dans <code>.env</code>.</p>`,
    generatedAt: new Date().toISOString(),
  };
}
