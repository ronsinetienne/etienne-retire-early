# Retire Early Dashboard

A self-hosted FIRE (Financial Independence, Retire Early) dashboard. Enter your financial profile, get live projections, and use AI to generate personalized recommendations across 4 categories.

Built with **Bun** + **TypeScript**. Runs as a local web server. Your data never leaves your machine.

## Quick Start

### macOS / Linux
```bash
git clone https://github.com/ronsinetienne/etienne-retire-early ~/Sites/etienne-retire-early
cd ~/Sites/etienne-retire-early
./setup.sh
bun run start
```

### Windows
```powershell
git clone https://github.com/ronsinetienne/etienne-retire-early $env:USERPROFILE\Sites\etienne-retire-early
cd $env:USERPROFILE\Sites\etienne-retire-early
powershell -ExecutionPolicy Bypass -File setup.ps1
bun run start
```

Then open **http://localhost:3743** in your browser.

---

## Features

### Profile Input (top of dashboard)
Enter your full financial picture — income, expenses, savings, portfolio, real estate — and let the dashboard calculate everything live. Click **Analyze with AI** to get personalized advice powered by Claude.

### 4 Categories

| Tab | What it shows |
|-----|---------------|
| **🎯 Realism** | FIRE variants (Lean/Regular/Fat/Coast), feasibility score, milestones, AI reality check |
| **📊 FIRE Plan** | Portfolio projection chart, time to FIRE, monthly gap, AI action plan |
| **📈 Stock Market** | Age-based ETF allocation, suggested portfolio, expected returns, AI strategy |
| **🏠 Real Estate** | Net equity, rental yield, FIRE number reduction from rental income, AI strategy |

### Live Calculations
All FIRE numbers update in real-time as you type — no need to submit the form.

### AI Analysis (optional)
Powered by Claude claude-opus-4-6. Requires an `ANTHROPIC_API_KEY` in `.env`.

---

## AI Setup

1. Get an API key at [console.anthropic.com](https://console.anthropic.com)
2. Edit `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```
3. Click **Analyze with AI** on the dashboard

Without the key, all mathematical projections still work — only the AI text sections are unavailable.

---

## Stack

- **Runtime:** Bun
- **Language:** TypeScript
- **Server:** `Tools/Server.ts` on localhost:3743
- **Rendering:** Server-side HTML with ECharts (via CDN) for charts
- **AI:** Anthropic SDK (claude-opus-4-6)
- **Data:** `data/profile.json` (gitignored, stays on your machine)

## FIRE Formulas

| Metric | Formula |
|--------|---------|
| FIRE Number | `(monthly_retirement_expenses × 12 − annual_rental_income) × 25` |
| Lean FIRE | `FIRE Number × 0.7` |
| Fat FIRE | `FIRE Number × 1.5` |
| Coast FIRE | `FIRE Number ÷ (1 + real_return)^years_to_target` |
| Years to FIRE | Compound interest simulation until portfolio ≥ FIRE Number |
| Savings Rate | `(income − expenses) ÷ income × 100` |
| Real Return | `estimated_return − inflation` |
