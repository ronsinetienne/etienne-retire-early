export interface UserProfile {
  age: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  stockPortfolio: number;
  // Primary property to sell at retirement
  realEstateValue: number;
  mortgageRemaining: number;
  monthlyRentalIncome: number;
  // Second property (retirement home — no mortgage)
  secondPropertyValue: number;
  secondPropertyCity: string;
  // Gift to children from house sale
  giftToChildren: number;
  // Inheritance
  inheritanceAmount: number;
  inheritanceAge: number;         // age at which inheritance is received
  targetRetirementAge: number;
  monthlyRetirementExpenses: number;
  estimatedReturn: number; // e.g. 0.07 for 7%
  inflation: number;       // e.g. 0.02 for 2%
  notes: string;
  // Government retirement
  govRetirementAge: number;       // legal retirement age (e.g. 64 in France)
  govMonthlyPension: number;      // rough estimate (overridden by calculated value if SAM provided)
  contributionYears: number;      // years of contributions so far
  targetContributionYears: number;// years required for full pension (e.g. 43 in France)
  // Precise pension inputs (French system)
  birthYear: number;              // to determine exact trimestres requis
  salaireMoyen: number;           // SAM: average annual salary over best 25 years (gross)
  agircPoints: number;            // Agirc-Arrco points from relevé de carrière
  agircPointsPerYear: number;     // estimated new points earned per year (if still working)
}

export interface FireResult {
  fireNumber: number;
  leanFireNumber: number;
  fatFireNumber: number;
  coastFireNumber: number;
  totalAssets: number;
  totalNetWorth: number;
  progressPercent: number;
  yearsToFire: number;
  fireAge: number;
  savingsRate: number;
  annualSavings: number;
  monthlySurplus: number;
  monthlyShortfall: number;
  realReturnRate: number;
  projectionData: Array<{ year: number; value: number; fireNumber: number }>;
  milestones: Array<{ label: string; year: number; value: number; reached: boolean }>;
  // Government retirement
  govGap: number;
  govPensionAnnual: number;
  fireNumberWithPension: number;
  contributionProgress: number;
  yearsToFullPension: number;
  // Precise French pension breakdown
  trimestresRequis: number;
  quartersAtRetirement: number;
  missingQuarters: number;
  decoteRate: number;
  pensionBaseMonthly: number;
  pensionAgircMonthly: number;
  calculatedPension: number;
  agircPointsAtRetirement: number;
}

export function calculate(profile: UserProfile): FireResult {
  const r = Math.max(0.001, profile.estimatedReturn - profile.inflation); // real return
  const annualRetirementExpenses = profile.monthlyRetirementExpenses * 12;
  const annualRentalIncome = profile.monthlyRentalIncome * 12;

  // FIRE Number: using 4% SWR, reduced by passive income
  const netAnnualExpenses = Math.max(0, annualRetirementExpenses - annualRentalIncome);
  const fireNumber = netAnnualExpenses * 25;
  const leanFireNumber = (annualRetirementExpenses * 0.7 - annualRentalIncome) * 25;
  const fatFireNumber = (annualRetirementExpenses * 1.5 - annualRentalIncome) * 25;

  const totalAssets = profile.currentSavings + profile.stockPortfolio;
  const netRealEstate = profile.realEstateValue - profile.mortgageRemaining;
  const totalNetWorth = totalAssets + netRealEstate + (profile.secondPropertyValue || 0);

  const monthlySurplus = profile.monthlyIncome - profile.monthlyExpenses + profile.monthlyRentalIncome;
  const annualSavings = monthlySurplus * 12;
  const savingsRate = profile.monthlyIncome > 0
    ? ((profile.monthlyIncome - profile.monthlyExpenses) / profile.monthlyIncome) * 100
    : 0;

  const progressPercent = fireNumber > 0 ? Math.min(100, (totalAssets / fireNumber) * 100) : 0;

  // Years to FIRE (annual compounding simulation)
  let yearsToFire = 0;
  let value = totalAssets;
  while (value < fireNumber && yearsToFire < 100) {
    value = value * (1 + r) + annualSavings;
    yearsToFire++;
  }
  const fireAge = profile.age + yearsToFire;

  // Coast FIRE: how much you need NOW to coast to FIRE without more contributions
  const yearsToTarget = Math.max(0, profile.targetRetirementAge - profile.age);
  const coastFireNumber = fireNumber > 0 && yearsToTarget > 0
    ? fireNumber / Math.pow(1 + r, yearsToTarget)
    : fireNumber;

  // Monthly shortfall to hit target retirement age
  const targetYears = Math.max(1, profile.targetRetirementAge - profile.age);
  let requiredAnnualSavings = 0;
  if (totalAssets < fireNumber) {
    // FV = PV*(1+r)^n + PMT*((1+r)^n-1)/r => solve for PMT
    const fvFactor = Math.pow(1 + r, targetYears);
    const annuityFactor = (fvFactor - 1) / r;
    requiredAnnualSavings = (fireNumber - totalAssets * fvFactor) / annuityFactor;
  }
  const monthlyShortfall = Math.max(0, requiredAnnualSavings / 12 - monthlySurplus);

  // Projection
  const projectionData: Array<{ year: number; value: number; fireNumber: number }> = [];
  let pv = totalAssets;
  const currentYear = new Date().getFullYear();
  const projectionYears = Math.min(Math.max(yearsToFire + 5, 30), 60);
  for (let y = 0; y <= projectionYears; y++) {
    projectionData.push({ year: currentYear + y, value: Math.round(pv), fireNumber: Math.round(fireNumber) });
    pv = pv * (1 + r) + annualSavings;
  }

  // Milestones
  const milestones = [
    { label: '25% of FIRE', value: fireNumber * 0.25, year: 0, reached: false },
    { label: 'Coast FIRE',  value: coastFireNumber,    year: 0, reached: false },
    { label: '50% of FIRE', value: fireNumber * 0.5,  year: 0, reached: false },
    { label: 'Lean FIRE',   value: leanFireNumber,     year: 0, reached: false },
    { label: 'FIRE!',       value: fireNumber,         year: 0, reached: false },
    { label: 'Fat FIRE',    value: fatFireNumber,      year: 0, reached: false },
  ];
  for (const m of milestones) {
    m.reached = totalAssets >= m.value;
    let v2 = totalAssets;
    let y = 0;
    while (v2 < m.value && y < 100) { v2 = v2 * (1 + r) + annualSavings; y++; }
    m.year = currentYear + y;
  }

  // ── French pension precise calculation ────────────────────────────────────────
  const yearsToRetirement = Math.max(0, profile.targetRetirementAge - profile.age);
  const quartersValidated  = (profile.contributionYears || 0) * 4;
  const quartersAtRetirement = quartersValidated + yearsToRetirement * 4;

  // Trimestres requis based on birth year (French law 2023 reform)
  const birthYear = profile.birthYear || (new Date().getFullYear() - profile.age);
  let trimestresRequis = 172; // default for born 1973+
  if (birthYear <= 1957)      trimestresRequis = 160;
  else if (birthYear <= 1958) trimestresRequis = 161;
  else if (birthYear <= 1959) trimestresRequis = 162;
  else if (birthYear <= 1960) trimestresRequis = 163;
  else if (birthYear <= 1961) trimestresRequis = 165;
  else if (birthYear <= 1962) trimestresRequis = 166;
  else if (birthYear <= 1963) trimestresRequis = 167;
  else if (birthYear <= 1964) trimestresRequis = 168;
  else if (birthYear <= 1965) trimestresRequis = 169;
  else if (birthYear <= 1966) trimestresRequis = 170;
  else if (birthYear <= 1972) trimestresRequis = 171;

  // Retraite de base (CNAV): SAM × 50% × min(quartersAtRetirement, trimestresRequis) / trimestresRequis
  const SAM = profile.salaireMoyen || 0;
  const missingQuarters = Math.max(0, trimestresRequis - quartersAtRetirement);
  const decoteRate = Math.min(0.25, missingQuarters * 0.0125); // max 25% decote
  const tauxBase = 0.50 * (1 - decoteRate);
  const pensionBaseMonthly = SAM > 0
    ? Math.round((SAM / 12) * tauxBase * Math.min(quartersAtRetirement, trimestresRequis) / trimestresRequis)
    : 0;

  // Retraite complémentaire Agirc-Arrco
  const VALEUR_POINT = 1.4801; // €/point (2024 value)
  const agircPointsAtRetirement = (profile.agircPoints || 0) + (profile.agircPointsPerYear || 0) * yearsToRetirement;
  const pensionAgircMonthly = Math.round((agircPointsAtRetirement * VALEUR_POINT) / 12);

  // Total calculated pension (use manual estimate if SAM not provided)
  const calculatedPension = SAM > 0
    ? pensionBaseMonthly + pensionAgircMonthly
    : profile.govMonthlyPension;

  // Government retirement calculations
  const govPensionAnnual = calculatedPension * 12;
  const govGap = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
  // FIRE number accounting for future pension (pension reduces expenses in retirement)
  const netExpWithPension = Math.max(0, annualRetirementExpenses - annualRentalIncome - govPensionAnnual);
  const fireNumberWithPension = netExpWithPension * 25;
  const contributionProgress = profile.targetContributionYears > 0
    ? Math.min(100, (profile.contributionYears / profile.targetContributionYears) * 100)
    : 0;
  const yearsToFullPension = Math.max(0, profile.targetContributionYears - profile.contributionYears);

  return {
    fireNumber,
    leanFireNumber,
    fatFireNumber,
    coastFireNumber,
    totalAssets,
    totalNetWorth,
    progressPercent,
    yearsToFire,
    fireAge,
    savingsRate,
    annualSavings,
    monthlySurplus,
    monthlyShortfall,
    realReturnRate: r,
    projectionData,
    milestones,
    govGap,
    govPensionAnnual,
    fireNumberWithPension,
    contributionProgress,
    yearsToFullPension,
    trimestresRequis,
    quartersAtRetirement,
    missingQuarters,
    decoteRate,
    pensionBaseMonthly,
    pensionAgircMonthly,
    calculatedPension,
    agircPointsAtRetirement,
  };
}
