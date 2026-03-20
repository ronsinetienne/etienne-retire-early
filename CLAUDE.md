# etienne-retire-early — Claude Context

## Project Overview
A personal FIRE (Financial Independence, Retire Early) planning tool for Etienne Ronsin (born 1974, age 51).
Target: retire at 60, bridge capital until French pension at 67.

## Owner & Git Workflow
- Repo: `ronsinetienne/etienne-retire-early` (GitHub)
- **Direct push to master** — no PRs needed for this repo
- Server runs on **port 3743**

## Stack
- **Runtime:** Bun (never npm/yarn)
- **Language:** TypeScript
- **Server:** `Tools/Server.ts`
- **AI Analysis:** `Tools/AIAnalyzer.ts` (calls Anthropic API via `.env` ANTHROPIC_API_KEY)
- **Data:** `data/profile.json` (synced via Google Drive on both PC and Chromebook)

## Key Files
- `Tools/Server.ts` — HTTP server, routes
- `Tools/Renderer.ts` — all HTML rendering (tabs, tables, forms)
- `Tools/AIAnalyzer.ts` — AI prompt builder, calls Claude API
- `Tools/Calculator.ts` — pension math (CNAV, Agirc-Arrco, décote, CVV)
- `Tools/ProfileStore.ts` — profile defaults and persistence
- `data/profile.json` — user's saved profile (on Google Drive, shared PC↔Chromebook)

## Google Drive Data Sync
- PC: `G:/Mon Drive/etienne-apps-data/retire-early/` (via `fire.config.json`)
- Chromebook: `/mnt/chromeos/GoogleDrive/MyDrive/etienne-apps-data/retire-early/` (via `fire.config.json`)
- Data changes on either machine sync automatically via Google Drive

## Current Profile (key values)
- Age: 51, target retirement: 60, govRetirementAge: 67
- Validated quarters: 101 + 5 military = 106, trimestresRequis: 172
- salaireMoyen: 46,000 (note: real SAM from govt site ≈ 41,800 — explain difference to user)
- lastGrossSalary: 85,000 → CVV Cat.1 → €8,632/yr, TMI: 30% (corrected from 41%)
- Stock portfolio: €230,000, monthly expenses: €5,000, bridgeReturn: 7%
- agircPoints: 10,410.28, agircPointsPerYear: 590

## Scenarios in Lifetime Pension Table
- A: Do nothing (with décote)
- B: Rachat 12 quarters
- C: CVV bridge only
- D: Rachat + CVV
- E: Wait until 67 (no strategy)
- F: ★ Chosen — CVV Cat.1 + claim CNAV+Agirc simultaneously at 67
- F+B: Rachat 12q + CVV + claim at 67
- G: Comparison — work until 65
- H: Comparison — work until 67

## Key Rules Implemented
- **Liquidation globale**: CNAV and Agirc-Arrco MUST be claimed simultaneously (French law since 2015)
- **Bridge**: Single phase 60-67, full €5,000/mo from capital, NO pension income until 67
- **CVV**: Form S1101, enroll within 6 months of stopping work, no wealth restrictions
- **Solidarity malus ABOLISHED**: Agirc-Arrco -10% penalty removed Dec 1, 2023
- **TMI calculation**: Use gross×0.693 to convert to taxable income before bracket lookup

## Recent Changes (update this section after each session)
- Added lastGrossSalary field → CVV bracket calculation
- Fixed agency fees calculation (should be 4% of sale price, not equity) — TODO: still pending
- Added Scenarios G & H (work until 65/67)
- Added F+B scenario (Rachat + CVV combined)
- Fire plan now shows Real Estate / Stock Portfolio as separate columns
- TMI fixed from 41% to 30% for €85k gross salary
- Post-pension withdrawals now show only portfolio draw (expenses − pension)
- Added fire.config.json for Google Drive data sync (PC + Chromebook)
- Action plan: CNAV+Agirc claimed simultaneously at govRetirementAge (not separately)

## Chromebook Setup
1. `cd ~/etienne-retire-early && git pull` (get latest code)
2. `bun run Tools/Server.ts` (start server)
3. Open Chrome → http://localhost:3743
4. Port 3743 must be forwarded in ChromeOS Settings → Developers → Linux → Port forwarding
