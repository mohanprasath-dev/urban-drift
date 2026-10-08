# Urban Drift

Screen-free neighborhood scavenger hunt. Real map data, a local Ollama model writes the riddles, a deterministic code verifier checks every clue, and you print one A4 card and walk.

Built for the DEV Hacktoberfest Open-Source AI Challenge Week 1 (Touch Grass).

---

## Architecture Diagram

```mermaid
flowchart TD
    User([Player Input: Neighborhood, Tier, Radius]) --> UI[Next.js 14 App Router]
    UI --> API[/api/generate POST]
    API --> WF[Mastra Sequential Workflow: hunt]

    subgraph Workflow [6-Step Hunt Workflow]
        S1[1. fetchPlaces] -->|SerpApi or Disk Cache| S2[2. buildFactSheets]
        S2 -->|Safety Filters + Normalization| S3[3. selectClues]
        S3 -->|Deterministic Tier Templates| S4[4. writeClues]
        S4 <-->|Verify-Retry Loop 0..3| Ollama[Local Ollama: llama3.2]
        S4 --> S5[5. verifyClues]
        S5 -->|Deterministic Rule Audit| S6[6. assembleCard]
    end

    WF --> CardData[Card Payload + Metadata]
    CardData --> PrintView[/card: Print-Ready View]
    PrintView --> PrintSheet([A4 Printed Sheet: 5 Clues + Key])

    WF -.->|Observability Spans & Breadcrumbs| Sentry[Sentry Agent Tracing]
```

---

## Core Principles

1. Code owns facts: Place names, addresses, coordinates, and star ratings are extracted deterministically from real map data. The LLM never chooses places or queries tools.
2. The model owns phrasing: A local Ollama model (`llama3.2`) rewrites factual clue templates into playful scavenger riddles.
3. Deterministic verifier: Every generated riddle is checked before printing. If the model leaks an answer, invents a number, or adds sensory hallucinations, it is rejected and retried up to 3 times before falling back to the base clue.
4. Screen-free execution: The laptop is closed after printing. The game happens entirely outdoors on a single A4 sheet with a score counter and folded answer key.

---

## Prerequisites & Setup

### 1. Requirements
- Node.js >= 20
- npm >= 10
- Ollama installed and running locally

### 2. Pull Local Model
```bash
ollama pull llama3.2
```

### 3. Clone and Install Dependencies
```bash
git clone https://github.com/mohanprasath-dev/urban-drift.git
cd urban-drift
npm install
```

### 4. Configure Environment
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Configure your keys in `.env.local`:
```env
SERPAPI_KEY=your_serpapi_key_here
SENTRY_DSN=your_optional_sentry_dsn
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Optional Cloud Deployment: Groq LPU (runs open-source Llama 3.2 in cloud)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.2-3b-preview
```


---

## Running the Application

### Development Mode
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### Offline Demo Mode
To run completely offline using cached demo datasets without consuming any live SerpApi calls:
```bash
DEMO_MODE=1 npm run dev
```

---

## Validation & Gate Scripts

The repository includes deterministic gate scripts to verify each stage of the pipeline:

### Gate 1: Data Coverage
Queries SerpApi for 3 neighborhoods and verifies real field completeness:
```bash
npm run gate:data -- Velachery Adyar Mylapore
```

### Gate 2: Local Writer & Timing Benchmark
Benchmarks local Ollama riddle generation, verifier retries, and tests a planted wrong fact:
```bash
npm run gate:writer
```

### Gate 3: Mastra End-to-End Workflow
Runs the complete 6-step Mastra hunt workflow from the CLI and prints step durations:
```bash
npm run gate:workflow
```

### Gate 4: Sentry Agent Tracing
Verifies end-to-end trace generation and verifies verifier rejection under deliberate fault injection:
```bash
npm run gate:sentry
```

---

## Running Test Suite

```bash
npm test
```
Runs 31 Vitest unit tests covering geo calculation, safety filters, FactSheet normalization, tier clue generation, and deterministic verification rules.

---

## Safety Guidelines

Urban Drift scavenger hunts are designed strictly for public pedestrian exploration:
- Public spaces only (parks, retail stores, cafes, shopping centers).
- Walk in daylight hours only.
- Watch traffic and stay alert to surroundings.
- Never cross busy or dangerous roads to solve a clue.
- Your personal safety comes first at all times.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
