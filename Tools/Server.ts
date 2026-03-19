import { config, PROJECT_ROOT } from '../Config/Config';
import { calculate } from './Calculator';
import { loadProfile, saveProfile, loadAnalysis, saveAnalysis } from './ProfileStore';
import { renderDashboard } from './Renderer';
import { analyzeProfile, analyzeFirePlan } from './AIAnalyzer';
import type { UserProfile } from './Calculator';

// Load .env if present
import { resolve } from 'path';
const envPath = Bun.env.ENV_FILE || resolve(PROJECT_ROOT, '.env');
try {
  const f = Bun.file(envPath);
  if (await f.exists()) {
    const text = await f.text();
    for (const line of text.split('\n')) {
      const [k, ...rest] = line.trim().split('=');
      if (k && !k.startsWith('#') && rest.length > 0) {
        process.env[k.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
  }
} catch { /* .env is optional */ }

const hasKey = !!(process.env.ANTHROPIC_API_KEY || (globalThis as any).Bun?.env?.ANTHROPIC_API_KEY);
console.log(`🔑 ANTHROPIC_API_KEY: ${hasKey ? '✅ loaded' : '❌ NOT FOUND — check .env'}`);

const port = Number(process.env.PORT) || Number(process.env.PREVIEW_PORT) || config.port;

const server = Bun.serve({
  port,

  async fetch(req) {
    const url = new URL(req.url);
    const method = req.method;

    // ── Dashboard ──────────────────────────────────────────────
    if (url.pathname === '/' && method === 'GET') {
      const profile = loadProfile();
      const calc = calculate(profile);
      const analysis = loadAnalysis() as any;
      const html = renderDashboard(profile, calc, analysis);
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ── Save Profile ───────────────────────────────────────────
    if (url.pathname === '/api/save-profile' && method === 'POST') {
      try {
        const body = await req.json() as UserProfile;
        saveProfile(body);
        return Response.json({ ok: true });
      } catch (e: any) {
        return Response.json({ error: e.message }, { status: 400 });
      }
    }

    // ── AI Analyze ─────────────────────────────────────────────
    if (url.pathname === '/api/analyze' && method === 'POST') {
      try {
        const body = await req.json() as UserProfile;
        saveProfile(body);
        const calc = calculate(body);
        const key = process.env.ANTHROPIC_API_KEY || (globalThis as any).Bun?.env?.ANTHROPIC_API_KEY;
        console.log(`🔍 /api/analyze — API key present: ${!!key} — key prefix: ${key ? key.slice(0,20)+'...' : 'NONE'}`);
        const analysis = await analyzeProfile(body, calc);
        saveAnalysis(analysis as any);
        return Response.json(analysis);
      } catch (e: any) {
        console.error('Analyze error:', e);
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── AI Fire Plan for specific scenario ─────────────────────
    if (url.pathname === '/api/analyze-fire-plan' && method === 'POST') {
      try {
        const body = await req.json() as { scenario: string; profile: UserProfile };
        const calc = calculate(body.profile);
        const firePlan = await analyzeFirePlan(body.profile, calc, body.scenario);
        return Response.json({ firePlan });
      } catch (e: any) {
        console.error('Analyze fire plan error:', e);
        return Response.json({ error: e.message }, { status: 500 });
      }
    }

    // ── Print View — all tabs visible, white background ────────
    if (url.pathname === '/print' && method === 'GET') {
      const profile = loadProfile();
      const calc = calculate(profile);
      const analysis = loadAnalysis() as any;
      let html = renderDashboard(profile, calc, analysis);
      // Inject print CSS overrides just before </head>
      const printCSS = `
<style id="print-overrides">
  /* Show all tab panes */
  .tab-pane { display: block !important; }
  /* Hide interactive controls */
  .tabs, #status-bar, button:not(.no-hide), .form-grid, form,
  [onclick], input, textarea, select, label { display: none !important; }
  /* White background for printing */
  :root { --bg:#fff; --card:#f8f8f8; --border:#ddd; --text:#111; --muted:#555; }
  body { background: #fff; color: #111; }
  /* Section breaks */
  .tab-pane { page-break-before: always; padding-top: 12px; }
  .tab-pane:first-of-type { page-break-before: avoid; }
  /* Print header */
  #print-header { display: block !important; font-family: sans-serif; padding: 16px 0 8px; border-bottom: 2px solid #f39c12; margin-bottom: 20px; }
  #print-header h1 { font-size: 22px; color: #f39c12; }
  #print-header p { font-size: 13px; color: #555; margin-top: 4px; }
  @media screen { body::before { content: '🖨️ Print this page (Ctrl+P) and choose "Save as PDF"'; display: block; background:#f39c12; color:#000; padding:12px 20px; font-weight:700; font-size:14px; text-align:center; } }
</style>
<div id="print-header" style="display:none">
  <h1>🔥 Retirement Early Plan</h1>
  <p>Generated ${new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })} · Etienne Ronsin</p>
</div>`;
      html = html.replace('</head>', printCSS + '</head>');
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }

    // ── Get Profile (API) ──────────────────────────────────────
    if (url.pathname === '/api/profile' && method === 'GET') {
      const profile = loadProfile();
      const calc = calculate(profile);
      return Response.json({ profile, calc });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`\n🔥 Retire Early Dashboard running at http://localhost:${server.port}\n`);
