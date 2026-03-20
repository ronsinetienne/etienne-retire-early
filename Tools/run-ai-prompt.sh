#!/bin/bash
# Wrapper for simple Claude CLI prompt-in/text-out calls (no tools, single turn)
# Prompt is passed as the first argument
# CLAUDE_PATH can be set via env by Server.ts
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS
CLAUDE="${CLAUDE_PATH:-claude}"
exec "$CLAUDE" -p --output-format text --max-turns 1 --dangerously-skip-permissions "$@"
