# Sentry Observability & Tracing Notes - Urban Drift

## Overview
Urban Drift uses `@mastra/sentry` alongside `@sentry/nextjs` to monitor the end-to-end execution of the 6-step Mastra hunt workflow, measure step latencies, record token usage/durations, and trace deterministic verifier retries.

## Technical Details

### 1. Integration Stack
- **Exporter**: `@mastra/sentry` (`SentryExporter`)
- **SDK**: `@sentry/nextjs` / `@sentry/node`
- **Sample Rate**: `1.0` (100% trace sampling for demo & validation)
- **Official Docs**:
  - [Mastra Sentry Observability](https://mastra.ai/docs/observability/sentry)
  - [Sentry AI Agent Monitoring](https://docs.sentry.io/product/insights/ai/)

### 2. What Is Captured
- **Workflow & Step Spans**:
  - `fetchPlaces` (duration, SerpApi cache hit/miss status)
  - `buildFactSheets` (duration, normalized place count)
  - `selectClues` (duration, tier selection)
  - `writeClues` (duration, attempts per clue, model name)
  - `verifyClues` (duration, verifier pass/fail verdicts)
  - `assembleCard` (card structure assembly duration)
- **Span Attributes**:
  - `clue.{n}.tier`: Difficulty tier (`easy`, `medium`, `hard`)
  - `clue.{n}.attempts`: Number of generation attempts (1 to 3)
  - `clue.{n}.source`: Whether the final clue was written by `model` or used `fallback`
  - `clue.{n}.verifierFailures`: Specific verifier rejection reasons if retries occurred
- **Breadcrumbs**:
  - Real-time verifier decisions emitted per attempt (`category: 'verifier'`)

### 3. What Is NOT Captured / Data Privacy
- **Tool Inputs & Outputs**: Urban Drift uses deterministic code steps rather than autonomous model tool-calling. Hence, no arbitrary tool payloads or credentials are ever sent to the model or recorded in tool spans.
- **SerpApi Keys & Credentials**: The SerpApi API key is scrubbed before hashing and never attached to span attributes or breadcrumbs.
- **Redaction Support**: Sentry supports `beforeSend` and `beforeSendSpan` hooks to redact or sanitize sensitive text before telemetry events leave the process.

### 4. Planted Fault Verification
- When `PLANT_FAULT=1` is passed in the environment, the first attempt of Clue #1 deliberately introduces an invalid rating fact.
- Sentry trace logs the verification rejection event on Attempt 1, followed by a successful retry on Attempt 2.
