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
          <label>Estimated Age at Death</label>
          <input type="number" name="lifeExpectancy" value="${(profile as any).lifeExpectancy || 85}" min="67" max="110">
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
          <div style="font-weight:700;color:#58a6ff;margin-bottom:10px;font-size:15px;">⏱️ CVV — Assurance Volontaire Vieillesse (Form S3705)</div>
          <table style="width:100%;font-size:13px;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:var(--muted);width:50%;">Max quarters / year</td><td style="padding:4px 0;font-weight:600;color:var(--text);">4 quarters per calendar year</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Total limit</td><td style="padding:4px 0;color:var(--green);font-weight:600;">No fixed cap — limited only by how long you contribute (e.g. 7 yrs bridge → max 28 quarters)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Annual cost (2024)</td><td style="padding:4px 0;color:var(--text);">~€1,500–3,400/yr (based on declared income)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Eligibility</td><td style="padding:4px 0;color:var(--text);">Anyone who stopped working (early retirees, stay-at-home, expats)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Effect on pension</td><td style="padding:4px 0;color:var(--text);">Adds quarters to retraite de base <strong>only</strong> — does NOT add Agirc-Arrco points</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Tax deduction</td><td style="padding:4px 0;color:var(--text);">Partially deductible (CSG deductible portion ~5.1%)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Solidarity coeff.</td><td style="padding:4px 0;color:var(--red);">Agirc-Arrco applies −10% penalty for 3 years if pension claimed before age 63</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Deadline</td><td style="padding:4px 0;color:var(--fire);font-weight:600;">Must enroll within 6 months of stopping work (form S3705 to CPAM)</td></tr>
            <tr><td style="padding:4px 0;color:var(--muted);">Where to apply</td><td style="padding:4px 0;color:var(--text);">CPAM (Caisse d'Assurance Maladie) — form S3705</td></tr>
          </table>
          <div style="margin-top:10px;padding:8px;background:rgba(88,166,255,0.1);border-radius:6px;font-size:12px;color:#58a6ff;">
            💡 <strong>Key difference vs Rachat:</strong> CVV is paid year-by-year during your bridge period (cheap and flexible). Rachat is a one-time lump sum before retiring (expensive but immediate). Both only affect base pension — Agirc-Arrco points are earned only through salaried work.
          </div>
        </div>

      </div>

      <div style="margin-top:16px;padding:12px;background:rgba(188,140,255,0.08);border:1px solid rgba(188,140,255,0.3);border-radius:8px;font-size:13px;">
        <strong style="color:#bc8cff;">📌 Key rule summary for your situation (retire at 60, pension at 67):</strong>
        <ul style="margin:8px 0 0 0;padding-left:20px;color:var(--text);line-height:1.8;">
          <li><strong>Rachat max = 12 quarters</strong> (≈ 3 years) — apply now (before 60), costs ~€42k–€60k gross, ~€30k–€42k after tax deduction</li>
          <li><strong>CVV for 7 bridge years = 28 quarters</strong> — enroll within 6 months of stopping work, ~€1,500/yr × 7 = ~€10,500 total</li>
          <li><strong>Combine both (B+C)</strong>: 28 + 12 = 40 additional quarters — check if this reaches your taux plein threshold</li>
          <li><strong>Agirc-Arrco solidarity coefficient</strong>: −10% for 3 years if you claim before age 63 — consider claiming at 63 even with décote to avoid this penalty</li>
          <li><strong>Wait until 67 (taux plein automatique)</strong>: guaranteed 0% décote regardless of quarters — no cost, but 7 more bridge years to fund</li>
        </ul>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">📊 Lifetime Pension Value — Scenario Comparison by Life Expectancy</div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:12px;">
        Total pension received across your lifetime, for each retirement scenario, depending on when you die.
        <strong>Adjust your expected life expectancy:</strong>
        <input type="number" id="life-exp-input" value="${(profile as any).lifeExpectancy || 85}" min="67" max="110" step="1"
          style="width:65px;margin:0 8px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;padding:3px 8px;color:var(--text);font-size:13px;"
          oninput="renderLifetimePensionTable()">
        years old
      </p>
      <div style="overflow-x:auto;">
      <table style="width:100%;font-size:12px;border-collapse:collapse;min-width:700px;" id="lifetime-pension-table">
        <thead>
          <tr style="background:rgba(255,255,255,0.06);">
            <th style="padding:6px 10px;text-align:left;border-bottom:1px solid var(--border);">Scenario</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Monthly pension</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Starts at age</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Upfront cost (net)</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Total at 80</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Total at 85</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Total at 90</th>
            <th style="padding:6px 10px;text-align:right;border-bottom:1px solid var(--border);">Break-even vs A</th>
          </tr>
        </thead>
        <tbody id="lifetime-pension-tbody"></tbody>
      </table>
      </div>
      <p style="font-size:11px;color:var(--muted);margin-top:8px;">
        * Net cost = after 30% income tax deduction on rachat. Break-even = age at which this scenario overtakes "Do Nothing" in net total.
        Agirc-Arrco −10% solidarity coefficient applied for 3 years if pension claimed before age 63.
      </p>
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
  p.inflation = (+fd.get('inflation')) / 100;
  p.govRetirementAge = +fd.get('govRetirementAge');
  p.govMonthlyPension = +fd.get('govMonthlyPension');
  p.contributionQuarters = +fd.get('contributionQuarters') || 0;
  p.militaryServiceQuarters = +fd.get('militaryServiceQuarters') || 0;
  p.targetContributionYears = +fd.get('targetContributionYears');
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
  p.inflation = (+fd.get('inflation')) / 100;
  p.govRetirementAge = +fd.get('govRetirementAge');
  p.govMonthlyPension = +fd.get('govMonthlyPension');
  p.contributionQuarters = +fd.get('contributionQuarters') || 0;
  p.militaryServiceQuarters = +fd.get('militaryServiceQuarters') || 0;
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
  const retireYear = (profileData.age || 51) < 60
    ? new Date().getFullYear() + (60 - (profileData.age || 51))
    : new Date().getFullYear() + (profileData.targetRetirementAge - (profileData.age || 51));
  const startYear = Math.max(birthYear + 20, 1995); // assume career start at 20

  const rows = [];
  for (let y = startYear; y < retireYear; y++) {
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

    const samEl = document.getElementById('sam-result');
    const totEl = document.getElementById('sam-total');
    if (samEl) samEl.textContent = sam > 0 ? '€' + sam.toLocaleString('fr-FR') : '—';
    if (totEl) totEl.textContent = total > 0 ? '€' + total.toLocaleString('fr-FR') : '—';
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
  const lifeExp = +(document.getElementById('life-exp-input')?.value || 85);

  const calc = calcData;
  const profile = profileData;
  const gapYears = Math.max(0, profile.govRetirementAge - profile.targetRetirementAge);
  const missingQ = calc.missingQuarters || 0;
  const pensionFull = calc.calculatedPension || profile.govMonthlyPension || 0;
  const decotePct = missingQ * 0.0125;
  const pensionReduced = Math.round(pensionFull * (1 - decotePct));
  const trimRequis = calc.trimestresRequis || 172;
  const qtrsAtRet = calc.quartersAtRetirement || 0;

  // Agirc solidarity coeff: -10% for 3yr if claimed before 63
  const agircMonthly = calc.pensionAgircMonthly || 0;
  const baseMonthly = calc.pensionBaseMonthly || (pensionFull - agircMonthly);
  function applyAgirc(monthly, claimAge) {
    if (claimAge >= 63) return monthly;
    const solidarityYears = Math.min(3, 63 - claimAge);
    // Only Agirc part is penalised
    return baseMonthly + agircMonthly * 0.90; // rough: -10% on Agirc portion
  }

  function total(monthly, claimAge, upfrontCost, lifeExpAge) {
    const claimAgeRounded = claimAge;
    const yearsCollecting = Math.max(0, lifeExpAge - claimAgeRounded);
    const monthsNormal = yearsCollecting * 12;
    // Solidarity penalty: first 3yr if < 63
    let gross = 0;
    if (claimAge < 63) {
      const penaltyMonths = Math.min(36, monthsNormal);
      const normalMonths = Math.max(0, monthsNormal - 36);
      gross = (baseMonthly + agircMonthly * 0.9) * penaltyMonths + monthly * normalMonths;
    } else {
      gross = monthly * monthsNormal;
    }
    return Math.round(gross - upfrontCost);
  }

  const scenarioA_pension = pensionReduced;
  const scenarioA_claimAge = profile.govRetirementAge;

  // Rachat: max 12 quarters, cost ~€4,000/q net
  const rachatQ = Math.min(12, missingQ);
  const missingAfterRachat = Math.max(0, missingQ - rachatQ);
  const decoteAfterRachat = missingAfterRachat * 0.0125;
  const pensionAfterRachat = Math.round(pensionFull * (1 - decoteAfterRachat));
  const rachatCostGross = rachatQ * 4500; // ~€4,500/q average at age 51-60
  const rachatCostNet = Math.round(rachatCostGross * 0.70); // 30% tax saving

  // CVV: gapYears × 4 quarters
  const cvvQ = gapYears * 4;
  const missingAfterCVV = Math.max(0, missingQ - cvvQ);
  const decoteAfterCVV = missingAfterCVV * 0.0125;
  const pensionAfterCVV = Math.round(pensionFull * (1 - decoteAfterCVV));
  const cvvCostTotal = gapYears * 2000; // ~€2,000/yr average

  // Combined B+C
  const missingAfterBoth = Math.max(0, missingQ - rachatQ - cvvQ);
  const decoteAfterBoth = missingAfterBoth * 0.0125;
  const pensionAfterBoth = Math.round(pensionFull * (1 - decoteAfterBoth));
  const bothCostNet = rachatCostNet + cvvCostTotal;

  // Wait until 67 (taux plein automatique)
  const wait67Pension = pensionFull; // 0% decote guaranteed
  const wait67ExtraCapital = (profile.monthlyRetirementExpenses || 0) * 24; // 2 extra years bridge

  function breakEvenAge(scenarioPension, scenarioCost, scenarioClaimAge) {
    // Find age where cumulative (scenario - A) overtakes cost difference
    const basePension = pensionReduced;
    const baseClaimAge = profile.govRetirementAge;
    const monthlyDiff = scenarioPension - basePension;
    if (monthlyDiff <= 0) return '—';
    // From claimAge, accumulate pension gain minus cost
    for (let age = scenarioClaimAge; age <= 120; age++) {
      const yearsS = Math.max(0, age - scenarioClaimAge);
      const yearsB = Math.max(0, age - baseClaimAge);
      const totalS = scenarioPension * yearsS * 12 - scenarioCost;
      const totalB = basePension * yearsB * 12;
      if (totalS >= totalB) return age;
    }
    return '> 120';
  }

  const fmt2 = n => Math.round(n).toLocaleString('fr-FR');
  const scenarios = [
    { label: 'A — Do nothing', pension: pensionReduced, claimAge: scenarioA_claimAge, cost: 0, color: 'var(--muted)', bold: false },
    { label: 'B — Rachat 12 qtrs (before 60)', pension: pensionAfterRachat, claimAge: scenarioA_claimAge, cost: rachatCostNet, color: '#bc8cff', bold: false },
    { label: \`C — CVV \${gapYears} yrs (bridge)\`, pension: pensionAfterCVV, claimAge: scenarioA_claimAge, cost: cvvCostTotal, color: '#58a6ff', bold: false },
    { label: 'D — Rachat + CVV combined', pension: pensionAfterBoth, claimAge: scenarioA_claimAge, cost: bothCostNet, color: 'var(--green)', bold: pensionAfterBoth >= pensionFull },
    { label: 'E — Wait until 67 (taux plein)', pension: wait67Pension, claimAge: 67, cost: wait67ExtraCapital, color: 'var(--fire)', bold: true },
  ];

  tbody.innerHTML = scenarios.map((s, i) => {
    const t80 = total(s.pension, s.claimAge, s.cost, 80);
    const t85 = total(s.pension, s.claimAge, s.cost, 85);
    const t90 = total(s.pension, s.claimAge, s.cost, 90);
    const tLife = total(s.pension, s.claimAge, s.cost, lifeExp);
    const be = i === 0 ? '—' : breakEvenAge(s.pension, s.cost, s.claimAge);
    const best80 = i > 0 && t80 > total(scenarios[0].pension, scenarios[0].claimAge, 0, 80);
    const best85 = i > 0 && t85 > total(scenarios[0].pension, scenarios[0].claimAge, 0, 85);
    const bgRow = i === scenarios.length - 1 ? 'background:rgba(255,165,0,0.05);' : '';
    return \`<tr style="\${bgRow}">
      <td style="padding:5px 10px;font-weight:\${s.bold?'700':'400'};color:\${s.color};">\${s.label}</td>
      <td style="padding:5px 10px;text-align:right;">€\${fmt2(s.pension)}/mo</td>
      <td style="padding:5px 10px;text-align:right;">\${s.claimAge}</td>
      <td style="padding:5px 10px;text-align:right;color:var(--red);">\${s.cost > 0 ? '€'+fmt2(s.cost) : '—'}</td>
      <td style="padding:5px 10px;text-align:right;\${best80?'color:var(--green);font-weight:600;':''}">€\${fmt2(t80)}</td>
      <td style="padding:5px 10px;text-align:right;\${best85?'color:var(--green);font-weight:600;':''}">€\${fmt2(t85)}</td>
      <td style="padding:5px 10px;text-align:right;">€\${fmt2(t90)}</td>
      <td style="padding:5px 10px;text-align:right;color:\${be==='—'?'var(--muted)':'var(--fire)'};">\${be==='—'?'—':'age '+be}</td>
    </tr>\`;
  }).join('');
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
