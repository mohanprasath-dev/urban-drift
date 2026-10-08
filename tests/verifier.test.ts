import { describe, it, expect } from 'vitest';
import { verify } from '../src/lib/verifier';
import type { FactSheet } from '../src/lib/factsheet';
import type { Clue } from '../src/lib/clues';

describe('src/lib/verifier deterministic tests', () => {
	const sampleFact: FactSheet = {
		id: 'place-palladium',
		name: 'Palladium Mall',
		category: 'shopping mall',
		rating: 4.5,
		ratingCount: 17491,
		street: 'Velachery Main Rd',
		area: 'Indira Gandhi Nagar',
		lat: 12.993,
		lng: 80.217,
		distanceKm: 0.2,
		hours: 'Open'
	};

	const sampleClueEasy: Clue = {
		n: 1,
		placeId: 'place-palladium',
		answer: 'Palladium Mall',
		baseClue: 'A shopping mall on Velachery Main Rd.',
		riddle: 'A shopping mall on Velachery Main Rd.',
		source: 'fallback',
		attempts: 0,
		verifierFailures: []
	};

	const sampleClueMedium: Clue = {
		n: 2,
		placeId: 'place-palladium',
		answer: 'Palladium Mall',
		baseClue: 'A shopping mall rated between 4.5 and 5.0.',
		riddle: 'A shopping mall rated between 4.5 and 5.0.',
		source: 'fallback',
		attempts: 0,
		verifierFailures: []
	};

	const sampleClueHard: Clue = {
		n: 3,
		placeId: 'place-palladium',
		answer: 'Palladium Mall',
		baseClue: 'Rated between 4.5 and 5.0 with over 1000 reviews.',
		riddle: 'Rated between 4.5 and 5.0 with over 1000 reviews.',
		source: 'fallback',
		attempts: 0,
		verifierFailures: []
	};

	// 4 Passing Riddles
	it('passes a valid easy tier riddle with street anchor', () => {
		const riddle = 'Seek a bustling shopping mall located on Velachery Main Rd for your afternoon quest.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(true);
		expect(result.reasons).toHaveLength(0);
	});

	it('passes a valid easy tier riddle with area anchor', () => {
		const riddle = 'Spot this busy shopping mall resting quietly inside Indira Gandhi Nagar on your path.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(true);
		expect(result.reasons).toHaveLength(0);
	});

	it('passes a valid medium tier riddle with rating band', () => {
		const riddle = 'Find a shopping mall rated between 4.5 and 5.0 to score points in this hunt.';
		const result = verify(riddle, sampleClueMedium, sampleFact, 'medium');
		expect(result.ok).toBe(true);
		expect(result.reasons).toHaveLength(0);
	});

	it('passes a valid hard tier riddle with rating and review bands', () => {
		const riddle = 'Rated between 4.5 and 5.0 with over 1000 reviews awaits your keen eyes today.';
		const result = verify(riddle, sampleClueHard, sampleFact, 'hard');
		expect(result.ok).toBe(true);
		expect(result.reasons).toHaveLength(0);
	});

	// Failing Case (a): Answer name leaked
	it('rejects when answer name or distinctive word leaks', () => {
		const riddle = 'Walk down Velachery Main Rd until you spot Palladium standing tall ahead of you.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('leaked'))).toBe(true);
	});

	// Failing Case (b): Planted wrong rating
	it('rejects when a planted wrong rating is introduced', () => {
		const riddle = 'Find a shopping mall rated between 3.2 and 3.8 to score points in this hunt.';
		const result = verify(riddle, sampleClueMedium, sampleFact, 'medium');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('Unauthorized number'))).toBe(true);
	});

	// Failing Case (c): Invented proper noun
	it('rejects an invented proper noun or unauthorized capitalized word', () => {
		const riddle = 'Look near Paris on Velachery Main Rd to uncover this shopping mall mystery spot.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('Unauthorized proper noun: "Paris"'))).toBe(true);
	});

	// Failing Case (d): Color word used
	it('rejects when a banned color word is present', () => {
		const riddle = 'Look for a blue shopping mall on Velachery Main Rd during your daytime stroll.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('Banned visual/sensory word'))).toBe(true);
	});

	// Failing Case (e): Too short (< 8 words)
	it('rejects riddles that are too short (< 8 words)', () => {
		const riddle = 'Mall on Velachery Main Rd.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('Too short'))).toBe(true);
	});

	// Failing Case (f): Non-ASCII character
	it('rejects riddles with non-ASCII characters or em dashes', () => {
		const riddle = 'Seek a shopping mall on Velachery Main Rd — the best place in town.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('non-ASCII'))).toBe(true);
	});

	// Failing Case (g): Too long (> 30 words)
	it('rejects riddles exceeding 30 words', () => {
		const riddle =
			'Here on Velachery Main Rd you must walk carefully step by step looking for a shopping mall that has been standing for many years while you enjoy the sunlight and breezes and keep searching until you find it.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('Too long'))).toBe(true);
	});

	// Failing Case (h): Banned sensory words like awning or crowded
	it('rejects riddles mentioning physical features like awning or crowds', () => {
		const riddle = 'Find this crowded shopping mall on Velachery Main Rd during your walk today.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('Banned visual/sensory word used: "crowded"'))).toBe(true);
	});

	// Failing Case (i): Missing anchor facts
	it('rejects easy tier riddle without street or area anchor', () => {
		const riddle = 'A wonderful shopping mall waits quietly for your arrival on this pleasant walking tour.';
		const result = verify(riddle, sampleClueEasy, sampleFact, 'easy');
		expect(result.ok).toBe(false);
		expect(result.reasons.some((r) => r.includes('Missing required anchor fact'))).toBe(true);
	});
});
