import { config } from '../Config/Config';
import { calculate } from './Calculator';
import { loadProfile, saveProfile, loadAnalysis, saveAnalysis } from './ProfileStore';
import { renderDashboard } from './Renderer';
import { analyzeProfile } from './AIAnalyzer';
import type { UserProfile } from './Calculator';

// Load .env if present
const envPath = Bun.env.ENV_FILE || '.env';
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

const server = Bun.serve({
  port: config.port,

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
        const analysis = await analyzeProfile(body, calc);
        saveAnalysis(analysis as any);
        return Response.json(analysis);
      } catch (e: any) {
        console.error('Analyze error:', e);
        return Response.json({ error: e.message }, { status: 500 });
      }
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
