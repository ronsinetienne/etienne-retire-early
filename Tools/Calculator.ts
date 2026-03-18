export interface UserProfile {
  age: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  currentSavings: number;
  stockPortfolio: number;
  realEstateValue: number;
  mortgageRemaining: number;
  monthlyRentalIncome: number;
  targetRetirementAge: number;
  monthlyRetirementExpenses: number;
  estimatedReturn: number; // e.g. 0.07 for 7%
  inflation: number;       // e.g. 0.02 for 2%
  notes: string;
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
  const totalNetWorth = totalAssets + netRealEstate;

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
  };
}
