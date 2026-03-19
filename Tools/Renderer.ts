import type { UserProfile, FireResult } from './Calculator';
import type { AIAnalysis } from './AIAnalyzer';

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

function pct(n: number): string {
  return n.toFixed(1) + '%';
}

export function renderDashboard(
  profile: UserProfile,
  calc: FireResult,
  analysis: AIAnalysis | null,
): string {
  const currency = '€';
  const progressColor = calc.progressPercent >= 75 ? '#27ae60' : calc.progressPercent >= 40 ? '#f39c12' : '#e74c3c';
  const feasibilityColor = calc.fireAge <= profile.targetRetirementAge ? '#27ae60' : calc.fireAge <= profile.targetRetirementAge + 5 ? '#f39c12' : '#e74c3c';

  const projJson = JSON.stringify(calc.projectionData);
  const milestoneJson = JSON.stringify(calc.milestones);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Retire Early Dashboard</title>
<style>
  :root {
    --bg: #0d1117;
    --card: #161b22;
    --border: #30363d;
    --text: #c9d1d9;
    --muted: #8b949e;
    --fire: #f39c12;
    --green: #27ae60;
    --red: #e74c3c;
    --blue: #58a6ff;
    --purple: #bc8cff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.5; }
  a { color: var(--blue); text-decoration: none; }

  /* Layout */
  .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
  header { background: var(--card); border-bottom: 1px solid var(--border); padding: 16px 0; margin-bottom: 24px; }
  header .container { display: flex; align-items: center; justify-content: space-between; }
  header h1 { font-size: 20px; font-weight: 700; color: var(--fire); }
  header .sub { color: var(--muted); font-size: 13px; }
  #status-bar { padding: 8px 16px; border-radius: 6px; font-size: 13px; display: none; margin-bottom: 16px; }
  #status-bar.success { background: rgba(39,174,96,.15); border: 1px solid var(--green); color: var(--green); display: block; }
  #status-bar.error   { background: rgba(231,76,60,.15);  border: 1px solid var(--red);   color: var(--red);   display: block; }
  #status-bar.loading { background: rgba(88,166,255,.1);  border: 1px solid var(--blue);  color: var(--blue);  display: block; }

  /* Cards */
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 20px; }
  .card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); margin-bottom: 16px; }
  .big-number { font-size: 32px; font-weight: 700; color: var(--fire); }
  .metric { display: flex; flex-direction: column; gap: 2px; }
  .metric .label { font-size: 12px; color: var(--muted); }
  .metric .value { font-size: 18px; font-weight: 600; }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  @media(max-width: 800px) { .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; } }

  /* Form */
  .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-group.full { grid-column: 1 / -1; }
  label { font-size: 12px; color: var(--muted); font-weight: 500; }
  input[type=number], input[type=text], textarea, select {
    background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
    color: var(--text); padding: 8px 10px; font-size: 14px; width: 100%;
    transition: border-color .2s;
  }
  input:focus, textarea:focus, select:focus { outline: none; border-color: var(--fire); }
  textarea { resize: vertical; min-height: 70px; }
  .input-prefix { position: relative; }
  .input-prefix span { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 13px; pointer-events: none; }
  .input-prefix input { padding-left: 24px; }

  /* Buttons */
  .btn { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; transition: opacity .2s; }
  .btn:hover { opacity: .85; }
  .btn-primary { background: var(--fire); color: #000; }
  .btn-secondary { background: var(--border); color: var(--text); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }

  /* Progress Bar */
  .progress-bar-wrap { background: var(--border); border-radius: 99px; height: 14px; overflow: hidden; }
  .progress-bar-fill { height: 100%; border-radius: 99px; transition: width .6s ease; background: linear-gradient(90deg, var(--green), var(--fire)); }

  /* Tabs */
  .tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 20px; overflow-x: auto; }
  .tab-btn { padding: 10px 18px; border: none; border-bottom: 2px solid transparent; background: none; color: var(--muted); font-size: 14px; cursor: pointer; white-space: nowrap; transition: color .2s; }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--fire); border-bottom-color: var(--fire); font-weight: 600; }
  .tab-pane { display: none; }
  .tab-pane.active { display: block; }

  /* Milestones */
  .milestones { display: flex; flex-direction: column; gap: 10px; }
  .milestone { display: flex; align-items: center; gap: 12px; }
  .milestone-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .milestone-dot.reached { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .milestone-dot.pending { background: var(--border); }
  .milestone-label { flex: 1; font-size: 13px; }
  .milestone-year { color: var(--muted); font-size: 12px; }

  /* AI Content */
  .ai-section { color: var(--text); line-height: 1.7; }
  .ai-section h4 { color: var(--fire); margin: 12px 0 6px; }
  .ai-section ul { padding-left: 20px; }
  .ai-section li { margin-bottom: 4px; }
  .ai-section p { margin-bottom: 10px; }
  .ai-section strong { color: #fff; }
  .ai-unavailable { color: var(--muted); background: rgba(255,255,255,.03); border: 1px dashed var(--border); border-radius: 6px; padding: 16px; }
  .ai-unavailable code { background: var(--border); padding: 2px 6px; border-radius: 4px; font-size: 12px; }
  .ai-section table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
  .ai-section table th { background: rgba(255,255,255,.05); color: var(--fire); text-align: left; padding: 8px 10px; border: 1px solid var(--border); font-size: 12px; }
  .ai-section table td { padding: 7px 10px; border: 1px solid rgba(48,54,61,.7); vertical-align: top; }
  .ai-section table tr:hover td { background: rgba(255,255,255,.02); }

  /* Summary banner */
  .summary-banner { background: rgba(243,156,18,.08); border: 1px solid rgba(243,156,18,.3); border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  .summary-banner .ai-section { color: var(--text); }

  /* ETF table */
  .etf-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  .etf-table th { text-align: left; color: var(--muted); font-size: 12px; padding: 8px; border-bottom: 1px solid var(--border); }
  .etf-table td { padding: 8px; border-bottom: 1px solid rgba(48,54,61,.5); }
  .etf-table tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .badge-green { background: rgba(39,174,96,.2); color: var(--green); }
  .badge-blue  { background: rgba(88,166,255,.2); color: var(--blue); }
  .badge-orange{ background: rgba(243,156,18,.2); color: var(--fire); }

  /* Chart containers */
  #chart-projection { width: 100%; height: 320px; }
  #chart-allocation  { width: 100%; height: 280px; }
</style>
</head>
<body>

<header>
  <div class="container">
    <div>
      <h1>🔥 Retire Early Dashboard</h1>
      <div class="sub">FIRE — Financial Independence, Retire Early</div>
    </div>
    <div style="color:var(--muted);font-size:12px;">localhost:3743</div>
  </div>
</header>

<div class="container">
  <div id="status-bar"></div>

  <!-- ═══ PROFILE INPUT CARD ═══ -->
  <div class="card">
    <div class="card-title">My Profile & Goals</div>
    <form id="profile-form">
      <div class="form-grid">

        <div class="form-group">
          <label>Age</label>
          <input type="number" name="age" value="${profile.age}" min="18" max="80">
        </div>
        <div class="form-group">
          <label>Target Retirement Age</label>
          <input type="number" name="targetRetirementAge" value="${profile.targetRetirementAge}" min="30" max="80">
        </div>
        <div class="form-group">
          <label>Monthly Income (net) ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="monthlyIncome" value="${profile.monthlyIncome}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Monthly Expenses ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="monthlyExpenses" value="${profile.monthlyExpenses}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Current Savings (cash/bonds) ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="currentSavings" value="${profile.currentSavings}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Stock Portfolio ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="stockPortfolio" value="${profile.stockPortfolio}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Monthly Rental Income ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="monthlyRentalIncome" value="${profile.monthlyRentalIncome}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Monthly Retirement Budget ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="monthlyRetirementExpenses" value="${profile.monthlyRetirementExpenses}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Expected Annual Return % <span style="color:var(--muted);font-size:0.8rem;font-weight:400;">(pre-retirement, gross before tax)</span></label>
          <input type="number" name="estimatedReturn" value="${(profile.estimatedReturn * 100).toFixed(1)}" step="0.1" min="0" max="20">
        </div>
        <div class="form-group">
          <label>Tax on Investment Returns % <span style="color:var(--muted);font-size:0.8rem;font-weight:400;">(applied to reduce effective return)</span></label>
          <input type="number" name="stockReturnTax" value="${(((profile.stockReturnTax ?? 0.30)) * 100).toFixed(0)}" step="1" min="0" max="50">
          <div style="font-size:0.78rem;color:var(--muted);margin-top:4px;line-height:1.45;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:4px;border-left:2px solid var(--muted);">
            💡 <strong>French PFU (Flat Tax) = 30%</strong> (12.8% income tax + 17.2% social charges) on dividends &amp; capital gains in a CTO.
            <strong>PEA after 5 yrs = 17.2%</strong> (social charges only). <strong>Assurance-vie after 8 yrs ≈ 24.7%</strong>.
            Net return = ${(profile.estimatedReturn*100).toFixed(0)}% × (1 − ${Math.round((profile.stockReturnTax??0.30)*100)}%) = <strong>${((profile.estimatedReturn*(1-(profile.stockReturnTax??0.30)))*100).toFixed(1)}% net</strong> — used in all capital projections.
          </div>
        </div>
        <div class="form-group">
          <label>Bridge Period Return % <span style="color:var(--muted);font-size:0.8rem;font-weight:400;">(during drawdown)</span></label>
          <input type="number" name="bridgeReturn" value="${((profile.bridgeReturn ?? 0.03) * 100).toFixed(1)}" step="0.1" min="0" max="20">
          <div style="font-size:0.78rem;color:var(--muted);margin-top:4px;line-height:1.45;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:4px;border-left:2px solid var(--muted);">
            💡 <strong>Why 3% is recommended:</strong> During the bridge phase (age ${profile.targetRetirementAge}–${profile.govRetirementAge}) you are spending down capital at −€${((profile.monthlyRetirementExpenses||0)*12).toLocaleString('fr-FR')}/yr.
            A conservative portfolio (50% bonds/cash + 50% equities) typically returns 3–4%.
            Using the full ${(profile.estimatedReturn*100).toFixed(0)}% growth rate here would overestimate remaining capital — at that point you cannot afford to be 100% in stocks.
            <strong>Pre-retirement</strong>: ${(profile.estimatedReturn*100).toFixed(0)}% (growth ETFs, long horizon). <strong>Bridge drawdown</strong>: 3% (balanced, capital preservation).
          </div>
        </div>
        <div class="form-group">
          <label>Last Gross Salary (annual) ${currency} <span style="color:var(--muted);font-size:0.8rem;font-weight:400;">(used to calculate CVV bracket)</span></label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="lastGrossSalary" value="${profile.lastGrossSalary || 85000}" min="0" step="1000"></div>
          <div style="font-size:0.78rem;color:var(--muted);margin-top:4px;line-height:1.45;padding:6px 8px;background:rgba(255,255,255,0.04);border-radius:4px;border-left:2px solid var(--muted);">
            CVV contribution cost is set by 4 brackets based on % of PASS (€48,060 in 2026):
            &lt;€12k/yr → Cat.4 ~€2,160/yr · €12–36k → Cat.3 ~€4,316/yr · €36–48k → Cat.2 ~€6,474/yr · &gt;€48k → <strong>Cat.1 ~€8,632/yr</strong>.
            Your salary determines your bracket — all categories validate <strong>4 quarters/year</strong> equally.
          </div>
        </div>
        <div class="form-group">
          <label>Inflation %</label>
          <input type="number" name="inflation" value="${(profile.inflation * 100).toFixed(1)}" step="0.1" min="0" max="10">
        </div>

        <div class="form-group">
          <label>Legal Retirement Age</label>
          <input type="number" name="govRetirementAge" value="${profile.govRetirementAge}" min="50" max="75">
        </div>
        <!-- govMonthlyPension hidden — now calculated from SAM + Agirc-Arrco points -->
        <input type="hidden" name="govMonthlyPension" value="${profile.govMonthlyPension}">
        <div class="form-group">
          <label>Contribution Quarters (so far, excl. military)</label>
          <input type="number" name="contributionQuarters" value="${(profile as any).contributionQuarters ?? Math.round(((profile as any).contributionYears||0)*4)}" min="0" max="200"
            title="Enter validated quarters from work only. 1 year = 4 quarters. E.g. 25 years = 100 quarters.">
          <div style="font-size:0.75rem;color:var(--muted);margin-top:3px;">1 year = 4 quarters — e.g. 25 years = 100 quarters</div>
        </div>
        <div class="form-group">
          <label>Quarters Count — As of Date</label>
          <input type="date" name="quartersAsOfDate" value="${(profile as any).quartersAsOfDate || '2025-12-31'}"
            title="Date when the contribution quarters count was last verified on info-retraite.fr">
          <div style="font-size:0.75rem;color:var(--muted);margin-top:3px;">Update this when you check info-retraite.fr</div>
        </div>
        <div class="form-group">
          <label>Military Service Quarters</label>
          <input type="number" name="militaryServiceQuarters" value="${(profile as any).militaryServiceQuarters ?? 0}" min="0" max="20"
            title="16 months compulsory military service = 5 quarters (90 days each)">
          <div style="font-size:0.75rem;color:var(--muted);margin-top:3px;">16 months service national = <strong>5 quarters</strong> (each 90 days validated)</div>
        </div>

        <div class="form-group full" style="margin-top:8px;">
          <div style="font-weight:700;color:var(--fire);font-size:0.95rem;margin-bottom:8px;">🧮 Precise French Pension Inputs <span style="font-weight:400;font-size:0.8rem;color:var(--muted)">(from your relevé de carrière on info-retraite.fr)</span></div>
        </div>
        <div class="form-group">
          <label>Birth Year</label>
          <input type="number" name="birthYear" value="${profile.birthYear || (new Date().getFullYear() - profile.age)}" min="1950" max="1990">
        </div>
        <div class="form-group">
          <label>Average Annual Salary — SAM (best 25 yrs, gross) ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="salaireMoyen" value="${profile.salaireMoyen || 0}" min="0" placeholder="e.g. 42903"></div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:4px;line-height:1.4;">
            ⚠️ <strong>PASS cap applies:</strong> The CNAV only counts salary up to the annual PASS ceiling (~€46,368 in 2024).
            If your salary always exceeded the PASS (as most high earners), enter the <strong>average PASS across your 25 best years</strong> — not your actual salary.
            Example: if your career spans 2011–2035, the capped average = <strong>~€42,903</strong>
            (PASS grew from €35,352 in 2011 → €47,000 est. 2035, averaging €43k).
            Your actual salary above the PASS is covered by <strong>Agirc-Arrco points</strong> instead.
          </div>
        </div>
        <div class="form-group">
          <label>Agirc-Arrco Points Accumulated (from relevé)</label>
          <input type="number" name="agircPoints" value="${profile.agircPoints || 0}" min="0" placeholder="e.g. 85000">
        </div>
        <div class="form-group">
          <label>New Agirc-Arrco Points per Year (current)</label>
          <input type="number" name="agircPointsPerYear" value="${profile.agircPointsPerYear || 0}" min="0" placeholder="e.g. 3500">
        </div>

        <div class="form-group full" style="margin-top:8px;">
          <div style="font-weight:700;color:var(--fire);font-size:0.95rem;margin-bottom:8px;">🏠 Property to SELL at Retirement (primary)</div>
        </div>
        <div class="form-group">
          <label>Sale Price of Property ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="realEstateValue" value="${profile.realEstateValue}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Mortgage Remaining on it ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="mortgageRemaining" value="${profile.mortgageRemaining}" min="0"></div>
        </div>

        <div class="form-group full" style="margin-top:8px;">
          <div style="font-weight:700;color:var(--fire);font-size:0.95rem;margin-bottom:8px;">🏡 Retirement Home (where you'll live — no mortgage)</div>
        </div>
        <div class="form-group">
          <label>Value of Retirement Home ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="secondPropertyValue" value="${profile.secondPropertyValue || 0}" min="0"></div>
        </div>
        <div class="form-group">
          <label>City / Location</label>
          <input type="text" name="secondPropertyCity" value="${profile.secondPropertyCity || ''}" placeholder="e.g. Bretagne">
        </div>

        <div class="form-group full" style="margin-top:8px;">
          <div style="font-weight:700;color:var(--fire);font-size:0.95rem;margin-bottom:8px;">🎁 Gift to Children (from house sale)</div>
        </div>
        <div class="form-group">
          <label>Amount given to children ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="giftToChildren" value="${profile.giftToChildren || 0}" min="0"></div>
        </div>
        <div class="form-group full" style="margin-top:8px;">
          <div style="font-weight:700;color:var(--fire);font-size:0.95rem;margin-bottom:8px;">💰 Expected Inheritance</div>
        </div>
        <div class="form-group">
          <label>Inheritance Amount ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="inheritanceAmount" value="${profile.inheritanceAmount || 0}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Age When Received</label>
          <input type="number" name="inheritanceAge" value="${profile.inheritanceAge || 65}" min="30" max="100">
        </div>

        <div class="form-group full">
          <label>My goals, questions, context (for AI analysis)</label>
          <textarea name="notes" placeholder="e.g. I want to retire at 45, I have a 300k mortgage, I am considering investing in rental property in Lyon...">${profile.notes}</textarea>
        </div>

      </div>
      <div style="display:flex;gap:10px;margin-top:16px;align-items:center;flex-wrap:wrap;">
        <button type="button" id="save-btn" class="btn btn-secondary">💾 Save</button>
        <button type="button" id="analyze-btn" class="btn btn-primary">🤖 Analyze with AI</button>
        <span id="analyze-status" style="color:var(--muted);font-size:12px;"></span>
      </div>
    </form>

    <!-- AI Response Zone -->
    <div id="ai-response-zone" style="display:${analysis?.summary ? 'block' : 'none'};margin-top:20px;border-top:1px solid var(--border);padding-top:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <span style="font-size:22px;">🤖</span>
        <div>
          <div style="font-weight:700;font-size:16px;color:var(--fire);">AI Analysis — Personalized Response</div>
          <div id="ai-response-date" style="color:var(--muted);font-size:11px;">${analysis?.generatedAt ? 'Generated: ' + new Date(analysis.generatedAt).toLocaleString('en-US') : ''}</div>
        </div>
      </div>
      <div id="ai-response-text" class="ai-section" style="line-height:1.9;font-size:14.5px;background:rgba(243,156,18,.04);border:1px solid rgba(243,156,18,.15);border-radius:8px;padding:20px;">${analysis?.summary || ''}</div>
      <p style="color:var(--muted);font-size:12px;margin-top:10px;">💡 Detailed analysis per category available in each tab below.</p>
    </div>
  </div>

  <!-- ═══ FIRE SUMMARY STRIP ═══ -->
  <div class="grid-4" style="margin-bottom:20px;" id="summary-strip">
    <div class="card" style="text-align:center;">
      <div class="label" style="color:var(--muted);font-size:12px;margin-bottom:4px;">FIRE Number</div>
      <div class="big-number" id="s-fire-number">${currency}${fmt(calc.fireNumber)}</div>
    </div>
    <div class="card" style="text-align:center;">
      <div class="label" style="color:var(--muted);font-size:12px;margin-bottom:4px;">Current Assets</div>
      <div class="big-number" style="color:var(--blue);" id="s-assets">${currency}${fmt(calc.totalAssets)}</div>
    </div>
    <div class="card" style="text-align:center;">
      <div class="label" style="color:var(--muted);font-size:12px;margin-bottom:4px;">Years to FIRE</div>
      <div class="big-number" style="color:${feasibilityColor};" id="s-years">${calc.yearsToFire}</div>
    </div>
    <div class="card" style="text-align:center;">
      <div class="label" style="color:var(--muted);font-size:12px;margin-bottom:4px;">Savings Rate</div>
      <div class="big-number" style="color:var(--green);" id="s-savings-rate">${pct(calc.savingsRate)}</div>
    </div>
  </div>

  <!-- Progress Bar -->
  <div class="card" style="margin-bottom:20px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-weight:600;">Progress toward FIRE</span>
      <span id="progress-label" style="color:${progressColor};font-weight:700;">${pct(calc.progressPercent)}</span>
    </div>
    <div class="progress-bar-wrap">
      <div class="progress-bar-fill" id="progress-fill" style="width:${Math.min(100, calc.progressPercent)}%"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px;color:var(--muted);">
      <span>${currency}0</span>
      <span id="coast-label">Coast FIRE ${currency}${fmt(calc.coastFireNumber)}</span>
      <span id="fire-target-label">FIRE ${currency}${fmt(calc.fireNumber)}</span>
    </div>
  </div>

  <!-- ═══ TABS ═══ -->
  <div class="tabs">
    <button class="tab-btn active" data-tab="realism">🎯 Realism</button>
    <button class="tab-btn" data-tab="fire-plan">📊 Action Plan</button>
    <button class="tab-btn" data-tab="stocks">📈 Stock Market</button>
    <button class="tab-btn" data-tab="real-estate">🏠 Real Estate</button>
    <button class="tab-btn" data-tab="gov-retirement">🏛️ Gov. Retirement</button>
  </div>

  <!-- ═══ TAB: REALISM ═══ -->
  <div class="tab-pane active" id="tab-realism">
    ${analysis?.summary ? `<div class="summary-banner"><div class="ai-section">${analysis.summary}</div></div>` : ''}
    <div class="grid-3" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-title">FIRE Variants</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="metric">
            <span class="label">Lean FIRE (−30% expenses)</span>
            <span class="value" id="lean-fire">${currency}${fmt(calc.leanFireNumber)}</span>
          </div>
          <div class="metric">
            <span class="label">Regular FIRE</span>
            <span class="value" style="color:var(--fire);" id="reg-fire">${currency}${fmt(calc.fireNumber)}</span>
          </div>
          <div class="metric">
            <span class="label">Fat FIRE (+50% expenses)</span>
            <span class="value" id="fat-fire">${currency}${fmt(calc.fatFireNumber)}</span>
          </div>
          <div class="metric">
            <span class="label">Coast FIRE (invest now, stop later)</span>
            <span class="value" style="color:var(--purple);" id="coast-fire">${currency}${fmt(calc.coastFireNumber)}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Key Metrics</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="metric">
            <span class="label">Monthly Surplus</span>
            <span class="value" style="color:var(--green);" id="monthly-surplus">${currency}${fmt(calc.monthlySurplus)}</span>
          </div>
          <div class="metric">
            <span class="label">Monthly Shortfall to hit target</span>
            <span class="value" style="color:${calc.monthlyShortfall > 0 ? 'var(--red)' : 'var(--green)'};" id="monthly-shortfall">${calc.monthlyShortfall > 0 ? currency + fmt(calc.monthlyShortfall) : 'On track ✓'}</span>
          </div>
          <div class="metric">
            <span class="label">Projected FIRE Age</span>
            <span class="value" style="color:${feasibilityColor};" id="fire-age">${calc.fireAge}</span>
          </div>
          <div class="metric">
            <span class="label">Net Worth</span>
            <span class="value" id="net-worth">${currency}${fmt(calc.totalNetWorth)}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Milestones</div>
        <div class="milestones" id="milestones-list">
          ${calc.milestones.map(m => `
          <div class="milestone">
            <div class="milestone-dot ${m.reached ? 'reached' : 'pending'}"></div>
            <span class="milestone-label">${m.label}</span>
            <span class="milestone-year">${m.reached ? '✓' : m.year}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🤖 AI Realism Assessment</div>
      <div class="ai-section" id="ai-realism">${analysis?.realism || '<p style="color:var(--muted);">Click "Analyze with AI" above to get a personalized assessment.</p>'}</div>
    </div>
  </div>

  <!-- ═══ TAB: FIRE PLAN ═══ -->
  <div class="tab-pane" id="tab-fire-plan">
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">Portfolio Projection</div>
      <div id="chart-projection"></div>
    </div>

    <!-- ── Static Capital Breakdown ── -->
    ${(() => {
      const yearsToRet = Math.max(0, profile.targetRetirementAge - profile.age);
      const saleNet = Math.max(0, (profile.realEstateValue||0) - (profile.mortgageRemaining||0));
      const agencyFees = Math.round((profile.realEstateValue||0) * 0.04);
      const diagnostics = 1000;
      const saleProceedsFull = saleNet - agencyFees - diagnostics;
      const giftToKids = profile.giftToChildren || 0;
      const saleProceeds = saleProceedsFull - giftToKids;
      const grossReturn = profile.estimatedReturn || 0.07;
      const taxRate = profile.stockReturnTax ?? 0.30;
      const netReturn = grossReturn * (1 - taxRate);
      const stocksAtRet = Math.round((profile.stockPortfolio||0) * Math.pow(1 + netReturn, yearsToRet));
      const cashSavings = profile.currentSavings || 0;
      const totalCap = saleProceeds + cashSavings + stocksAtRet;
      const gapYrs = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
      const bridgeTotal = (profile.monthlyRetirementExpenses||0) * 12 * gapYrs;
      const PASS = 48060;
      const passR = (profile.lastGrossSalary||85000) / PASS;
      const cvvAnn = passR >= 1.0 ? 8632 : passR >= 0.75 ? 6474 : passR >= 0.50 ? 4316 : 2160;
      const cvvBrk = passR >= 1.0 ? 1 : passR >= 0.75 ? 2 : passR >= 0.50 ? 3 : 4;
      const cvvTotal = gapYrs * cvvAnn;
      const cvvTMI = (profile.lastGrossSalary||85000) > 118817 ? 0.41 : (profile.lastGrossSalary||85000) > 41554 ? 0.30 : 0.11;
      const cvvNet = Math.round(cvvTotal * (1 - cvvTMI));
      const fmtE = (n: number) => '€' + Math.round(n).toLocaleString('fr-FR');
      const fmtR = (n: number) => n < 0 ? '−€' + Math.abs(Math.round(n)).toLocaleString('fr-FR') : fmtE(n);
      const br = profile.bridgeReturn ?? 0.03;
      const capAtPension = Math.round(totalCap * Math.pow(1 + br, gapYrs) - bridgeTotal - cvvTotal);

      return `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">💰 Capital at Retirement — Detailed Breakdown</div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">

        <!-- House Sale -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="font-weight:700;color:var(--text);margin-bottom:10px;">🏠 Real Estate — House Sale at Age ${profile.targetRetirementAge}</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:3px 0;color:var(--muted);">Sale price</td><td style="padding:3px 0;text-align:right;font-weight:600;">${fmtE(profile.realEstateValue||0)}</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">− Mortgage repayment</td><td style="padding:3px 0;text-align:right;color:var(--red);">${fmtR(-(profile.mortgageRemaining||0))}</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">− Agency fees (4% of price)</td><td style="padding:3px 0;text-align:right;color:var(--red);">${fmtR(-agencyFees)}</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">− Diagnostics</td><td style="padding:3px 0;text-align:right;color:var(--red);">${fmtR(-diagnostics)}</td></tr>
            <tr style="border-top:1px solid var(--border);"><td style="padding:5px 0;color:var(--muted);">= Seller net proceeds</td><td style="padding:5px 0;text-align:right;font-weight:700;">${fmtE(saleProceedsFull)}</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">− Gift to children (tax-free)</td><td style="padding:3px 0;text-align:right;color:var(--red);">${fmtR(-giftToKids)}</td></tr>
            <tr style="border-top:1px solid var(--border);"><td style="padding:5px 0;font-weight:700;color:var(--green);">= Net to invest</td><td style="padding:5px 0;text-align:right;font-weight:700;color:var(--green);">${fmtE(saleProceeds)}</td></tr>
          </table>
          <p style="font-size:11px;color:var(--muted);margin:8px 0 0;">* Notary fees (frais de notaire) paid by buyer — not deducted</p>
        </div>

        <!-- Stock & Cash -->
        <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="font-weight:700;color:var(--text);margin-bottom:10px;">📈 Stock Portfolio & Cash at Age ${profile.targetRetirementAge}</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:3px 0;color:var(--muted);">Stock portfolio today</td><td style="padding:3px 0;text-align:right;font-weight:600;">${fmtE(profile.stockPortfolio||0)}</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">Gross annual return</td><td style="padding:3px 0;text-align:right;">${(grossReturn*100).toFixed(0)}% / yr</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">Tax on returns (PFU)</td><td style="padding:3px 0;text-align:right;color:var(--red);">−${Math.round(taxRate*100)}%</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);font-weight:600;">Net annual return</td><td style="padding:3px 0;text-align:right;font-weight:600;">${(netReturn*100).toFixed(1)}% / yr</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">Growth period</td><td style="padding:3px 0;text-align:right;">${yearsToRet} yrs (age ${profile.age}→${profile.targetRetirementAge})</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">Net investment return</td><td style="padding:3px 0;text-align:right;color:var(--green);">+${fmtE(stocksAtRet - (profile.stockPortfolio||0))}</td></tr>
            <tr style="border-top:1px solid var(--border);"><td style="padding:5px 0;font-weight:700;color:var(--green);">= Portfolio at retirement</td><td style="padding:5px 0;text-align:right;font-weight:700;color:var(--green);">${fmtE(stocksAtRet)}</td></tr>
            <tr><td style="padding:3px 0;color:var(--muted);">+ Cash savings</td><td style="padding:3px 0;text-align:right;">${fmtE(cashSavings)}</td></tr>
          </table>
        </div>
      </div>

      <!-- Total + Bridge summary -->
      <div style="background:rgba(255,165,0,0.08);border:1px solid rgba(255,165,0,0.3);border-radius:10px;padding:16px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center;">
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">TOTAL INVESTABLE CAPITAL at ${profile.targetRetirementAge}</div>
            <div style="font-size:22px;font-weight:800;color:var(--fire);">${fmtE(totalCap)}</div>
            <div style="font-size:11px;color:var(--muted);">${fmtE(saleProceeds)} house + ${fmtE(stocksAtRet)} stocks + ${fmtE(cashSavings)} cash</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">BRIDGE DRAWDOWN (${gapYrs} yrs × ${fmtE(profile.monthlyRetirementExpenses||0)}/mo)</div>
            <div style="font-size:22px;font-weight:800;color:var(--red);">−${fmtE(bridgeTotal)}</div>
            <div style="font-size:11px;color:var(--muted);">+ CVV Cat.${cvvBrk}: −${fmtE(cvvTotal)} gross (~−${fmtE(cvvNet)} net)</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">EST. CAPITAL AT ${profile.govRetirementAge} (${(br*100).toFixed(0)}% bridge return)</div>
            <div style="font-size:22px;font-weight:800;color:var(--green);">${fmtE(capAtPension)}</div>
            <div style="font-size:11px;color:var(--muted);">before inheritance + pension income</div>
          </div>
        </div>
      </div>
    </div>`;
    })()}

    <div class="card">
      <div class="card-title">🤖 AI Action Plan</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:16px;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;">
        <span style="font-size:13px;font-weight:600;color:var(--text);">Plan for scenario:</span>
        <select id="fire-plan-scenario" style="background:var(--card);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-size:13px;cursor:pointer;flex:1;min-width:200px;">
          <option value="F">★ F — CVV Cat.${(() => { const r=(profile.lastGrossSalary||85000)/48060; return r>=1?1:r>=0.75?2:r>=0.5?3:4; })()} (${profile.govRetirementAge - profile.targetRetirementAge} yrs) + claim CNAV+Agirc at 67 — recommended</option>
          <option value="A">A — Do nothing (claim at ${profile.govRetirementAge} with ${Math.round(Math.min(25,(calc.missingQuarters||0)*1.25))}% décote)</option>
          <option value="B">B — Rachat 12 qtrs before 60 (claim at ${profile.govRetirementAge})</option>
          <option value="C">C — CVV ${profile.govRetirementAge - profile.targetRetirementAge} yrs × 4 = ${(profile.govRetirementAge - profile.targetRetirementAge)*4} qtrs (claim at ${profile.govRetirementAge})</option>
          <option value="D">D — Rachat + CVV combined (claim at ${profile.govRetirementAge})</option>
          <option value="E">E — Wait until 67, no CVV (taux plein auto, extra 2yr bridge cost)</option>
          <option value="G">G — Work until 65 (${65-(profile.age||51)} more yrs), claim at 67</option>
          <option value="H">H — Work until 67 (${67-(profile.age||51)} more yrs), no bridge</option>
        </select>
        <button onclick="runFirePlanForScenario()" style="background:var(--fire);color:#fff;border:none;border-radius:6px;padding:7px 18px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;">▶ Run AI Plan</button>
        <span id="fire-plan-run-status" style="font-size:12px;color:var(--muted);"></span>
      </div>
      <div class="ai-section" id="ai-fire-plan">${analysis?.firePlan || '<p style="color:var(--muted);">Select a scenario above and click ▶ Run AI Plan, or click "Analyze with AI" at the top to generate all sections at once.</p>'}</div>
    </div>
  </div>

  <!-- ═══ TAB: STOCKS ═══ -->
  <div class="tab-pane" id="tab-stocks">
    <div class="grid-2" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-title">Recommended Allocation (Age-based)</div>
        <div id="chart-allocation"></div>
      </div>
      <div class="card">
        <div class="card-title">Suggested ETF Portfolio</div>
        <table class="etf-table" id="etf-table">
          <thead><tr><th>ETF / Asset</th><th>Allocation</th><th>Type</th></tr></thead>
          <tbody id="etf-tbody"></tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <div class="card-title">📈 Stock Portfolio Growth to Retirement</div>
      <p style="color:var(--muted);font-size:0.85rem;margin-bottom:12px;">
        Formula: Current value × (1 + annual return)^years to retirement
        &nbsp;=&nbsp; ${currency}${fmt(profile.stockPortfolio)} × (1 + ${(profile.estimatedReturn*100).toFixed(0)}%)^${Math.max(0,profile.targetRetirementAge-profile.age)} years
        &nbsp;=&nbsp; <strong style="color:var(--green);">${currency}${fmt(profile.stockPortfolio * Math.pow(1+profile.estimatedReturn, Math.max(0,profile.targetRetirementAge-profile.age)))}</strong>
      </p>
      <table class="data-table">
        <thead><tr><th>Year</th><th>Age</th><th>Value (start)</th><th>Growth (${(profile.estimatedReturn*100).toFixed(0)}%)</th><th>Value (end)</th></tr></thead>
        <tbody>
          ${(() => {
            const rows = [];
            let v = profile.stockPortfolio;
            const currentYear = new Date().getFullYear();
            const yrs = Math.max(0, profile.targetRetirementAge - profile.age);
            for(let y=1; y<=yrs; y++){
              const growth = Math.round(v * profile.estimatedReturn);
              const end = Math.round(v * (1+profile.estimatedReturn));
              rows.push(`<tr>
                <td>${currentYear+y-1}</td>
                <td>${profile.age+y-1}</td>
                <td>${currency}${fmt(v)}</td>
                <td style="color:var(--green);">+${currency}${fmt(growth)}</td>
                <td><strong>${currency}${fmt(end)}</strong></td>
              </tr>`);
              v = end;
            }
            return rows.join('');
          })()}
          <tr style="background:var(--card-bg);font-weight:700;">
            <td colspan="4" style="color:var(--fire);">🎯 At retirement (age ${profile.targetRetirementAge})</td>
            <td style="color:var(--green);">${currency}${fmt(profile.stockPortfolio * Math.pow(1+profile.estimatedReturn, Math.max(0,profile.targetRetirementAge-profile.age)))}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-title">🤖 AI Stock Market Strategy</div>
      <div class="ai-section" id="ai-stocks">${analysis?.stocks || '<p style="color:var(--muted);">Click "Analyze with AI" above to get stock market recommendations.</p>'}</div>
    </div>
  </div>

  <!-- ═══ TAB: REAL ESTATE ═══ -->
  <div class="tab-pane" id="tab-real-estate">
    <div class="grid-3" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-title">Net Real Estate</div>
        <div class="metric">
          <span class="label">Property Value</span>
          <span class="value" id="re-value">${currency}${fmt(profile.realEstateValue)}</span>
        </div>
        <div style="margin-top:12px;" class="metric">
          <span class="label">Mortgage Remaining</span>
          <span class="value" style="color:var(--red);" id="re-mortgage">${currency}${fmt(profile.mortgageRemaining)}</span>
        </div>
        <div style="margin-top:12px;" class="metric">
          <span class="label">Net Equity</span>
          <span class="value" style="color:var(--green);" id="re-equity">${currency}${fmt(profile.realEstateValue - profile.mortgageRemaining)}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Rental Income Impact</div>
        <div class="metric">
          <span class="label">Monthly Rental Income</span>
          <span class="value" style="color:var(--green);" id="re-rental">${currency}${fmt(profile.monthlyRentalIncome)}</span>
        </div>
        <div style="margin-top:12px;" class="metric">
          <span class="label">Annual Rental Income</span>
          <span class="value" id="re-rental-annual">${currency}${fmt(profile.monthlyRentalIncome * 12)}</span>
        </div>
        <div style="margin-top:12px;" class="metric">
          <span class="label">FIRE Number Reduction</span>
          <span class="value" style="color:var(--fire);" id="re-fire-reduction">${currency}${fmt(profile.monthlyRentalIncome * 12 * 25)}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Gross Rental Yield</div>
        <div class="big-number" id="re-yield" style="color:${profile.realEstateValue > 0 && profile.monthlyRentalIncome > 0 ? 'var(--green)' : 'var(--muted)'};">
          ${profile.realEstateValue > 0 && profile.monthlyRentalIncome > 0 ? pct((profile.monthlyRentalIncome * 12) / profile.realEstateValue * 100) : 'N/A'}
        </div>
        <div style="margin-top:8px;color:var(--muted);font-size:12px;">Annual rent / Property value</div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">🤖 AI Real Estate Strategy</div>
      <div class="ai-section" id="ai-real-estate">${analysis?.realEstate || '<p style="color:var(--muted);">Click "Analyze with AI" above to get real estate recommendations.</p>'}</div>
    </div>
  </div>

  <!-- ═══ TAB: GOVERNMENT RETIREMENT ═══ -->
  <div class="tab-pane" id="tab-gov-retirement">
    <div class="grid-3" style="margin-bottom:20px;">
      <div class="card">
        <div class="card-title">State Pension Overview</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="metric">
            <span class="label">Legal Retirement Age</span>
            <span class="value" id="gov-ret-age">${profile.govRetirementAge}</span>
          </div>
          <div class="metric">
            <span class="label">Estimated Monthly Pension</span>
            <span class="value" style="color:var(--green);" id="gov-monthly-pension">${currency}${fmt(profile.govMonthlyPension)}</span>
          </div>
          <div class="metric">
            <span class="label">Annual Pension Income</span>
            <span class="value" id="gov-annual-pension">${currency}${fmt(calc.govPensionAnnual)}</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Contribution Progress</div>
        <div style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;" id="gov-contrib-label">${((profile as any).contributionQuarters ?? 0) + ((profile as any).militaryServiceQuarters ?? 0)} / ${calc.trimestresRequis} quarters</span>
            <span style="color:var(--fire);font-weight:700;" id="gov-contrib-pct">${pct(calc.contributionProgress)}</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" id="gov-contrib-bar" style="width:${Math.min(100, calc.contributionProgress)}%;background:linear-gradient(90deg,#58a6ff,#bc8cff);"></div>
          </div>
        </div>
        <div class="metric">
          <span class="label">Quarters still needed for full pension</span>
          <span class="value" style="color:var(--purple);" id="gov-years-left">${calc.yearsToFullPension}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Impact on FIRE</div>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="metric">
            <span class="label">FIRE Number (without pension)</span>
            <span class="value" id="gov-fire-without">${currency}${fmt(calc.fireNumber)}</span>
          </div>
          <div class="metric">
            <span class="label">FIRE Number (pension included)</span>
            <span class="value" style="color:var(--green);" id="gov-fire-with">${currency}${fmt(calc.fireNumberWithPension)}</span>
          </div>
          <div class="metric">
            <span class="label">Savings from pension</span>
            <span class="value" style="color:var(--fire);" id="gov-fire-saving">${currency}${fmt(calc.fireNumber - calc.fireNumberWithPension)}</span>
          </div>
          <div class="metric">
            <span class="label">Gap: FIRE age → legal retirement</span>
            <span class="value" style="color:${calc.govGap > 10 ? 'var(--red)' : calc.govGap > 5 ? 'var(--fire)' : 'var(--green)'};" id="gov-gap">${calc.govGap} years</span>
          </div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title" style="cursor:pointer;user-select:none;" onclick="const b=document.getElementById('sam-calc-body');b.style.display=b.style.display==='none'?'block':'none';">
        🧮 SAM Calculator — Average Annual Salary (Best 25 Years, PASS-Capped) &nbsp;<span style="font-size:12px;color:var(--muted);" id="sam-toggle-hint">▼ click to expand</span>
      </div>
      <div id="sam-calc-body" style="display:none;margin-top:12px;">
        <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">
          French retraite de base (CNAV) uses your <strong>best 25 years</strong> of gross annual salary, each year capped at the annual <strong>PASS ceiling</strong>.
          Enter your gross salary for each year — the table auto-caps at PASS, highlights the best 25 years, and computes your SAM.
          <em style="color:var(--fire);">Years 2026–2034 are pre-filled as future estimates — update as needed.</em>
        </p>
        <div style="overflow-x:auto;">
        <table style="width:100%;font-size:12px;border-collapse:collapse;min-width:550px;" id="sam-table">
          <thead>
            <tr style="background:rgba(255,255,255,0.06);">
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border);">Year</th>
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border);">Your Age</th>
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border);">Gross Salary €/yr</th>
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border);">PASS Cap €</th>
              <th style="padding:5px 8px;text-align:left;border-bottom:1px solid var(--border);">Capped €</th>
              <th style="padding:5px 8px;text-align:center;border-bottom:1px solid var(--border);">Best 25?</th>
            </tr>
          </thead>
          <tbody id="sam-rows"></tbody>
        </table>
        </div>
        <div style="margin-top:14px;padding:12px;background:rgba(88,214,141,0.08);border:1px solid rgba(88,214,141,0.25);border-radius:8px;display:flex;flex-wrap:wrap;align-items:center;gap:20px;">
          <div style="font-size:15px;"><strong>Calculated SAM:</strong> <span id="sam-result" style="color:var(--green);font-weight:700;font-size:17px;">—</span></div>
          <div style="font-size:13px;color:var(--muted);">Best 25 years total: <span id="sam-total" style="color:var(--text);">—</span></div>
          <button onclick="applySam()" style="padding:7px 18px;background:var(--green);color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;">✓ Apply this SAM to profile</button>
        </div>
        <div id="sam-count" style="margin-top:6px;font-size:11px;color:var(--muted);"></div>
        <p style="font-size:11px;color:var(--muted);margin-top:8px;">
          ℹ️ PASS values 2026–2034 are estimates (approx. +2%/yr). Actual values will be set each November by Arrêté.
          Only base pension (CNAV) uses SAM — Agirc-Arrco uses your points instead.
        </p>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">📚 French Retirement Rules — Reference Guide</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:4px;">

        <div style="background:var(--bg-card-alt,rgba(255,255,255,0.04));border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="font-weight:700;color:var(--fire);margin-bottom:10px;font-size:15px;">🔄 Rachat de Trimestres (Art. L351-14-1)</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:var(--muted);width:50%;">Maximum quarters</td><td style="padding:4px 0;font-weight:600;color:var(--text);">12 quarters (3 years)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Eligibility</td><td style="padding:4px 0;color:var(--text);">Higher education years + incomplete contribution years (< 4 quarters)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Cost (age 50–55)</td><td style="padding:4px 0;color:var(--text);">~€3,500–5,000 / quarter</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Cost (age 55–60)</td><td style="padding:4px 0;color:var(--text);">~€5,000–7,000 / quarter</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Total cost (12 qtrs)</td><td style="padding:4px 0;font-weight:600;color:var(--red);">~€42,000–84,000</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Tax deduction</td><td style="padding:4px 0;color:var(--green);">100% deductible from income tax (net cost ~30% less)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Effect on pension</td><td style="padding:4px 0;color:var(--text);">Increases retraite de base (CNAV) <strong>only</strong> — does NOT add Agirc-Arrco points</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Options (3 choices)</td><td style="padding:4px 0;color:var(--text);">Taux only / Durée only / Taux + Durée (most expensive but best)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Timing</td><td style="padding:4px 0;color:var(--fire);font-weight:600;">Must apply BEFORE claiming pension — ideally before age 60</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Where to apply</td><td style="padding:4px 0;color:var(--text);">CNAV (carsat) — online via info-retraite.fr → simulation de rachat</td></tr>
          </table>
          <div style="margin-top:10px;padding:8px;background:rgba(255,165,0,0.1);border-radius:6px;font-size:12px;color:var(--fire);">
            ⚠️ <strong>Important:</strong> Costs increase significantly each year you wait. Apply before age 60 for the best rate. Request a quote ("chiffrage") from CNAV — it's free and non-binding.
          </div>
        </div>

        <div style="background:var(--bg-card-alt,rgba(255,255,255,0.04));border:1px solid var(--border);border-radius:10px;padding:16px;">
          <div style="font-weight:700;color:#58a6ff;margin-bottom:10px;font-size:15px;">⏱️ CVV — Assurance Volontaire Vieillesse (Form S1101)</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:var(--muted);width:50%;">Max quarters / year</td><td style="padding:4px 0;font-weight:600;color:var(--text);">4 quarters per calendar year</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Total limit</td><td style="padding:4px 0;color:var(--green);font-weight:600;">No fixed cap — limited only by how long you contribute (e.g. 7 yrs bridge → max 28 quarters)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Annual cost 2026 (4 brackets)</td><td style="padding:4px 0;color:var(--text);">Cat.4 min: <strong>~€2,160/yr</strong> (25% PASS) · Cat.3: ~€4,316 · Cat.2: ~€6,474 · Cat.1: ~€8,632 (100% PASS = high salary). Most early retirees choose Cat.4 to minimise cost while still validating 4 full quarters.</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">⚠️ Eligibility</td><td style="padding:4px 0;color:var(--text);">People who stopped working AND are <strong>not yet eligible to claim any pension</strong>. If you already qualify for early retirement (carrière longue etc.), you may be excluded. Confirm with your CPAM/CARSAT.</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Effect on pension</td><td style="padding:4px 0;color:var(--text);">Adds quarters to CNAV (retraite de base) + improves SAM reference salary — does NOT add Agirc-Arrco points</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Tax deduction</td><td style="padding:4px 0;color:var(--text);">Fully deductible from overall income ("revenu imposable") — effective after-tax cost ~30–45% less</td></tr>
            <tr><td style="padding:4px 0;color:var(--green);font-weight:600;">Solidarity coeff.</td><td style="padding:4px 0;color:var(--green);font-weight:600;">✅ ABOLISHED Dec 1, 2023 — no longer applies to anyone retiring from that date</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">⚠️ Enroll deadline</td><td style="padding:4px 0;color:var(--fire);font-weight:600;">Must enroll within 6 months of stopping work — form S1101 (Cerfa n°59941) to your local CPAM</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Where to apply</td><td style="padding:4px 0;color:var(--text);">CPAM (Caisse d'Assurance Maladie) — form <strong>S1101</strong> · Contributions paid quarterly via Urssaf</td></tr>
          </table>
          <div style="margin-top:10px;padding:8px;background:rgba(88,166,255,0.1);border-radius:6px;font-size:12px;color:#58a6ff;">
            💡 <strong>CVV vs Rachat:</strong> CVV validates future quarters year-by-year at €2,160–€8,632/yr (flexible, no cap, also improves SAM). Rachat buys past periods as a lump sum — max 12 quarters lifetime, often €4,000–€5,000/quarter. Both only affect CNAV — Agirc points require active salaried employment.
          </div>
        </div>

      </div>

      <div style="margin-top:16px;padding:12px;background:rgba(188,140,255,0.08);border:1px solid rgba(188,140,255,0.3);border-radius:8px;font-size:13px;">
        <strong style="color:#bc8cff;">📌 Key rule summary for your situation (retire at 60, pension at 67):</strong>
        <ul style="margin:8px 0 0 0;padding-left:20px;color:var(--text);line-height:1.8;">
          <li><strong>Rachat max = 12 quarters</strong> (≈ 3 years) — apply now (before 60), costs ~€42k–€60k gross, ~€30k–€42k after tax deduction</li>
          <li><strong>CVV for 7 bridge years = 28 quarters</strong> — enroll within 6 months of stopping work, ~€2,160/yr min × 7 = ~€15,120 (Category 4, before tax deduction)</li>
          <li><strong>Combine both (B+C)</strong>: 28 + 12 = 40 additional quarters — check if this reaches your taux plein threshold</li>
          <li><strong>Agirc-Arrco solidarity malus: ABOLISHED Dec 2023 ✅</strong> — no longer any timing penalty. Claim Agirc at your legal retirement age (<strong>64</strong> for born 1974) for full rate with zero reduction (no permanent minoration viagère)</li>
          <li><strong>Wait until 67 (taux plein automatique)</strong>: guaranteed 0% décote regardless of quarters — no cost, but 7 more bridge years to fund</li>
        </ul>
      </div>
      <div style="margin-top:12px;padding:10px 14px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:8px;font-size:11.5px;color:var(--muted);line-height:1.8;">
        <strong style="color:var(--text);">📎 Sources vérifiées :</strong>
        <a href="https://www.ameli.fr/assure/droits-demarches/invalidite-handicap/assurance-volontaire-invalidite-vieillesse-veuvage" target="_blank" style="color:#58a6ff;text-decoration:none;">ameli.fr — CVV (S1101)</a> ·
        <a href="https://altis-conseil.fr/cotisation-volontaire-retraite/" target="_blank" style="color:#58a6ff;text-decoration:none;">altis-conseil.fr — Coûts 2026</a> ·
        <a href="https://www.service-public.fr/particuliers/vosdroits/F15675" target="_blank" style="color:#58a6ff;text-decoration:none;">service-public.fr — Rachat (max 12q)</a> ·
        <a href="https://www.agirc-arrco.fr/nous-connaitre/nos-actualites/fin-du-malus-agirc-arrco-ce-1er-avril/" target="_blank" style="color:#58a6ff;text-decoration:none;">agirc-arrco.fr — Malus aboli</a> ·
        <a href="https://www.service-public.fr/particuliers/vosdroits/F15396" target="_blank" style="color:#58a6ff;text-decoration:none;">service-public.fr — Agirc-Arrco règles</a> ·
        <a href="https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006073189/LEGISCTA000006156754/" target="_blank" style="color:#58a6ff;text-decoration:none;">Légifrance — Art. R742-1 à R742-39</a> ·
        <a href="https://www.urssaf.fr/accueil/employeur/cotisations/base-forfaitaire-franchise-cotis/assures-volontaires.html" target="_blank" style="color:#58a6ff;text-decoration:none;">urssaf.fr — Assurés volontaires</a>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">📊 Lifetime Pension Value — All Scenarios × Age of Death</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:14px;">
        Net total pension received over your lifetime (after deducting strategy costs) for each scenario, depending on when you die.
        Green = best scenario for that age. Break-even = age at which strategy surpasses "Do Nothing".
      </p>
      <div style="overflow-x:auto;">
      <table style="width:100%;font-size:12px;border-collapse:collapse;min-width:820px;">
        <thead>
          <tr style="background:rgba(255,255,255,0.06);">
            <th style="padding:6px 10px;text-align:left;border-bottom:1px solid var(--border);">Scenario</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Monthly ⚠ gross</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">From age</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Net cost</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);color:#f39c12;">Die at 75</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);color:#f39c12;">Die at 80</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);color:#f39c12;">Die at 85</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);color:#f39c12;">Die at 90</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);color:#f39c12;">Die at 95</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Break-even</th>
            <th style="padding:6px 10px;text-align:left;border-bottom:1px solid var(--border);min-width:290px;color:var(--muted);">How it's calculated</th>
          </tr>
        </thead>
        <tbody id="lifetime-pension-tbody"></tbody>
      </table>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:8px;">
        * <strong>Monthly pension figures are GROSS before income tax</strong> — deduct approx. 30% (or your marginal rate) to get net. Pension income is subject to CSG/CRDS (~8.3%) + income tax.
        Net cost = after 30% income tax deduction on rachat de trimestres. CVV contributions also fully deductible from income. Agirc-Arrco solidarity malus ABOLISHED Dec 1, 2023 — no longer applicable.
        All values in today's euros (not inflation-adjusted).
      </p>
      <div id="pension-strategy-analysis" style="margin-top:20px;"></div>
    </div>

    <div class="card">
      <div class="card-title">🤖 AI Government Retirement Strategy</div>
      <div class="ai-section" id="ai-gov-retirement">${analysis?.govRetirement || '<p style="color:var(--muted);">Click "Analyze with AI" above to get personalized state pension recommendations.</p>'}</div>
    </div>
  </div>

</div><!-- /container -->

<!-- ECharts via CDN -->
<script src="https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js"></script>
<script>
// ═══ DATA ═══
let profileData = ${JSON.stringify(profile)};
let calcData = ${JSON.stringify(calc)};
let projData = ${projJson};
let milestoneData = ${milestoneJson};

// ═══ TABS ═══
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'fire-plan') renderProjectionChart();
    if (btn.dataset.tab === 'stocks') { renderAllocationChart(); renderEtfTable(); }
  });
});

// ═══ LIVE CALCULATIONS ═══
function calcFire(p) {
  const r = Math.max(0.001, (p.estimatedReturn||0.07) - (p.inflation||0.02));
  const annualRet = p.monthlyRetirementExpenses * 12;
  const annualRental = p.monthlyRentalIncome * 12;
  const netExp = Math.max(0, annualRet - annualRental);
  const fireNum = netExp * 25;
  const leanFire = Math.max(0, (annualRet * 0.7 - annualRental) * 25);
  const fatFire = (annualRet * 1.5 - annualRental) * 25;
  const totalAssets = p.currentSavings + p.stockPortfolio;
  const surplus = p.monthlyIncome - p.monthlyExpenses + p.monthlyRentalIncome;
  const annualSavings = surplus * 12;
  const savingsRate = p.monthlyIncome > 0 ? ((p.monthlyIncome - p.monthlyExpenses) / p.monthlyIncome) * 100 : 0;
  const progress = fireNum > 0 ? Math.min(100, totalAssets / fireNum * 100) : 0;
  const yearsToTarget = Math.max(1, p.targetRetirementAge - p.age);
  const coastFire = fireNum > 0 && yearsToTarget > 0 ? fireNum / Math.pow(1+r, yearsToTarget) : fireNum;
  let years = 0, v = totalAssets;
  while (v < fireNum && years < 100) { v = v*(1+r)+annualSavings; years++; }
  const fireAge = p.age + years;
  let reqAnnual = 0;
  if (totalAssets < fireNum) {
    const ff = Math.pow(1+r, yearsToTarget);
    const af = (ff-1)/r;
    reqAnnual = (fireNum - totalAssets*ff) / af;
  }
  const shortfall = Math.max(0, reqAnnual/12 - surplus);
  // Projection
  const proj = [], cy = new Date().getFullYear();
  let pv2 = totalAssets;
  for (let y=0; y<=Math.min(years+5,60); y++) {
    proj.push({ year: cy+y, value: Math.round(pv2), fireNumber: Math.round(fireNum) });
    pv2 = pv2*(1+r)+annualSavings;
  }
  return { fireNum, leanFire, fatFire, coastFire, totalAssets, surplus, savingsRate, progress, years, fireAge, shortfall, proj };
}

function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
function pct(n) { return n.toFixed(1)+'%'; }

document.querySelectorAll('#profile-form input, #profile-form textarea').forEach(el => {
  el.addEventListener('input', updateLive);
});

function updateLive() {
  const fd = new FormData(document.getElementById('profile-form'));
  const p = {
    age: +fd.get('age'),
    monthlyIncome: +fd.get('monthlyIncome'),
    monthlyExpenses: +fd.get('monthlyExpenses'),
    currentSavings: +fd.get('currentSavings'),
    stockPortfolio: +fd.get('stockPortfolio'),
    realEstateValue: +fd.get('realEstateValue'),
    mortgageRemaining: +fd.get('mortgageRemaining'),
    monthlyRentalIncome: +fd.get('monthlyRentalIncome'),
    secondPropertyValue: +fd.get('secondPropertyValue') || 0,
    secondPropertyCity: fd.get('secondPropertyCity') || '',
    giftToChildren: +fd.get('giftToChildren') || 0,
    birthYear: +fd.get('birthYear') || 0,
    salaireMoyen: +fd.get('salaireMoyen') || 0,
    agircPoints: +fd.get('agircPoints') || 0,
    agircPointsPerYear: +fd.get('agircPointsPerYear') || 0,
    inheritanceAmount: +fd.get('inheritanceAmount') || 0,
    inheritanceAge: +fd.get('inheritanceAge') || 65,
    targetRetirementAge: +fd.get('targetRetirementAge'),
    monthlyRetirementExpenses: +fd.get('monthlyRetirementExpenses'),
    estimatedReturn: +fd.get('estimatedReturn') / 100,
    inflation: +fd.get('inflation') / 100,
    notes: fd.get('notes'),
    govRetirementAge: +fd.get('govRetirementAge'),
    govMonthlyPension: +fd.get('govMonthlyPension'),
    contributionQuarters: +fd.get('contributionQuarters') || 0,
    militaryServiceQuarters: +fd.get('militaryServiceQuarters') || 0,
    targetContributionYears: +fd.get('targetContributionYears'),
    lifeExpectancy: +fd.get('lifeExpectancy') || 85,
  };
  const c = calcFire(p);
  // Sync lifetime pension table life expectancy input
  const lifeExpInput = document.getElementById('life-exp-input');
  if (lifeExpInput) { lifeExpInput.value = p.lifeExpectancy; renderLifetimePensionTable(); }
  const fc = c.fireAge <= p.targetRetirementAge ? '#27ae60' : c.fireAge <= p.targetRetirementAge+5 ? '#f39c12' : '#e74c3c';
  const pc = c.progress >= 75 ? '#27ae60' : c.progress >= 40 ? '#f39c12' : '#e74c3c';

  document.getElementById('s-fire-number').textContent = '€'+fmt(c.fireNum);
  document.getElementById('s-assets').textContent = '€'+fmt(c.totalAssets);
  document.getElementById('s-years').textContent = c.years;
  document.getElementById('s-years').style.color = fc;
  document.getElementById('s-savings-rate').textContent = pct(c.savingsRate);
  document.getElementById('progress-fill').style.width = Math.min(100, c.progress)+'%';
  document.getElementById('progress-label').textContent = pct(c.progress);
  document.getElementById('progress-label').style.color = pc;
  document.getElementById('coast-label').textContent = 'Coast FIRE €'+fmt(c.coastFire);
  document.getElementById('fire-target-label').textContent = 'FIRE €'+fmt(c.fireNum);
  document.getElementById('lean-fire').textContent = '€'+fmt(c.leanFire);
  document.getElementById('reg-fire').textContent = '€'+fmt(c.fireNum);
  document.getElementById('fat-fire').textContent = '€'+fmt(c.fireNum*1.5);
  document.getElementById('coast-fire').textContent = '€'+fmt(c.coastFire);
  document.getElementById('monthly-surplus').textContent = '€'+fmt(c.surplus);
  document.getElementById('monthly-shortfall').textContent = c.shortfall > 0 ? '€'+fmt(c.shortfall) : 'On track ✓';
  document.getElementById('monthly-shortfall').style.color = c.shortfall > 0 ? 'var(--red)' : 'var(--green)';
  document.getElementById('fire-age').textContent = c.fireAge;
  document.getElementById('fire-age').style.color = fc;
  document.getElementById('net-worth').textContent = '€'+fmt(p.currentSavings+p.stockPortfolio+p.realEstateValue-p.mortgageRemaining);

  // Real estate tab
  document.getElementById('re-value').textContent = '€'+fmt(p.realEstateValue);
  document.getElementById('re-mortgage').textContent = '€'+fmt(p.mortgageRemaining);
  document.getElementById('re-equity').textContent = '€'+fmt(p.realEstateValue-p.mortgageRemaining);
  document.getElementById('re-rental').textContent = '€'+fmt(p.monthlyRentalIncome);
  document.getElementById('re-rental-annual').textContent = '€'+fmt(p.monthlyRentalIncome*12);
  document.getElementById('re-fire-reduction').textContent = '€'+fmt(p.monthlyRentalIncome*12*25);
  if (p.realEstateValue > 0 && p.monthlyRentalIncome > 0) {
    const yield_ = (p.monthlyRentalIncome*12)/p.realEstateValue*100;
    document.getElementById('re-yield').textContent = pct(yield_);
    document.getElementById('re-yield').style.color = yield_ >= 5 ? 'var(--green)' : yield_ >= 3 ? 'var(--fire)' : 'var(--red)';
  } else {
    document.getElementById('re-yield').textContent = 'N/A';
    document.getElementById('re-yield').style.color = 'var(--muted)';
  }

  // Gov retirement tab
  const govPensionAnnual = p.govMonthlyPension * 12;
  const annualRetExp = p.monthlyRetirementExpenses * 12;
  const annualRental2 = p.monthlyRentalIncome * 12;
  const netExpWithPension = Math.max(0, annualRetExp - annualRental2 - govPensionAnnual);
  const fireWithPension = netExpWithPension * 25;
  const govGap = Math.max(0, p.govRetirementAge - p.targetRetirementAge);
  const totalQtrs = (p.contributionQuarters || 0) + (p.militaryServiceQuarters || 0);
  const trimReqLive = c.trimestresRequis || 172;
  const contribPct = trimReqLive > 0 ? Math.min(100, totalQtrs / trimReqLive * 100) : 0;
  const yearsLeft = Math.max(0, trimReqLive - totalQtrs);
  document.getElementById('gov-ret-age').textContent = p.govRetirementAge;
  document.getElementById('gov-monthly-pension').textContent = '€'+fmt(p.govMonthlyPension);
  document.getElementById('gov-annual-pension').textContent = '€'+fmt(govPensionAnnual);
  document.getElementById('gov-contrib-label').textContent = totalQtrs+' / '+trimReqLive+' quarters';
  document.getElementById('gov-contrib-pct').textContent = pct(contribPct);
  document.getElementById('gov-contrib-bar').style.width = Math.min(100,contribPct)+'%';
  document.getElementById('gov-years-left').textContent = yearsLeft;
  document.getElementById('gov-fire-without').textContent = '€'+fmt(c.fireNum);
  document.getElementById('gov-fire-with').textContent = '€'+fmt(fireWithPension);
  document.getElementById('gov-fire-saving').textContent = '€'+fmt(Math.max(0,c.fireNum-fireWithPension));
  document.getElementById('gov-gap').textContent = govGap+' years';
  document.getElementById('gov-gap').style.color = govGap > 10 ? 'var(--red)' : govGap > 5 ? 'var(--fire)' : 'var(--green)';

  projData = c.proj;
  renderProjectionChart();
  renderAllocationChart(p.age);
  renderEtfTable(p.age);
}

// ═══ CHARTS ═══
let projChart, allocChart;

function renderProjectionChart() {
  const el = document.getElementById('chart-projection');
  if (!el || !projData.length) return;
  if (!projChart) projChart = echarts.init(el, 'dark');
  const years = projData.map(d => d.year);
  const vals = projData.map(d => d.value);
  const fire = projData.map(d => d.fireNumber);
  projChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', formatter: p => p[0].axisValue + '<br>' + p.map(s => s.seriesName + ': €' + Math.round(s.value).toLocaleString('en-US')).join('<br>') },
    legend: { data: ['Portfolio', 'FIRE Target'], textStyle: { color: '#8b949e' } },
    xAxis: { type: 'category', data: years, axisLine: { lineStyle: { color: '#30363d' } }, axisLabel: { color: '#8b949e' } },
    yAxis: { type: 'value', axisLabel: { color: '#8b949e', formatter: v => '€'+(v>=1000000?(v/1000000).toFixed(1)+'M':v>=1000?(v/1000).toFixed(0)+'k':v) }, splitLine: { lineStyle: { color: '#21262d' } } },
    series: [
      { name: 'Portfolio', type: 'line', data: vals, smooth: true, areaStyle: { opacity: .15 }, itemStyle: { color: '#27ae60' }, lineStyle: { color: '#27ae60', width: 2 }, symbol: 'none' },
      { name: 'FIRE Target', type: 'line', data: fire, lineStyle: { color: '#f39c12', type: 'dashed', width: 2 }, itemStyle: { color: '#f39c12' }, symbol: 'none' }
    ],
    grid: { left: 60, right: 20, top: 40, bottom: 30 }
  });
}

function getAllocForAge(age) {
  if (age < 35) return [{ name: 'Global Stocks (MSCI World)', value: 70 }, { name: 'Emerging Markets', value: 15 }, { name: 'Bonds', value: 10 }, { name: 'Cash', value: 5 }];
  if (age < 45) return [{ name: 'Global Stocks (MSCI World)', value: 60 }, { name: 'Emerging Markets', value: 10 }, { name: 'Bonds', value: 25 }, { name: 'Cash', value: 5 }];
  if (age < 55) return [{ name: 'Global Stocks (MSCI World)', value: 50 }, { name: 'Emerging Markets', value: 5  }, { name: 'Bonds', value: 35 }, { name: 'Cash', value: 10 }];
  return [{ name: 'Global Stocks (MSCI World)', value: 35 }, { name: 'Emerging Markets', value: 5  }, { name: 'Bonds', value: 45 }, { name: 'Cash', value: 15 }];
}

function renderAllocationChart(age) {
  age = age || profileData.age;
  const el = document.getElementById('chart-allocation');
  if (!el) return;
  if (!allocChart) allocChart = echarts.init(el, 'dark');
  const data = getAllocForAge(age);
  allocChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    color: ['#27ae60','#f39c12','#58a6ff','#8b949e'],
    series: [{ type: 'pie', radius: ['50%','80%'], data, label: { color: '#c9d1d9' }, emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,.5)' } } }]
  });
}

const etfByAge = {
  young: [
    { etf: 'IWDA (iShares MSCI World)', alloc: '60%', type: 'Global Equity' },
    { etf: 'EMIM (iShares Emerging Markets)', alloc: '15%', type: 'Emerging' },
    { etf: 'CSPX (iShares S&P 500)', alloc: '15%', type: 'US Equity' },
    { etf: 'AGGH (iShares Core Global Agg Bond)', alloc: '5%', type: 'Bonds' },
    { etf: 'Cash / Money Market', alloc: '5%', type: 'Cash' },
  ],
  mid: [
    { etf: 'IWDA (iShares MSCI World)', alloc: '50%', type: 'Global Equity' },
    { etf: 'EMIM (iShares Emerging Markets)', alloc: '10%', type: 'Emerging' },
    { etf: 'AGGH (iShares Core Global Agg Bond)', alloc: '25%', type: 'Bonds' },
    { etf: 'IDVY (iShares Euro Dividend)', alloc: '10%', type: 'Dividends' },
    { etf: 'Cash / Money Market', alloc: '5%', type: 'Cash' },
  ],
  late: [
    { etf: 'IWDA (iShares MSCI World)', alloc: '35%', type: 'Global Equity' },
    { etf: 'AGGH (iShares Core Global Agg Bond)', alloc: '40%', type: 'Bonds' },
    { etf: 'IDVY (iShares Euro Dividend)', alloc: '15%', type: 'Dividends' },
    { etf: 'Cash / Money Market', alloc: '10%', type: 'Cash' },
  ],
};

function renderEtfTable(age) {
  age = age || profileData.age;
  const key = age < 40 ? 'young' : age < 50 ? 'mid' : 'late';
  const rows = etfByAge[key];
  const colors = { 'Global Equity': 'badge-green', 'Emerging': 'badge-orange', 'US Equity': 'badge-blue', 'Bonds': 'badge-blue', 'Dividends': 'badge-orange', 'Cash': '' };
  document.getElementById('etf-tbody').innerHTML = rows.map(r =>
    \`<tr><td><strong>\${r.etf}</strong></td><td>\${r.alloc}</td><td><span class="badge \${colors[r.type]||''}">\${r.type}</span></td></tr>\`
  ).join('');
}

// ═══ SAVE ═══
document.getElementById('save-btn').addEventListener('click', async () => {
  const fd = new FormData(document.getElementById('profile-form'));
  const p = Object.fromEntries([...fd.entries()].map(([k,v]) => [k, isNaN(+v)||k==='notes'?v:+v]));
  p.estimatedReturn = (+fd.get('estimatedReturn')) / 100;
  p.stockReturnTax = (+fd.get('stockReturnTax')) / 100 || 0.30;
  p.bridgeReturn = (+fd.get('bridgeReturn')) / 100 || 0.03;
  p.lastGrossSalary = +fd.get('lastGrossSalary') || 85000;
  p.inflation = (+fd.get('inflation')) / 100;
  p.govRetirementAge = +fd.get('govRetirementAge');
  p.govMonthlyPension = +fd.get('govMonthlyPension');
  p.contributionQuarters = +fd.get('contributionQuarters') || 0;
  p.militaryServiceQuarters = +fd.get('militaryServiceQuarters') || 0;
  p.quartersAsOfDate = fd.get('quartersAsOfDate') || '';
  p.lifeExpectancy = +fd.get('lifeExpectancy') || 85;
  try {
    const r = await fetch('/api/save-profile', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) });
    const btn = document.getElementById('save-btn');
    if (r.ok) { btn.textContent = '✓ Saved'; setTimeout(() => btn.textContent = '💾 Save', 2000); }
  } catch(e) { console.error(e); }
});

// ═══ AI ANALYZE ═══
document.getElementById('analyze-btn').addEventListener('click', async () => {
  const fd = new FormData(document.getElementById('profile-form'));
  const p = {};
  for (const [k,v] of fd.entries()) p[k] = isNaN(+v)||k==='notes'?v:+v;
  p.estimatedReturn = (+fd.get('estimatedReturn')) / 100;
  p.stockReturnTax = (+fd.get('stockReturnTax')) / 100 || 0.30;
  p.bridgeReturn = (+fd.get('bridgeReturn')) / 100 || 0.03;
  p.lastGrossSalary = +fd.get('lastGrossSalary') || 85000;
  p.inflation = (+fd.get('inflation')) / 100;
  p.govRetirementAge = +fd.get('govRetirementAge');
  p.govMonthlyPension = +fd.get('govMonthlyPension');
  p.contributionQuarters = +fd.get('contributionQuarters') || 0;
  p.militaryServiceQuarters = +fd.get('militaryServiceQuarters') || 0;
  p.quartersAsOfDate = fd.get('quartersAsOfDate') || '';
  p.targetContributionYears = +fd.get('targetContributionYears');

  const btn = document.getElementById('analyze-btn');
  const status = document.getElementById('analyze-status');
  btn.disabled = true; btn.textContent = '⏳ Analyzing...';
  status.textContent = '🔄 Claude AI is working... this takes 30–90 seconds, please wait.';
  status.style.color = 'var(--fire)';

  // Countdown ticker so user knows it's working
  let elapsed = 0;
  const ticker = setInterval(() => {
    elapsed++;
    status.textContent = \`🔄 Claude AI is working... \${elapsed}s elapsed, please wait.\`;
  }, 1000);

  try {
    const res = await fetch('/api/analyze', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(p) });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    document.getElementById('ai-realism').innerHTML = data.realism || '';
    document.getElementById('ai-fire-plan').innerHTML = data.firePlan || '';
    document.getElementById('ai-stocks').innerHTML = data.stocks || '';
    document.getElementById('ai-real-estate').innerHTML = data.realEstate || '';
    document.getElementById('ai-gov-retirement').innerHTML = data.govRetirement || '';

    // Show AI response zone below the form
    if (data.summary) {
      const zone = document.getElementById('ai-response-zone');
      const text = document.getElementById('ai-response-text');
      const dateEl = document.getElementById('ai-response-date');
      text.innerHTML = data.summary;
      dateEl.textContent = 'Generated: ' + new Date().toLocaleString('en-US');
      zone.style.display = 'block';
      zone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Also update realism tab summary banner
      const banner = document.querySelector('.summary-banner');
      if (banner) { banner.querySelector('.ai-section').innerHTML = data.summary; }
      else {
        const bDiv = document.createElement('div');
        bDiv.className = 'summary-banner';
        bDiv.innerHTML = '<div class="ai-section">'+data.summary+'</div>';
        document.getElementById('tab-realism').prepend(bDiv);
      }
    }

    clearInterval(ticker);
    status.textContent = '✓ Analysis complete (' + elapsed + 's)';
    status.style.color = 'var(--green)';
    setTimeout(() => { status.textContent=''; status.style.color=''; }, 4000);
  } catch(e) {
    clearInterval(ticker);
    status.textContent = '✗ ' + (e.message || 'Error. Check your ANTHROPIC_API_KEY in .env');
    status.style.color = 'var(--red)';
    setTimeout(() => { status.textContent=''; status.style.color=''; }, 6000);
  } finally {
    btn.disabled = false; btn.textContent = '🤖 Analyze with AI';
  }
});

// ═══ SCENARIO FIRE PLAN ═══
async function runFirePlanForScenario() {
  const scenario = document.getElementById('fire-plan-scenario').value;
  const statusEl = document.getElementById('fire-plan-run-status');
  const div = document.getElementById('ai-fire-plan');
  statusEl.textContent = \`⏳ Generating plan for scenario \${scenario}...\`;
  statusEl.style.color = 'var(--fire)';
  let elapsed = 0;
  const ticker = setInterval(() => { elapsed++; statusEl.textContent = \`⏳ Scenario \${scenario} — \${elapsed}s...\`; }, 1000);
  try {
    const res = await fetch('/api/analyze-fire-plan', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ scenario, profile: profileData })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    div.innerHTML = data.firePlan || '';
    clearInterval(ticker);
    statusEl.textContent = \`✓ Done (\${elapsed}s)\`;
    statusEl.style.color = 'var(--green)';
    setTimeout(() => { statusEl.textContent = ''; }, 4000);
  } catch(e) {
    clearInterval(ticker);
    statusEl.textContent = '✗ ' + (e.message || 'Error');
    statusEl.style.color = 'var(--red)';
    setTimeout(() => { statusEl.textContent = ''; }, 6000);
  }
}

// ═══ SAM CALCULATOR ═══
(function initSamCalc() {
  const PASS = {
    1995:22164,1996:22716,1997:23196,1998:29168,1999:30060,2000:30192,2001:30660,2002:31068,
    2003:31068,2004:31068,2005:31068,2006:31548,2007:32184,2008:33276,2009:34308,2010:34620,
    2011:35352,2012:36372,2013:37032,2014:37548,2015:38040,2016:38616,2017:39228,2018:39732,
    2019:40524,2020:41136,2021:41136,2022:41136,2023:43992,2024:46368,2025:47100,
    2026:48042,2027:49003,2028:49983,2029:50983,2030:52002,2031:53042,2032:54103,2033:55185,2034:56289,
  };
  // Pre-filled salary knowledge: last 15 known years (2011-2025) + future years at €85k
  // Pre-filled from info-retraite.fr relevé de carrière (annual gross, multi-employer years summed)
  const KNOWN_SALARY = {
    2002: 0,
    2003: 0,
    2004: 25173,   // RAGE INTERIM (11087 + 7428) + NUTRICIL (6658) + chômage periods
    2005: 56087,   // NUTRICIL FRANCE SA
    2006: 69527,   // NUTRICIL FRANCE SA
    2007: 83470,   // NUTRICIL (51458) + SASTOR FRANCE (32012)
    2008: 55360,   // SASTOR FRANCE
    2009: 39785,   // SASTOR FRANCE (partial + congé)
    2010: 56999,   // SASTOR FRANCE
    2011: 68086,   // SASTOR FRANCE
    2012: 66341,   // SASTOR FRANCE
    2013: 72491,   // SASTOR FRANCE
    2014: 64081,   // SASTOR FRANCE (58659) + DIEEL FRANCE (5422)
    2015: 104802,  // SASTOR FRANCE (1612) + DIEEL FRANCE (103190)
    2016: 75954,   // DIEEL FRANCE
    2017: 69092,   // DIEEL FRANCE
    2018: 90127,   // DIEEL FRANCE
    2019: 79009,   // DIEEL FRANCE
    2020: 84177,   // DIEEL FRANCE (14952) + ABRITH (69225)
    2021: 95025,   // ABRITH
    2022: 99241,   // ABRITH
    2023: 99274,   // ABRITH
    2024: 99382,   // ABRITH
    2025: 103162,  // ABRITH
    // Future years (estimates based on current trajectory at ABRITH)
    2026: 105000, 2027: 105000, 2028: 105000, 2029: 105000,
    2030: 105000, 2031: 105000, 2032: 105000, 2033: 105000, 2034: 105000,
  };

  const birthYear = profileData.birthYear || 1974;
  // Retirement year = birth year + target age (e.g. 1974 + 60 = 2034)
  // Include the retirement year itself (last partial working year still validates quarters)
  const retireYear = birthYear + (profileData.targetRetirementAge || 60);
  const startYear = Math.max(birthYear + 20, 1995); // assume career start at 20

  const rows = [];
  for (let y = startYear; y <= retireYear; y++) {  // inclusive: include retirement year
    rows.push({ year: y, salary: KNOWN_SALARY[y] || 0, pass: PASS[y] || Math.round(56289 * Math.pow(1.02, y - 2034)) });
  }

  function renderSamRows() {
    const capped = rows.map(r => ({ ...r, capped: Math.min(r.salary, r.pass) }));
    const sorted = [...capped].sort((a,b) => b.capped - a.capped);
    const best25Set = new Set(sorted.slice(0, 25).map(r => r.year));
    const best25 = sorted.slice(0, 25);
    const total = best25.reduce((s,r) => s + r.capped, 0);
    const sam = Math.round(total / 25);

    const tbody = document.getElementById('sam-rows');
    if (!tbody) return;
    tbody.innerHTML = rows.map(r => {
      const c = Math.min(r.salary, r.pass);
      const isBest = best25Set.has(r.year);
      const isFuture = r.year >= new Date().getFullYear();
      const bg = isBest ? 'background:rgba(88,214,141,0.10);' : '';
      return \`<tr style="\${bg}">
        <td style="padding:4px 8px;\${isFuture?'color:var(--fire);':''}">\${r.year}\${isFuture?' ✏️':''}</td>
        <td style="padding:4px 8px;color:var(--muted);">\${r.year - birthYear}</td>
        <td style="padding:4px 8px;">
          <input type="number" value="\${r.salary || ''}" min="0" step="1000"
            data-year="\${r.year}"
            style="width:110px;background:transparent;border:1px solid var(--border);border-radius:4px;padding:2px 6px;color:var(--text);font-size:12px;"
            onchange="window._samUpdate(\${r.year}, +this.value)"
            \${isFuture?'style_":"border-color:rgba(255,165,0,0.4);"':''}
          >
        </td>
        <td style="padding:4px 8px;color:var(--muted);">\${r.pass.toLocaleString('fr-FR')}</td>
        <td style="padding:4px 8px;font-weight:\${isBest?'600':'400'};">\${c > 0 ? c.toLocaleString('fr-FR') : '—'}</td>
        <td style="padding:4px 8px;text-align:center;">\${isBest ? '<span style="color:var(--green);">★</span>' : ''}</td>
      </tr>\`;
    }).join('');

    const best25Years = [...best25Set].sort((a,b) => a-b);
    const samEl = document.getElementById('sam-result');
    const totEl = document.getElementById('sam-total');
    const cntEl = document.getElementById('sam-count');
    if (samEl) samEl.textContent = sam > 0 ? '€' + sam.toLocaleString('fr-FR') : '—';
    if (totEl) totEl.textContent = total > 0 ? '€' + total.toLocaleString('fr-FR') : '—';
    if (cntEl) cntEl.textContent = \`Best \${best25.length} years: \${best25Years[0]}–\${best25Years[best25Years.length-1]} (\${best25.length} years × avg PASS = SAM)\`;
  }

  window._samUpdate = function(year, val) {
    const row = rows.find(r => r.year === year);
    if (row) { row.salary = val; renderSamRows(); }
  };

  window.applySam = function() {
    const capped = rows.map(r => Math.min(r.salary, r.pass));
    const sorted = [...capped].sort((a,b) => b-a);
    const sam = Math.round(sorted.slice(0,25).reduce((s,v)=>s+v,0) / 25);
    if (sam <= 0) { alert('Please enter salary data for at least 25 years first.'); return; }
    const input = document.querySelector('[name="salaireMoyen"]');
    if (input) { input.value = sam; input.dispatchEvent(new Event('input')); }
    const btn = document.querySelector('button[onclick="applySam()"]');
    if (btn) { btn.textContent = '✓ Applied!'; setTimeout(() => btn.textContent='✓ Apply this SAM to profile', 2000); }
  };

  // Expand on first click of the Gov Retirement tab
  document.querySelector('[data-tab="gov-retirement"]')?.addEventListener('click', () => {
    setTimeout(() => { if (!document.getElementById('sam-calc-body')._samInit) { renderSamRows(); document.getElementById('sam-calc-body')._samInit = true; } }, 50);
  });

  // Also wire the toggle to re-render when opened
  const title = document.querySelector('#sam-calc-body');
  const observer = new MutationObserver(() => { if (title && title.style.display !== 'none' && !title._samInit) { renderSamRows(); title._samInit = true; } });
  if (title) observer.observe(title, { attributes: true, attributeFilter: ['style'] });
})();

// ═══ LIFETIME PENSION SIMULATION ═══
function renderLifetimePensionTable() {
  const tbody = document.getElementById('lifetime-pension-tbody');
  if (!tbody) return;

  const calc = calcData;
  const profile = profileData;
  const gapYears = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
  const missingQ = calc.missingQuarters || 0;
  const pensionFull = calc.calculatedPension || profile.govMonthlyPension || 0;
  const decoteRaw = Math.min(0.25, missingQ * 0.0125);
  const pensionReduced = Math.round(pensionFull * (1 - decoteRaw));

  const agircMonthly = calc.pensionAgircMonthly || 0;
  const baseMonthly = calc.pensionBaseMonthly || Math.max(0, pensionFull - agircMonthly);

  // Net pension per month taking Agirc solidarity penalty into account
  function monthlyAtAge(monthly, claimAge, ageNow) {
    if (claimAge >= 63 || ageNow >= claimAge + 3) return monthly;
    const penaltyYearsLeft = Math.max(0, 3 - (ageNow - claimAge));
    if (penaltyYearsLeft <= 0) return monthly;
    return baseMonthly + agircMonthly * 0.9; // -10% on Agirc for up to 3 yrs
  }

  // Total net pension received from claimAge to deathAge, minus upfront cost
  function totalNet(monthly, claimAge, upfrontCost, deathAge) {
    if (deathAge <= claimAge) return -upfrontCost;
    let gross = 0;
    for (let age = claimAge; age < deathAge; age++) {
      gross += monthlyAtAge(monthly, claimAge, age) * 12;
    }
    return Math.round(gross - upfrontCost);
  }

  // Rachat: max 12 quarters
  const rachatQ = Math.min(12, missingQ);
  const missingAfterRachat = Math.max(0, missingQ - rachatQ);
  const pensionAfterRachat = Math.round(pensionFull * (1 - Math.min(0.25, missingAfterRachat * 0.0125)));
  const rachatCostGross = rachatQ * 4500;
  const rachatCostNet = Math.round(rachatCostGross * 0.70);

  // CVV: bridge years × 4 quarters — cost determined by last gross salary vs PASS 2026
  const cvvQ = gapYears * 4;
  const missingAfterCVV = Math.max(0, missingQ - cvvQ);
  const pensionAfterCVV = Math.round(pensionFull * (1 - Math.min(0.25, missingAfterCVV * 0.0125)));
  const PASS_2026 = 48060;
  const lastGrossSalary = profile.lastGrossSalary || 85000;
  const passRatio = lastGrossSalary / PASS_2026;
  const cvvAnnualCost = passRatio >= 1.0 ? 8632 : passRatio >= 0.75 ? 6474 : passRatio >= 0.50 ? 4316 : 2160;
  const cvvBracket = passRatio >= 1.0 ? 1 : passRatio >= 0.75 ? 2 : passRatio >= 0.50 ? 3 : 4;
  const cvvTMI = lastGrossSalary > 118817 ? 0.41 : lastGrossSalary > 41554 ? 0.30 : 0.11;
  const cvvCostTotal = Math.round(gapYears * cvvAnnualCost);
  const cvvCostNet = Math.round(cvvCostTotal * (1 - cvvTMI));

  // Combined B+C
  const missingAfterBoth = Math.max(0, missingQ - rachatQ - cvvQ);
  const pensionAfterBoth = Math.round(pensionFull * (1 - Math.min(0.25, missingAfterBoth * 0.0125)));
  const bothCostNet = rachatCostNet + cvvCostTotal;

  // Scenario E: wait until 67 — taux plein automatique, extra 2yr bridge cost
  const wait67ExtraCost = (profile.monthlyRetirementExpenses || 0) * 24;

  // Scenarios G & H: comparison — what if you worked until 65 or 67?
  const trimReqs = calc.trimestresRequis || 172;
  const calcQuarters = calc.quartersAtRetirement || 0;
  const propBase = Math.max(1, Math.min(calcQuarters, trimReqs)); // effective quarters at retirement
  const pensionFullCNAV_base = baseMonthly > 0 ? (baseMonthly / (1 - decoteRaw)) : 0; // CNAV with no rate décote, at current proportion

  const yearsTo65 = Math.max(0, 65 - (profile.targetRetirementAge || 60));
  const yearsTo67 = Math.max(0, 67 - (profile.targetRetirementAge || 60));
  const quartersAt65 = Math.min(calcQuarters + yearsTo65 * 4, trimReqs);
  const quartersAt67 = Math.min(calcQuarters + yearsTo67 * 4, trimReqs);
  const agircPerYrMo = ((profile.agircPointsPerYear || 0) * 1.4801) / 12;

  const pensionG_CNAV = Math.round(pensionFullCNAV_base * quartersAt65 / propBase);
  const pensionG_Agirc = agircMonthly + Math.round(agircPerYrMo * yearsTo65);
  const pensionG = pensionG_CNAV + pensionG_Agirc; // work until 65, claim at 67 (taux plein auto)

  const pensionH_CNAV = Math.round(pensionFullCNAV_base * quartersAt67 / propBase);
  const pensionH_Agirc = agircMonthly + Math.round(agircPerYrMo * yearsTo67);
  const pensionH = pensionH_CNAV + pensionH_Agirc; // work until 67, claim at 67 (taux plein auto)

  // Scenario F: CVV during bridge (C) + claim at 67 (taux plein automatique)
  // Key insight: at 67, décote RATE = 0% guaranteed regardless of quarters.
  // BUT the CNAV proportion (quarters/trimestresRequis) still applies to the base pension.
  // Agirc is unaffected by missing quarters — it's points-based.
  // So: CNAV = baseMonthly × (min(cvvQuarters, trimRequis)/trimRequis), Agirc unchanged.
  const agircMonthlyF = agircMonthly; // same Agirc — no new points after retirement
  const qtrsWithCvv = Math.min(calc.quartersAtRetirement + cvvQ, calc.trimestresRequis || 172);
  const baseMonthlyF = Math.round(baseMonthly * (qtrsWithCvv / (calc.trimestresRequis || 172)) / (Math.min(calc.quartersAtRetirement, calc.trimestresRequis || 172) / (calc.trimestresRequis || 172)));
  // Simpler: base at taux plein auto = pensionBaseMonthly corrected for proportion only (no rate décote)
  const pensionF = Math.round(
    (baseMonthly > 0
      ? (baseMonthly / (1 - decoteRaw)) * (qtrsWithCvv / (calc.trimestresRequis || 172))  // undo décote on rate, apply proportion
      : 0)
    + agircMonthlyF
  );
  // Cost = CVV only (bridge 60-67 already planned — no extra 2yr cost vs base plan)
  const scenFCost = cvvCostTotal;

  function breakEvenAge(sPension, sCost, sClaimAge) {
    if (sPension <= pensionReduced && sClaimAge <= profile.govRetirementAge) return '—';
    for (let age = Math.max(sClaimAge, profile.govRetirementAge); age <= 110; age++) {
      const tS = totalNet(sPension, sClaimAge, sCost, age);
      const tA = totalNet(pensionReduced, profile.govRetirementAge, 0, age);
      if (tS >= tA) return age;
    }
    return '>110';
  }

  const AGES = [75, 80, 85, 90, 95];
  const fmt2 = n => (n < 0 ? '-€' : '€') + Math.abs(Math.round(n)).toLocaleString('fr-FR');

  const scenarios = [
    { label: 'A — Do nothing', pension: pensionReduced, claimAge: profile.govRetirementAge, cost: 0,
      color: 'var(--muted)', decote: \`\${(decoteRaw*100).toFixed(1)}%\`, tag: '',
      note: \`CNAV: SAM(€\${(profile.salaireMoyen||0).toLocaleString('fr-FR')}/yr) ÷ 12 × 50% × \${calcQuarters}/\${trimReqs} qtrs × (1−\${(decoteRaw*100).toFixed(0)}% décote) = €\${Math.round(baseMonthly).toLocaleString('fr-FR')}/mo<br>+ Agirc: €\${Math.round(agircMonthly).toLocaleString('fr-FR')}/mo · ⚠ both gross — deduct ~30% income tax for net\` },
    { label: 'B — Rachat 12 quarters (before age 60)', pension: pensionAfterRachat, claimAge: profile.govRetirementAge,
      cost: rachatCostNet, color: '#bc8cff',
      decote: \`\${(Math.min(0.25,missingAfterRachat*0.0125)*100).toFixed(1)}%\`, tag: rachatQ < missingQ ? '' : '✓ taux plein',
      note: \`Buying \${rachatQ} qtrs cuts décote \${(decoteRaw*100).toFixed(0)}%→\${(Math.min(0.25,missingAfterRachat*0.0125)*100).toFixed(0)}%<br>CNAV: €\${Math.round(pensionAfterRachat-agircMonthly).toLocaleString('fr-FR')}/mo + Agirc: €\${Math.round(agircMonthly).toLocaleString('fr-FR')}/mo · ⚠ gross · Net cost = rachat cost × (1−30% tax)\` },
    { label: \`C — CVV \${gapYears} yrs × 4 = \${cvvQ} quarters\`, pension: pensionAfterCVV, claimAge: profile.govRetirementAge,
      cost: cvvCostTotal, color: '#58a6ff',
      decote: \`\${(Math.min(0.25,missingAfterCVV*0.0125)*100).toFixed(1)}%\`, tag: missingAfterCVV === 0 ? '✓ taux plein' : \`\${missingAfterCVV} qtrs short\`,
      note: \`CVV credits \${cvvQ} qtrs (\${gapYears} yrs × 4), décote \${(decoteRaw*100).toFixed(0)}%→\${(Math.min(0.25,missingAfterCVV*0.0125)*100).toFixed(0)}%<br>CNAV: €\${Math.round(pensionAfterCVV-agircMonthly).toLocaleString('fr-FR')}/mo + Agirc: €\${Math.round(agircMonthly).toLocaleString('fr-FR')}/mo · ⚠ gross · CVV cost = Cat.\${cvvBracket} €\${cvvAnnualCost.toLocaleString('fr-FR')}/yr × \${gapYears} yrs (tax-deductible)\` },
    { label: 'D — Rachat + CVV combined', pension: pensionAfterBoth, claimAge: profile.govRetirementAge,
      cost: bothCostNet, color: 'var(--green)',
      decote: \`\${(Math.min(0.25,missingAfterBoth*0.0125)*100).toFixed(1)}%\`, tag: missingAfterBoth === 0 ? '✓ TAUX PLEIN' : \`\${missingAfterBoth} qtrs short\`,
      note: \`Rachat \${rachatQ} qtrs + CVV \${cvvQ} qtrs → décote \${(Math.min(0.25,missingAfterBoth*0.0125)*100).toFixed(0)}%\${missingAfterBoth===0?' (taux plein ✓)':''}<br>CNAV: €\${Math.round(pensionAfterBoth-agircMonthly).toLocaleString('fr-FR')}/mo + Agirc: €\${Math.round(agircMonthly).toLocaleString('fr-FR')}/mo · ⚠ gross · Cost = rachat net + CVV gross\` },
    { label: 'E — Wait until 67 (taux plein automatique)', pension: pensionFull, claimAge: 67,
      cost: wait67ExtraCost, color: 'var(--fire)',
      decote: '0%', tag: '✓ TAUX PLEIN',
      note: \`Taux plein automatique at 67 regardless of quarters — no décote ever<br>CNAV: €\${Math.round(pensionFull-agircMonthly).toLocaleString('fr-FR')}/mo + Agirc: €\${Math.round(agircMonthly).toLocaleString('fr-FR')}/mo · ⚠ gross<br>Extra bridge cost: €\${(profile.monthlyRetirementExpenses||0).toLocaleString('fr-FR')}/mo × 24 mo (age 65→67) = €\${Math.round(wait67ExtraCost).toLocaleString('fr-FR')}\` },
    { label: \`F — CVV Cat.\${cvvBracket} (\${gapYears} yrs) + claim CNAV+Agirc at 67\`, pension: pensionF, claimAge: 67,
      cost: scenFCost, color: '#f39c12',
      decote: '0% (auto)', tag: \`✓ ~taux plein · €\${cvvAnnualCost.toLocaleString('fr-FR')}/yr × \${gapYears} = €\${cvvCostTotal.toLocaleString('fr-FR')} gross · ~€\${cvvCostNet.toLocaleString('fr-FR')} net after \${Math.round(cvvTMI*100)}% tax\`,
      note: \`CVV \${cvvQ} qtrs → taux plein · claim CNAV+Agirc together at 67 (liquidation globale)<br>CNAV: €\${Math.round(pensionF-agircMonthly).toLocaleString('fr-FR')}/mo + Agirc: €\${Math.round(agircMonthly).toLocaleString('fr-FR')}/mo (frozen at age 60 stop) · ⚠ gross<br>CVV cost: Cat.\${cvvBracket} €\${cvvAnnualCost.toLocaleString('fr-FR')}/yr × \${gapYears} yrs = €\${cvvCostTotal.toLocaleString('fr-FR')} gross (~€\${cvvCostNet.toLocaleString('fr-FR')} net after \${Math.round(cvvTMI*100)}% tax)\` },
    { label: \`G — ★ Comparison: work until 65 (\${yearsTo65} more yrs), claim at 67\`, pension: pensionG, claimAge: 67,
      cost: 0, color: '#95a5a6',
      decote: '0% (auto)', tag: \`\${quartersAt65}/\${trimReqs} qtrs · Agirc: \${Math.round(pensionG_Agirc)}/mo (+\${Math.round(agircPerYrMo*yearsTo65)}/mo vs stopping at 60) · no bridge investment needed\`,
      note: \`Work \${yearsTo65} more yrs to 65, claim at 67 · \${quartersAt65}/\${trimReqs} qtrs (no décote at 67)<br>CNAV: €\${Math.round(pensionG_CNAV).toLocaleString('fr-FR')}/mo + Agirc: €\${Math.round(pensionG_Agirc).toLocaleString('fr-FR')}/mo (\${yearsTo65} extra yrs' points vs stopping at 60) · ⚠ gross · No bridge cost\` },
    { label: \`H — ★ Comparison: work until 67 (\${yearsTo67} more yrs), claim at 67\`, pension: pensionH, claimAge: 67,
      cost: 0, color: '#7f8c8d',
      decote: '0% (auto)', tag: \`\${quartersAt67}/\${trimReqs} qtrs · Agirc: \${Math.round(pensionH_Agirc)}/mo (+\${Math.round(agircPerYrMo*yearsTo67)}/mo vs stopping at 60) · no bridge period at all\`,
      note: \`Work \${yearsTo67} more yrs to 67, claim at 67 · \${quartersAt67}/\${trimReqs} qtrs (no décote at 67)<br>CNAV: €\${Math.round(pensionH_CNAV).toLocaleString('fr-FR')}/mo + Agirc: €\${Math.round(pensionH_Agirc).toLocaleString('fr-FR')}/mo (\${yearsTo67} extra yrs' points vs stopping at 60) · ⚠ gross · No bridge period\` },
  ];

  // Find best scenario per age column (highest net total)
  const best = AGES.map(age => {
    let maxVal = -Infinity, bestIdx = 0;
    scenarios.forEach((s, i) => { const v = totalNet(s.pension, s.claimAge, s.cost, age); if (v > maxVal) { maxVal = v; bestIdx = i; } });
    return bestIdx;
  });

  tbody.innerHTML = scenarios.map((s, i) => {
    const be = i === 0 ? '—' : breakEvenAge(s.pension, s.cost, s.claimAge);
    const cells = AGES.map((age, ai) => {
      const v = totalNet(s.pension, s.claimAge, s.cost, age);
      const isBest = best[ai] === i;
      return \`<td style="padding:5px 10px;text-align:right;\${isBest?'color:var(--green);font-weight:700;background:rgba(88,214,141,0.08);':''}">\${fmt2(v)}</td>\`;
    }).join('');
    return \`<tr>
      <td style="padding:5px 10px;color:\${s.color};font-weight:600;">\${s.label}<br><span style="font-size:11px;color:var(--muted);">décote \${s.decote} \${s.tag?'— <strong style=\\"color:var(--green);\\">' + s.tag + '</strong>':''}</span></td>
      <td style="padding:5px 10px;text-align:right;white-space:nowrap;">€\${Math.round(s.pension).toLocaleString('fr-FR')}/mo</td>
      <td style="padding:5px 10px;text-align:right;">\${s.claimAge}</td>
      <td style="padding:5px 10px;text-align:right;color:var(--red);">\${s.cost > 0 ? fmt2(s.cost) : '—'}</td>
      \${cells}
      <td style="padding:5px 10px;text-align:right;color:\${be==='—'?'var(--muted)':'var(--fire)'};">\${be==='—'?'—':'age '+be}</td>
      <td style="padding:5px 10px;font-size:11px;color:var(--muted);line-height:1.6;">\${s.note||''}</td>
    </tr>\`;
  }).join('');

  // ── Strategy analysis ─────────────────────────────────────────────────────
  const analysisEl = document.getElementById('pension-strategy-analysis');
  if (!analysisEl) return;

  const capHit = decoteRaw >= 0.25;
  const cvvAloneReachesTP = missingAfterCVV === 0;
  const combinedReachesTP = missingAfterBoth === 0;
  const bestAt85 = scenarios[best[2]].label;
  const gainCvvVsA = pensionAfterCVV - pensionReduced;
  const gainBothVsA = pensionAfterBoth - pensionReduced;
  const gainFullVsA = pensionFull - pensionReduced;

  analysisEl.innerHTML = \`
  <div style="border-top:1px solid var(--border);padding-top:20px;">
    <div style="font-size:16px;font-weight:700;color:var(--fire);margin-bottom:16px;">🎯 Strategic Analysis & Action Plan</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:16px;">
        <div style="font-weight:700;color:var(--text);margin-bottom:10px;">📌 Your Situation at Retirement (age \${profile.targetRetirementAge})</div>
        <table style="width:100%;font-size:13px;border-collapse:collapse;">
          <tr><td style="padding:3px 0;color:var(--muted);">Quarters validated</td><td style="padding:3px 0;font-weight:600;">\${calc.quartersAtRetirement} / \${calc.trimestresRequis} required</td></tr>
          <tr><td style="padding:3px 0;color:var(--muted);">Missing quarters</td><td style="padding:3px 0;font-weight:600;color:var(--red);">\${missingQ} quarters</td></tr>
          <tr><td style="padding:3px 0;color:var(--muted);">Décote applied</td><td style="padding:3px 0;font-weight:600;color:var(--red);">\${capHit ? '25% (MAX CAP HIT)' : (decoteRaw*100).toFixed(1)+'%'}</td></tr>
          <tr><td style="padding:3px 0;color:var(--muted);">Full pension (taux plein)</td><td style="padding:3px 0;font-weight:600;color:var(--green);">€\${Math.round(pensionFull).toLocaleString('fr-FR')}/month</td></tr>
          <tr><td style="padding:3px 0;color:var(--muted);">Pension with décote (do nothing)</td><td style="padding:3px 0;font-weight:600;color:var(--red);">€\${Math.round(pensionReduced).toLocaleString('fr-FR')}/month</td></tr>
          <tr><td style="padding:3px 0;color:var(--muted);">Monthly loss vs taux plein</td><td style="padding:3px 0;font-weight:700;color:var(--red);">−€\${Math.round(gainFullVsA).toLocaleString('fr-FR')}/month for life</td></tr>
        </table>
      </div>
      <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:16px;">
        <div style="font-weight:700;color:var(--text);margin-bottom:10px;">💡 Key Insight</div>
        <p style="font-size:13px;color:var(--text);line-height:1.7;margin:0;">
          \${capHit
            ? \`<strong style="color:var(--red);">You have hit the 25% maximum décote cap.</strong> This means doing nothing costs you <strong>€\${Math.round(gainFullVsA).toLocaleString('fr-FR')}/month for life</strong>. Even buying back 1 quarter won't help until you reduce below 20 missing quarters.\`
            : \`You are \${missingQ} quarters short with a \${(decoteRaw*100).toFixed(1)}% décote. Every quarter you recover increases your pension by €\${Math.round(gainFullVsA/missingQ).toLocaleString('fr-FR')}/month.\`}
          <br><br>
          \${cvvAloneReachesTP
            ? \`<strong style="color:var(--green);">✓ CVV alone (Scenario C) achieves TAUX PLEIN</strong> — \${cvvQ} quarters from \${gapYears} bridge years wipes out all missing quarters at a total cost of only €\${cvvCostTotal.toLocaleString('fr-FR')}. This is your best value strategy.\`
            : \`CVV alone (Scenario C) reduces your missing quarters from \${missingQ} to \${missingAfterCVV}, saving €\${gainCvvVsA.toLocaleString('fr-FR')}/month. Combining with Rachat \${combinedReachesTP ? 'achieves TAUX PLEIN' : 'further improves your pension'}.\`}
        </p>
      </div>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px;">
      <div style="font-weight:700;color:var(--text);margin-bottom:12px;">📋 Scenario-by-Scenario Analysis</div>
      <div style="display:flex;flex-direction:column;gap:12px;font-size:13px;">
        <div style="padding:10px;border-left:3px solid var(--muted);background:rgba(255,255,255,0.02);">
          <strong style="color:var(--muted);">A — Do Nothing:</strong> Pension of €\${Math.round(pensionReduced).toLocaleString('fr-FR')}/month from age \${profile.govRetirementAge}.
          Over 20 years (age \${profile.govRetirementAge + 20}): €\${Math.round(pensionReduced*12*20).toLocaleString('fr-FR')} total. This is your <em>baseline</em> — every euro of cost in other scenarios must be judged against this.
        </div>
        <div style="padding:10px;border-left:3px solid #bc8cff;background:rgba(188,140,255,0.04);">
          <strong style="color:#bc8cff;">B — Rachat de Trimestres (12 quarters):</strong> One-time cost ~€\${rachatCostGross.toLocaleString('fr-FR')} gross (€\${rachatCostNet.toLocaleString('fr-FR')} net after 30% tax deduction).
          Reduces missing from \${missingQ} → \${missingAfterRachat} quarters. Monthly gain: +€\${Math.round(pensionAfterRachat-pensionReduced).toLocaleString('fr-FR')}/month.
          Break-even vs doing nothing: age \${typeof breakEvenAge(pensionAfterRachat, rachatCostNet, profile.govRetirementAge) === 'number' ? breakEvenAge(pensionAfterRachat, rachatCostNet, profile.govRetirementAge) : '>110'}.
          <br><em style="color:var(--muted);">⚠️ Must apply to CNAV before you retire. Request a free "chiffrage" (quote) online at info-retraite.fr → rachat de trimestres.</em>
        </div>
        <div style="padding:10px;border-left:3px solid #58a6ff;background:rgba(88,166,255,0.04);">
          <strong style="color:#58a6ff;">C — CVV during bridge period (\${gapYears} years):</strong> Pay €\${cvvAnnualCost.toLocaleString('fr-FR')}/year (Category \${cvvBracket} based on your last salary €\${(profile.lastGrossSalary||85000).toLocaleString('fr-FR')}) — total €\${cvvCostTotal.toLocaleString('fr-FR')} gross / ~€\${cvvCostNet.toLocaleString('fr-FR')} net over \${gapYears} years.
          Earns 4 quarters/year = \${cvvQ} quarters total. Missing: \${missingQ} → \${missingAfterCVV}. Monthly gain: +€\${Math.round(pensionAfterCVV-pensionReduced).toLocaleString('fr-FR')}/month.
          \${cvvAloneReachesTP ? '<strong style="color:var(--green);">This alone achieves TAUX PLEIN — exceptional ROI.</strong>' : ''}
          <br><em style="color:var(--muted);">⚠️ Enroll within 6 months of stopping work (age 60). File form <strong>S1101</strong> at your CPAM immediately after retirement.</em>
        </div>
        <div style="padding:10px;border-left:3px solid var(--green);background:rgba(88,214,141,0.04);">
          <strong style="color:var(--green);">D — Rachat + CVV combined:</strong> Total net cost €\${bothCostNet.toLocaleString('fr-FR')}.
          Missing: \${missingQ} → \${missingAfterBoth}. \${combinedReachesTP ? '<strong style="color:var(--green);">TAUX PLEIN achieved.</strong>' : \`\${missingAfterBoth} quarters still short.\`}
          Monthly pension: €\${Math.round(pensionAfterBoth).toLocaleString('fr-FR')}/month (+€\${Math.round(pensionAfterBoth-pensionReduced).toLocaleString('fr-FR')} vs doing nothing).
          <br><em style="color:var(--muted);">Best of both worlds — but requires action on two fronts (CNAV for rachat + CPAM for CVV).</em>
        </div>
        <div style="padding:10px;border-left:3px solid var(--fire);background:rgba(243,156,18,0.04);">
          <strong style="color:var(--fire);">E — Wait until 67 (taux plein automatique):</strong> Zero cost to get full pension — guaranteed by law regardless of quarters.
          But requires funding 2 extra bridge years beyond your plan: ~€\${wait67ExtraCost.toLocaleString('fr-FR')} additional capital needed.
          Pension: €\${Math.round(pensionFull).toLocaleString('fr-FR')}/month from age 67.
          <br><em style="color:var(--muted);">Simple, free, and risk-free — but you give up pension income from age 65–67 and need more capital.</em>
        </div>
        <div style="padding:10px;border-left:3px solid #f39c12;background:rgba(243,156,18,0.06);">
          <strong style="color:#f39c12;">F — CVV Category \${cvvBracket} during bridge + claim CNAV + Agirc simultaneously at 67 (taux plein automatique):</strong>
          The <strong>★ chosen strategy</strong>. Pay CVV at Category \${cvvBracket} (€\${cvvAnnualCost.toLocaleString('fr-FR')}/yr × \${gapYears} yrs = <strong>€\${cvvCostTotal.toLocaleString('fr-FR')} gross</strong> / ~<strong>€\${cvvCostNet.toLocaleString('fr-FR')} net</strong> after \${Math.round(cvvTMI*100)}% tax deduction) during your bridge period.
          At 67: taux plein is <em>automatic</em> (0% décote, guaranteed by law). CVV improves your CNAV proportion slightly (from \${calc.quartersAtRetirement} → \${Math.min(calc.quartersAtRetirement + cvvQ, calc.trimestresRequis||172)}/\${calc.trimestresRequis||172} quarters).
          <strong>⚠️ Important:</strong> In France, CNAV and Agirc-Arrco must be claimed <em>simultaneously</em> ("liquidation globale") — you cannot claim one without the other. Both start at 67.
          Estimated pension from 67: <strong>~€\${Math.round(pensionF).toLocaleString('fr-FR')}/month</strong> (CNAV + Agirc). No rachat needed — saves €\${rachatCostNet.toLocaleString('fr-FR')} vs Scenario B.
          <br><em style="color:var(--muted);">⚠️ Enroll CVV within 6 months of retiring (form <strong>S1101</strong> at CPAM). Bridge period age 60–67: full €\${(profile.monthlyRetirementExpenses||0).toLocaleString('fr-FR')}/month from capital (no pension income until 67).</em>
        </div>
      </div>
    </div>

    <div style="background:rgba(88,214,141,0.06);border:1px solid rgba(88,214,141,0.3);border-radius:10px;padding:16px;margin-bottom:16px;">
      <div style="font-weight:700;color:var(--green);margin-bottom:10px;">⏰ Action Timeline — What to Do & When</div>
      <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="background:var(--fire);color:#000;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">1</span>
          <div><strong style="color:var(--text);">NOW (age \${profile.age || 51}) — Request rachat quote (free & non-binding):</strong><br>
          Go to <em>info-retraite.fr → Mon compte → Racheter des trimestres</em> and request a "chiffrage officiel". You have until the day you retire to pay, but costs rise each year. Locking in a quote now protects you from price increases. Budget ~€\${rachatCostGross.toLocaleString('fr-FR')} gross / €\${rachatCostNet.toLocaleString('fr-FR')} net.</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="background:var(--fire);color:#000;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">2</span>
          <div><strong style="color:var(--text);">Before age 60 (before retiring) — Pay rachat if choosing B or D:</strong><br>
          Pay the full amount (ideally in the same tax year where your income is still high — maximises the 30% deduction). Declare on your <em>déclaration de revenus</em> as charges déductibles.</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="background:var(--fire);color:#000;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">3</span>
          <div><strong style="color:var(--text);">Within 6 months of retiring (age 60) — Enroll in CVV if choosing C or D:</strong><br>
          File form <strong>S1101</strong> (Cerfa n°59941) with your CPAM. <strong style="color:var(--red);">This is a hard deadline — missing it means losing all CVV quarters.</strong> Cost: ~€2,160/yr minimum (Category 4, 25% PASS) up to ~€8,632/yr (Category 1). Contributions are fully tax-deductible. Pay quarterly via Urssaf.</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="background:var(--fire);color:#000;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">4</span>
          <div><strong style="color:var(--text);">Age \${profile.govRetirementAge} — Claim CNAV + Agirc-Arrco simultaneously (mandatory):</strong><br>
          <strong style="color:var(--red);">⚠️ In France, CNAV and Agirc-Arrco must be claimed at the same time</strong> ("liquidation globale et simultanée" — rule since 2015). You cannot claim one without the other.
          File a single claim at <em>info-retraite.fr → Demander ma retraite</em> 4–6 months before age \${profile.govRetirementAge}.
          At \${profile.govRetirementAge}, taux plein is <em>automatic</em> (guaranteed by law) — no décote on CNAV regardless of missing quarters.
          ✅ The Agirc-Arrco solidarity malus was <strong>abolished Dec 1, 2023</strong> — no reduction for any claim timing.
          Combined pension from \${profile.govRetirementAge}: ~€\${agircMonthly.toLocaleString('fr-FR')}/month Agirc + CNAV = total ~€\${Math.round(pensionFull).toLocaleString('fr-FR')}/month.</div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="background:#58a6ff;color:#000;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">5</span>
          <div><strong style="color:var(--text);">6–12 months before age \${profile.govRetirementAge} — Prepare pension claim:</strong><br>
          Request your <em>relevé de carrière complet</em> from info-retraite.fr to verify all CVV quarters are registered. Contact CNAV/CARSAT to confirm your trimestresRequis and estimated pension amount before filing. Your claim takes effect the month after submission.</div>
        </div>
      </div>
    </div>

    <div style="background:rgba(255,165,0,0.06);border:1px solid rgba(255,165,0,0.3);border-radius:8px;padding:14px;font-size:13px;">
      <strong style="color:var(--fire);">📊 Bottom Line — Best strategy at age 85 (median life expectancy):</strong>
      <span style="color:var(--text);"> <strong>\${bestAt85}</strong> gives the highest net lifetime pension if you live to 85.
      The table above shows exactly when each strategy becomes the winner — use it to calibrate against your own life expectancy assumptions.</span>
    </div>
  </div>
  \`;
}

// ═══ INIT ═══
renderProjectionChart();
renderAllocationChart();
renderEtfTable();
setTimeout(renderLifetimePensionTable, 100);
</script>
</body>
</html>`;
}
