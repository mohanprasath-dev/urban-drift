import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeFactSheets } from '../src/lib/factsheet';
import { filterSafePlaces } from '../src/lib/safety';
import {
	generateClues,
	buildBaseClue,
	getRatingBand,
	getReviewCountBand,
	isEligibleForTier,
	type FactSheet
} from '../src/lib/clues';

describe('src/lib/clues', () => {
	const cachePath = path.join(
		process.cwd(),
		'data',
		'cache',
		'99ca526cc49bb2c4a273dc6f4e7d506e4ab33fc5.json'
	);
	const rawData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
	const rawResults = rawData.local_results as Array<Record<string, unknown>>;
	const allSheets = normalizeFactSheets(rawResults);
	const safeSheets = filterSafePlaces(allSheets, 5.0);

	it('computes 0.5 wide rating bands correctly', () => {
		expect(getRatingBand(4.2)).toEqual({ min: '4.0', max: '4.5' });
		expect(getRatingBand(4.0)).toEqual({ min: '4.0', max: '4.5' });
		expect(getRatingBand(4.7)).toEqual({ min: '4.5', max: '5.0' });
		expect(getRatingBand(4.5)).toEqual({ min: '4.5', max: '5.0' });
	});

	it('computes discrete review count bands accurately', () => {
		expect(getReviewCountBand(25)).toBe('under 50 reviews');
		expect(getReviewCountBand(120)).toBe('50 to 200 reviews');
		expect(getReviewCountBand(350)).toBe('200 to 500 reviews');
		expect(getReviewCountBand(750)).toBe('500 to 1000 reviews');
		expect(getReviewCountBand(15000)).toBe('over 1000 reviews');
	});

	it('generates 5 clues and aligned answer key for easy tier', () => {
		const result = generateClues(safeSheets, 'easy');
		expect(result.clues).toHaveLength(5);
		expect(result.answerKey).toHaveLength(5);

		result.clues.forEach((clue, index) => {
			expect(clue.n).toBe(index + 1);
			expect(clue.answer).toBe(result.answerKey[index]);
			expect(clue.source).toBe('fallback');
			expect(clue.riddle).toBe(clue.baseClue);
			expect(clue.baseClue).toMatch(/^A [\w\s]+ (on|in) .+\.$/);
		});
	});

	it('generates medium tier clues with category and rating band', () => {
		const result = generateClues(safeSheets, 'medium');
		expect(result.clues).toHaveLength(5);

		result.clues.forEach((clue) => {
			expect(clue.baseClue).toMatch(/^A [\w\s]+ rated between \d\.\d and \d\.\d\.$/);
		});
	});

	it('generates hard tier clues with rating and review count bands, excluding category', () => {
		const result = generateClues(safeSheets, 'hard');
		expect(result.clues).toHaveLength(5);

		result.clues.forEach((clue) => {
			expect(clue.baseClue).toMatch(/^Rated between \d\.\d and \d\.\d with (under 50|50 to 200|200 to 500|500 to 1000|over 1000) reviews\.$/);
			expect(clue.baseClue).not.toContain('A ');
		});
	});

	it('hard tier strictly skips places with null rating or ratingCount', () => {
		const unratedPlace: FactSheet = {
			id: 'test-1',
			name: 'No Rating Shop',
			category: 'bookstore',
			rating: null,
			ratingCount: null,
			street: 'Main St',
			area: 'Velachery',
			lat: 12.98,
			lng: 80.22,
			distanceKm: 0.5,
			hours: null
		};

		const partialPlace: FactSheet = {
			id: 'test-2',
			name: 'Partial Shop',
			category: 'bakery',
			rating: 4.5,
			ratingCount: null,
			street: 'Cross Rd',
			area: 'Velachery',
			lat: 12.98,
			lng: 80.22,
			distanceKm: 0.6,
			hours: null
		};

		expect(isEligibleForTier(unratedPlace, 'hard')).toBe(false);
		expect(isEligibleForTier(partialPlace, 'hard')).toBe(false);

		const result = generateClues([unratedPlace, partialPlace], 'hard');
		expect(result.clues).toHaveLength(0);
		expect(result.warning).toContain('No eligible places found');
	});

	it('returns warning when fewer than 5 places are eligible', () => {
		const singlePlace: FactSheet = {
			id: 'solo-1',
			name: 'Solo Diner',
			category: 'restaurant',
			rating: 4.4,
			ratingCount: 120,
			street: 'Food Street',
			area: 'Adyar',
			lat: 13.0,
			lng: 80.25,
			distanceKm: 0.4,
			hours: 'Open'
		};

		const result = generateClues([singlePlace], 'easy');
		expect(result.clues).toHaveLength(1);
		expect(result.warning).toContain('Found only 1 of 5');
	});
});
