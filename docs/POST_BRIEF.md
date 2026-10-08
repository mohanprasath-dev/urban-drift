# Post Brief - DEV submission

Writing Quality is weighted most. Draft this on Oct 11 with Claude in chat. Antigravity does not write the post.

## Rules
- Use the official DEV submission template (link on the challenge page). It adds tags #devchallenge and #hf26challenge.
- List the entered categories in the "Prize Categories" section: Sentry Agent Tracing, Mastra, SerpApi.
- ASCII only, no em dashes, first person, short paragraphs, no filler.
- Claim only what was measured. Every number comes from a real run. Use [NEEDS INPUT: ...] where data is missing.
- No named reviewers or review quotes.

## Title ideas (pick one, Mohan decides)
- I Built a Game That Makes Me Leave My Laptop Behind
- Urban Drift: A Walking Game That Fits on One Sheet of Paper

## Section order
1. Hook: a real moment from the walk. Screen time as an engineering student, then paper in hand outside.
2. What I built: 3 sentences. Include "the laptop is used for under a minute".
3. Demo: short video of generation, then photos of the printed card at real places.
4. How it works: Next.js, Mastra workflow, SerpApi, Ollama. One diagram (mermaid in README).
5. The rule that shaped the build: code owns facts, the model owns only wording. Show a fact-sheet beside its clue.
6. The verifier: show one real rejection and the retry. Only real events.
7. Sentry traces: annotated screenshots with latency, tokens, and the retry. (Primary category.)
8. Why open innovation matters: see claim below.
9. What did not work: be honest about weak data, slow runs, and anything cut.
10. Field test: how the walk went. What a clue got wrong or right in real life.
11. Prize Categories: Sentry Agent Tracing, Mastra, SerpApi.
12. Links: public repo, license.

## Privacy and open-source claim (use this scope only)
True: the model runs locally through Ollama, so clue writing needs no cloud AI service. During the walk there is no GPS polling, no data connection, and no tracking, because the card is paper.
Also say plainly: the neighborhood query goes to SerpApi, and traces go to Sentry. State what the traces contain based on the P4 test. Do not claim "all data stays local".

## Asset checklist
- [ ] 60 to 90 second screen recording of generation
- [ ] Printed card photographed at 3 or more real stops
- [ ] Photo of Mohan's hand holding the card (no face needed)
- [ ] Sentry trace screenshots (workflow, tokens, retry)
- [ ] Fact-sheet next to clue screenshot
- [ ] Verifier rejection log excerpt
- [ ] Architecture diagram
- [ ] Optional: DevRelay session link for the agent build process
