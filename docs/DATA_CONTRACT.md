# Data Contract - Urban Drift

All code in src/lib follows this. Field names from SerpApi must be confirmed in the P0 gate. Do not assume a field exists.

## Raw place (from SerpApi google_maps, basic search only)
Expected fields (verify in P0): title, place_id, gps_coordinates {latitude, longitude}, rating, reviews (count), type, address, hours or open_state. [NEEDS INPUT: confirm actual field names from gate-data report]

## FactSheet (our normalized shape)
```ts
type FactSheet = {
  id: string;            // place_id or hash
  name: string;          // title
  category: string;      // from type, lowercased
  rating: number | null;
  ratingCount: number | null;
  street: string | null; // parsed from address, may be null
  area: string | null;   // locality from address, may be null
  lat: number; lng: number;
  distanceKm: number;    // from search center
  hours: string | null;
}
```
Rules: null means unknown. Never fill unknown fields. A clue may only use non-null fields.

## Safety filters (safety.ts), applied before clue building
- Keep only places with a name, coordinates, and a category.
- Drop categories: hospital, police, government office, school, bank branch interior, bar, nightclub, liquor store, construction, industrial, funeral, any category suggesting private residence.
- Drop places farther than the radius from the center.
- Drop duplicates (same name within 50 m).
- Prefer places with rating and ratingCount present.
- Never output turn-by-turn directions or instructions to cross roads.
- Card always prints: "Public places only. Go in daylight. Watch traffic. Stay aware. Your safety comes first."

## Difficulty tiers (clue facts allowed)
| Tier | Facts shown in clue | Example shape (illustrative, not data) |
|---|---|---|
| easy | category + street (or area) | "A <category> on <street>." |
| medium | category + rating band | "A <category> rated between 4.0 and 4.5." |
| hard | rating band + review count band, no category | "Rated between 4.0 and 4.5 with 200 to 500 reviews." |

Bands: rating bands are 0.5 wide (floor to floor+0.5). Review count bands: under 50, 50 to 200, 200 to 500, 500 to 1000, over 1000. Hard tier requires both fields non-null, else the place is skipped for hard.

## Clue object
```ts
type Clue = {
  n: number;                 // 1..5
  placeId: string;
  answer: string;            // place name, goes to answer key only
  baseClue: string;          // deterministic text from the tier template
  riddle: string;            // model rewrite, or baseClue on fallback
  source: "model" | "fallback";
  attempts: number;          // 0..3
  verifierFailures: string[]; // reasons, for tracing
}
```

## Verifier (verifier.ts), deterministic, no model
A riddle passes only if ALL are true:
1. It does not contain the answer name or any word of it longer than 3 letters.
2. Every number in the riddle (digits or numeric ranges) appears in the allowed set built from the FactSheet and bands.
3. Every capitalized word or proper noun in the riddle is in the allowed set: street, area, category words, plus a small fixed allowlist of common words. Anything else fails.
4. It contains the required anchor facts for the tier (for example street for easy, rating band for medium).
5. It does not mention colors, awnings, signs, building style, smells, crowds, or other visual claims. Use a banned-word list.
6. Length is 8 to 30 words. ASCII only.
On failure: record the reason in verifierFailures, retry up to 3 times with the failure reason in the prompt, then fall back to baseClue.

## Model prompt contract (writer)
- Input: tier, baseClue, and the allowed facts as plain text. Nothing else.
- Instruction: rewrite in a playful riddle voice, keep every fact, add no new facts, no colors, no visuals, no place name, output only the riddle text.
- No tools. No function calling. Plain text out.
- Parameters: temperature 0.7, num_ctx 2048.

## Card contract
- 5 clues, numbered, each with a blank answer line.
- Footer on page: difficulty, neighborhood, radius, safety note, date.
- Answer key: folded or separate block at the bottom, printed upside down or in a boxed "Key" section. Scoring line: "Score: __ / 5".
- Black and white only, A4, one page, @media print strips all UI.
- ASCII only.
