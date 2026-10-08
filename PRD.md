# PRD.md - Urban Drift Product Requirements Document

## Overview
Urban Drift turns neighborhood exploration into a tactile, screen-free scavenger hunt.
Instead of walking with heads glued to screens or GPS apps, players generate a 1-page printable card with 5 riddle clues grounded in real local geography, then walk outdoors in daylight to solve them.

## Core Features
1. **Neighborhood Input**: Input neighborhood name, difficulty tier (easy, medium, hard), and walking radius (0.5 to 1.5 km).
2. **Deterministic Fact Extraction**: Query SerpApi `google_maps`, filter strictly for public safe places, normalize into verified FactSheets.
3. **Clue Generation with Verification**: Local Ollama model writes riddles from facts; deterministic verifier verifies no leaks, no hallucinations, and exact matching; falls back to deterministic base clue if verification fails after 3 retries.
4. **Print-Ready A4 Card**: Minimal, black-and-white, zero UI chrome on `@media print`, 5 clues + score counter + boxed answer key.
5. **Observability**: End-to-end tracing with `@mastra/sentry` showing step latencies, token consumption, and retry cycles.

## Safety Invariants
- Exclude hospitals, schools, police stations, bars, nightclubs, liquor stores, and private residences.
- Public daytime spaces only within walking radius.
- Standard printed warning on every card: "Public places only. Go in daylight. Watch traffic. Stay aware. Your safety comes first."
