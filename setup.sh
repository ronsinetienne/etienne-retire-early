#!/usr/bin/env bash
set -e

echo ""
echo "🔥 Retire Early Dashboard — Setup"
echo "=================================="
echo ""

# Install Bun if not present
if ! command -v bun &>/dev/null; then
  echo "📦 Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
fi

echo "✓ Bun $(bun --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
bun install

# Create data directory
mkdir -p data
echo ""
echo "✓ data/ directory ready"

# Copy .env.example if no .env exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "📝 Created .env from .env.example"
  echo "   → Add your ANTHROPIC_API_KEY to enable AI analysis"
fi

echo ""
echo "════════════════════════════════"
echo "✅ Setup complete!"
echo ""
echo "Start the dashboard:"
echo "  bun run start"
echo ""
echo "Then open: http://localhost:3743"
echo ""
