import type { FactSheet } from './factsheet';

export type DifficultyTier = 'easy' | 'medium' | 'hard';

export interface Clue {
	n: number;                 // 1..5
	placeId: string;
	answer: string;            // place name, goes to answer key only
	baseClue: string;          // deterministic text from the tier template
	riddle: string;            // model rewrite, or baseClue on fallback
	source: 'model' | 'fallback';
	attempts: number;          // 0..3
	verifierFailures: string[]; // reasons, for tracing
}

export interface ClueGenerationResult {
	clues: Clue[];
	answerKey: string[];
	warning?: string;
}

// Compute 0.5 wide rating band [min, max]
export function getRatingBand(rating: number): { min: string; max: string } {
	const floor = Math.floor(rating * 2) / 2;
	const ceil = floor + 0.5;
	return {
		min: floor.toFixed(1),
		max: ceil.toFixed(1)
	};
}

// Compute discrete review count band per Data Contract specification
export function getReviewCountBand(count: number): string {
	if (count < 50) return 'under 50 reviews';
	if (count < 200) return '50 to 200 reviews';
	if (count < 500) return '200 to 500 reviews';
	if (count < 1000) return '500 to 1000 reviews';
	return 'over 1000 reviews';
}

// Determine if a FactSheet has the mandatory fields required for a tier
export function isEligibleForTier(place: FactSheet, tier: DifficultyTier): boolean {
	if (!place.name) return false;

	if (tier === 'easy') {
		const hasLocation = Boolean(place.street || place.area);
		return Boolean(place.category && hasLocation);
	}

	if (tier === 'medium') {
		return Boolean(place.category && place.rating != null);
	}

	if (tier === 'hard') {
		return place.rating != null && place.ratingCount != null;
	}

	return false;
}

// Format the deterministic baseClue string strictly per Data Contract rules
export function buildBaseClue(place: FactSheet, tier: DifficultyTier): string {
	if (tier === 'easy') {
		const loc = place.street ? `on ${place.street}` : `in ${place.area}`;
		return `A ${place.category} ${loc}.`;
	}

	if (tier === 'medium') {
		const band = getRatingBand(place.rating!);
		return `A ${place.category} rated between ${band.min} and ${band.max}.`;
	}

	// hard tier: rating band + review count band, no category
	const band = getRatingBand(place.rating!);
	const reviewBand = getReviewCountBand(place.ratingCount!);
	return `Rated between ${band.min} and ${band.max} with ${reviewBand}.`;
}

// Select up to 5 places balancing category variety and distance spread
export function selectPlacesForTier(
	places: FactSheet[],
	tier: DifficultyTier,
	targetCount = 5
): { selected: FactSheet[]; warning?: string } {
	const eligible = places.filter((p) => isEligibleForTier(p, tier));

	if (eligible.length === 0) {
		return {
			selected: [],
			warning: `No eligible places found for ${tier} tier.`
		};
	}

	// Sort by distance to prioritize spreading
	const sorted = [...eligible].sort((a, b) => a.distanceKm - b.distanceKm);

	const selected: FactSheet[] = [];
	const seenCategories = new Set<string>();

	// Pass 1: pick places with unique categories
	for (const place of sorted) {
		if (selected.length >= targetCount) break;
		if (tier === 'hard' || !seenCategories.has(place.category)) {
			selected.push(place);
			seenCategories.add(place.category);
		}
	}

	// Pass 2: fill remaining slots if fewer than targetCount
	if (selected.length < targetCount) {
		for (const place of sorted) {
			if (selected.length >= targetCount) break;
			if (!selected.some((s) => s.id === place.id)) {
				selected.push(place);
			}
		}
	}

	let warning: string | undefined;
	if (selected.length < targetCount) {
		warning = `Found only ${selected.length} of ${targetCount} requested places for ${tier} tier.`;
	}

	return { selected, warning };
}

// Generate deterministic Clue[] and Answer Key for the given tier
export function generateClues(
	places: FactSheet[],
	tier: DifficultyTier
): ClueGenerationResult {
	const { selected, warning } = selectPlacesForTier(places, tier, 5);

	const clues: Clue[] = selected.map((place, idx) => {
		const baseClue = buildBaseClue(place, tier);
		return {
			n: idx + 1,
			placeId: place.id,
			answer: place.name,
			baseClue,
			riddle: baseClue,
			source: 'fallback',
			attempts: 0,
			verifierFailures: []
		};
	});

	const answerKey = clues.map((c) => c.answer);

	return {
		clues,
		answerKey,
		warning
	};
}
