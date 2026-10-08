# AGENT.md - Urban Drift Architecture & Agent Guidelines

## Identity & Mission
Urban Drift is a screen-free neighborhood scavenger hunt web app built for the DEV Hacktoberfest Open-Source AI Challenge Week 1 (Touch Grass).
Users generate a personalized 5-clue scavenger hunt for their neighborhood, print a single A4 sheet, leave the screen behind, and explore on foot.

## Architecture & Layout
```
urban-drift/
  data/
    cache/           # Raw SerpApi responses cached by sha1
    demo/            # Bundled demo dataset for offline DEMO_MODE
  docs/
    DATA_CONTRACT.md # FactSheet schema, safety filters, difficulty tiers, verifier rules
    POST_BRIEF.md    # DEV submission guidelines and evidence checklist
    PRIZE_STRATEGY.md# Sentry Agent Tracing ($100), Mastra ($100), SerpApi ($100)
    SENTRY_NOTES.md  # Sentry tracing findings and redaction notes
  scripts/
    gate-data.ts     # Data gate validation script
    gate-writer.ts   # Clue writer verification and timing benchmark
    gate-workflow.ts # Mastra end-to-end workflow runner
    gate-sentry.ts   # Sentry trace verification runner
  src/
    app/             # Next.js 14 App Router UI (input form, /card print view, /api/generate)
    lib/
      cache.ts       # Disk cache with live-call counter
      serpapi.ts     # SerpApi client for google_maps
      geo.ts         # Haversine distance calculator
      safety.ts      # Safety filters (category drop-list, distance, daylight check)
      factsheet.ts   # FactSheet normalization
      clues.ts       # Deterministic tier clue templates & selection
      verifier.ts    # Deterministic clue verifier (banned words, allowed facts)
    mastra/
      agents/
        clue-writer.ts # Ollama agent via Mastra
      workflows/
        hunt.ts        # 5-step Mastra workflow
      index.ts         # Mastra instance with telemetry
  tests/             # Vitest test suite
  phases.json        # Project phases, acceptance criteria, and gate checks
```

## Key Invariants
1. Code owns facts; the model owns only riddle phrasing.
2. The verifier is pure and deterministic - zero hallucinated facts pass.
3. Every live call is cached; DEMO_MODE runs 100% offline.
4. Output is strictly 1 A4 printable page with black & white styling.
5. Sentry traces capture workflow execution, latency, tokens, and retries.

## LLM & Provider Configuration
- Agent Engine: Mastra Agent (`@mastra/core/agent`)
- Ollama Provider Package: `ollama-ai-provider` via `createOllama`
- Local Endpoint: `process.env.OLLAMA_BASE_URL` (default: `http://localhost:11434/api`)
- Model: `process.env.OLLAMA_MODEL` (default: `llama3.2`)
- Context & Inference: `numCtx: 2048`, `temperature: 0.7`
- Tool Calling: None (pure text generation)

