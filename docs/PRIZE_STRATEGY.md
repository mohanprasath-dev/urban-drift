# Prize Strategy - Urban Drift (Week 1)

## Rules that shape everything
- One submission wins at most once per challenge. Extra categories are extra chances at one prize.
- A category counts only if the technology is genuinely used and the category is listed in the post's Prize Categories section.
- Overall prize ($250) needs no partner tech. Writing Quality is weighted most.
- Deadline: Mon Oct 12, 12:29 PM IST.

## Focus
| Rank | Prize | Value | Why |
|---|---|---|---|
| PRIMARY | Best Use of Sentry Agent Tracing | $100 | Few visible entries used it in our research (unverified count, recheck Oct 11). Judges reward showing latency, tokens, and debugging in the post. |
| SECONDARY | Best Use of Mastra | $100 | The workflow is built on Mastra, so entry costs nothing extra. |
| SECONDARY | Best Use of SerpApi | $100 | All place data comes from SerpApi, so entry costs nothing extra. |
| UPSIDE | Overall | $250 | Driven by post quality, theme fit, and the real outdoor walk. |

Do not chase Gemma, TabPFN, Render, or other categories. They add build time for no real fit.

## What must be true to claim each category
### Sentry Agent Tracing
- Workflow runs traced end to end through @mastra/sentry.
- Trace shows: workflow steps, model name, token counts, latency, and at least one verifier rejection followed by a retry.
- Post includes real screenshots of the Sentry trace and one debugging story that actually happened. If no real failure happens, say so honestly and show the verifier catching a planted fact instead. Do not invent a story.
- Fallback: if the exporter fails the P4 gate, drop Sentry from the post and make Mastra the primary target.

### Mastra
- The hunt is a Mastra workflow with named steps (fetch, build, write, verify, assemble).
- Post explains why a workflow with code-owned facts beat letting a small model call tools. Report only what was observed.

### SerpApi
- Live google_maps results drive every clue.
- Post shows a fact-sheet next to the clue it produced.
- Post states the caching approach and call count actually used.

## Overall
- Writing Quality is weighted most. Reserve a full block of time for the post (see POST_BRIEF.md).
- Do the real walk. The prompt gives bonus points for taking it outside and reporting how it went.
- Honest privacy claim only (see POST_BRIEF.md).

## Risk notes
- Closest DEV competitor: "Paper Trail" (printable nature field card). Differentiate on the game: verified clues, answer key, scoring, difficulty tiers.
- The competitor and saturation data came from research tool output with no working source links. Mohan re-checks the live #hf26challenge tag on Oct 11 before finalizing the post.
