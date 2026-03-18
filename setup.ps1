Write-Host ""
Write-Host "🔥 Retire Early Dashboard — Setup" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow
Write-Host ""

# Install Bun if not present
if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Bun..." -ForegroundColor Cyan
    powershell -c "irm bun.sh/install.ps1 | iex"
    $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
}

Write-Host "✓ Bun $(bun --version)" -ForegroundColor Green

# Install dependencies
Write-Host ""
Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
bun install

# Create data directory
New-Item -ItemType Directory -Force -Path data | Out-Null
Write-Host "✓ data/ directory ready" -ForegroundColor Green

# Copy .env.example if no .env
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host ""
    Write-Host "📝 Created .env from .env.example" -ForegroundColor Cyan
    Write-Host "   → Add your ANTHROPIC_API_KEY to enable AI analysis"
}

Write-Host ""
Write-Host "════════════════════════════════" -ForegroundColor Gray
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Start the dashboard:"
Write-Host "  bun run start" -ForegroundColor Cyan
Write-Host ""
Write-Host "Then open: http://localhost:3743" -ForegroundColor Cyan
Write-Host ""
