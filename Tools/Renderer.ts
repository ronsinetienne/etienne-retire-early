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
          <label>Expected Annual Return %</label>
          <input type="number" name="estimatedReturn" value="${(profile.estimatedReturn * 100).toFixed(1)}" step="0.1" min="0" max="20">
        </div>
        <div class="form-group">
          <label>Inflation %</label>
          <input type="number" name="inflation" value="${(profile.inflation * 100).toFixed(1)}" step="0.1" min="0" max="10">
        </div>

        <div class="form-group">
          <label>Legal Retirement Age</label>
          <input type="number" name="govRetirementAge" value="${profile.govRetirementAge}" min="50" max="75">
        </div>
        <div class="form-group">
          <label>Estimated Monthly State Pension ${currency}</label>
          <div class="input-prefix"><span>${currency}</span><input type="number" name="govMonthlyPension" value="${profile.govMonthlyPension}" min="0"></div>
        </div>
        <div class="form-group">
          <label>Contribution Years (so far)</label>
          <input type="number" name="contributionYears" value="${profile.contributionYears}" min="0" max="50">
        </div>
        <div class="form-group">
          <label>Years Required for Full Pension</label>
          <input type="number" name="targetContributionYears" value="${profile.targetContributionYears}" min="1" max="50">
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
          <div class="input-prefix"><span>${currency}</span><input type="number" name="salaireMoyen" value="${profile.salaireMoyen || 0}" min="0" placeholder="e.g. 45000"></div>
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
    <div class="card">
      <div class="card-title">🤖 AI Action Plan</div>
      <div class="ai-section" id="ai-fire-plan">${analysis?.firePlan || '<p style="color:var(--muted);">Click "Analyze with AI" above to get a personalized FIRE plan.</p>'}</div>
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
            <span style="font-size:13px;" id="gov-contrib-label">${profile.contributionYears} / ${profile.targetContributionYears} years</span>
            <span style="color:var(--fire);font-weight:700;" id="gov-contrib-pct">${pct(calc.contributionProgress)}</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" id="gov-contrib-bar" style="width:${Math.min(100, calc.contributionProgress)}%;background:linear-gradient(90deg,#58a6ff,#bc8cff);"></div>
          </div>
        </div>
        <div class="metric">
          <span class="label">Remaining years for full pension</span>
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
    contributionYears: +fd.get('contributionYears'),
    targetContributionYears: +fd.get('targetContributionYears'),
  };
  const c = calcFire(p);
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
  const contribPct = p.targetContributionYears > 0 ? Math.min(100, p.contributionYears / p.targetContributionYears * 100) : 0;
  const yearsLeft = Math.max(0, p.targetContributionYears - p.contributionYears);
  document.getElementById('gov-ret-age').textContent = p.govRetirementAge;
  document.getElementById('gov-monthly-pension').textContent = '€'+fmt(p.govMonthlyPension);
  document.getElementById('gov-annual-pension').textContent = '€'+fmt(govPensionAnnual);
  document.getElementById('gov-contrib-label').textContent = p.contributionYears+' / '+p.targetContributionYears+' years';
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
  p.inflation = (+fd.get('inflation')) / 100;
  p.govRetirementAge = +fd.get('govRetirementAge');
  p.govMonthlyPension = +fd.get('govMonthlyPension');
  p.contributionYears = +fd.get('contributionYears');
  p.targetContributionYears = +fd.get('targetContributionYears');
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
  p.inflation = (+fd.get('inflation')) / 100;
  p.govRetirementAge = +fd.get('govRetirementAge');
  p.govMonthlyPension = +fd.get('govMonthlyPension');
  p.contributionYears = +fd.get('contributionYears');
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

// ═══ INIT ═══
renderProjectionChart();
renderAllocationChart();
renderEtfTable();
</script>
</body>
</html>`;
}
