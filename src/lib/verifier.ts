import type { FactSheet } from './factsheet';
import type { Clue, DifficultyTier } from './clues';
import { getRatingBand, getReviewCountBand } from './clues';

export interface VerificationResult {
	ok: boolean;
	reasons: string[];
}

export const BANNED_VISUAL_WORDS: string[] = [
	'red', 'blue', 'green', 'yellow', 'black', 'white', 'orange',
	'purple', 'pink', 'brown', 'golden', 'silver', 'grey', 'gray',
	'awning', 'awnings', 'sign', 'signs', 'billboard', 'painted',
	'paint', 'smell', 'scent', 'crowd', 'crowded', 'crowds',
	'facade', 'brick', 'glass', 'neon', 'tall', 'shiny', 'wooden',
	'exterior', 'interior', 'door', 'doors', 'window', 'windows'
];

export const ALLOWED_PROPER_NOUNS: Set<string> = new Set([
	'A', 'An', 'The', 'In', 'On', 'At', 'To', 'From', 'By', 'For',
	'Between', 'Rated', 'Find', 'Seek', 'Where', 'With', 'Near',
	'This', 'Here', 'Search', 'Score', 'Star', 'Stars', 'Reviews',
	'Count', 'Over', 'Under', 'Around', 'Locate', 'Spot', 'Step',
	'I', 'My', 'You', 'Your', 'Can', 'Could', 'Just', 'Walk', 'Look',
	'Come', 'Head', 'Turn', 'Stroll', 'Wander', 'Take', 'Many', 'Few'
]);

// Extract all numbers (integers and decimals) from text
function extractNumbers(text: string): string[] {
	const matches = text.match(/\b\d+(\.\d+)?\b/g);
	return matches ? matches : [];
}

// Build allowed numbers set from FactSheet, rating bands, and review bands
export function buildAllowedNumbers(fact: FactSheet): Set<string> {
	const allowed = new Set<string>();

	if (fact.rating != null) {
		const band = getRatingBand(fact.rating);
		allowed.add(band.min);
		allowed.add(band.max);
		allowed.add(fact.rating.toString());
		allowed.add(fact.rating.toFixed(1));
		allowed.add(Math.floor(fact.rating).toString());
	}

	if (fact.ratingCount != null) {
		allowed.add('50');
		allowed.add('200');
		allowed.add('500');
		allowed.add('1000');
		allowed.add(fact.ratingCount.toString());
	}

	// Extract numbers that naturally occur in street, name, or area (e.g., '100', '15')
	const addressNumbers = extractNumbers(`${fact.street || ''} ${fact.area || ''} ${fact.name}`);
	addressNumbers.forEach((n) => allowed.add(n));

	return allowed;
}

// Build allowed capitalized words from FactSheet and safe dictionary
export function buildAllowedProperNouns(fact: FactSheet): Set<string> {
	const allowed = new Set<string>(ALLOWED_PROPER_NOUNS);

	const addTokens = (str: string | null) => {
		if (!str) return;
		const tokens = str.split(/[\s,.-]+/).filter((t) => t.length > 0);
		tokens.forEach((t) => {
			const capitalized = t.charAt(0).toUpperCase() + t.slice(1);
			allowed.add(capitalized);
			allowed.add(t.toUpperCase());
		});
	};

	addTokens(fact.street);
	addTokens(fact.area);
	addTokens(fact.category);

	return allowed;
}

// Infer tier from clue baseClue structure if tier not explicitly provided
export function inferTier(clue: Clue): DifficultyTier {
	if (clue.baseClue.startsWith('Rated between') && clue.baseClue.includes('reviews.')) {
		return 'hard';
	}
	if (clue.baseClue.includes('rated between')) {
		return 'medium';
	}
	return 'easy';
}

// Pure deterministic verifier - checks all 6 rules from Data Contract
export function verify(
	riddle: string,
	clue: Clue,
	fact: FactSheet,
	tier?: DifficultyTier
): VerificationResult {
	const reasons: string[] = [];
	const resolvedTier = tier || inferTier(clue);

	// Rule 6a: ASCII only
	if (/[^\x20-\x7E\r\n\t]/.test(riddle)) {
		reasons.push('Contains non-ASCII character');
	}

	// Rule 6b: Length between 8 and 30 words
	const words = riddle.trim().split(/\s+/).filter(Boolean);
	if (words.length < 8) {
		reasons.push(`Too short: ${words.length} words (minimum is 8)`);
	} else if (words.length > 30) {
		reasons.push(`Too long: ${words.length} words (maximum is 30)`);
	}

	// Rule 1: Does not contain answer name or distinctive name words longer than 3 letters
	const riddleLower = riddle.toLowerCase();
	const answerLower = fact.name.toLowerCase().trim();

	// Check if entire answer name appears in riddle
	if (riddleLower.includes(answerLower)) {
		reasons.push(`Answer name leaked: "${fact.name}"`);
	}

	const categoryWords = new Set(
		(fact.category || '')
			.toLowerCase()
			.split(/[\s,.-]+/)
			.filter(Boolean)
	);

	const distinctiveAnswerWords = fact.name
		.toLowerCase()
		.split(/[\s,.-]+/)
		.filter((w) => w.length > 3 && !categoryWords.has(w));

	for (const ansWord of distinctiveAnswerWords) {
		const regex = new RegExp(`\\b${ansWord}\\b`, 'i');
		if (regex.test(riddleLower)) {
			reasons.push(`Answer name or word leaked: "${ansWord}"`);
			break;
		}
	}

	// Rule 2: Every number must appear in the allowed set
	const allowedNumbers = buildAllowedNumbers(fact);
	const numbersInRiddle = extractNumbers(riddle);
	for (const num of numbersInRiddle) {
		if (!allowedNumbers.has(num)) {
			reasons.push(`Unauthorized number: "${num}"`);
		}
	}

	// Rule 3: Capitalized words/proper nouns must be in allowed set
	const allowedProperNouns = buildAllowedProperNouns(fact);
	// Check capitalized words that are not the first word of the text
	for (let i = 0; i < words.length; i++) {
		const cleanWord = words[i].replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
		if (!cleanWord || /^\d+$/.test(cleanWord)) continue;

		const isCapitalized = /^[A-Z][a-zA-Z0-9]*$/.test(cleanWord);
		if (isCapitalized) {
			if (!allowedProperNouns.has(cleanWord)) {
				reasons.push(`Unauthorized proper noun: "${cleanWord}"`);
			}
		}
	}

	// Rule 4: Required anchor facts for the tier
	if (resolvedTier === 'easy') {
		const hasStreetAnchor = fact.street && riddleLower.includes(fact.street.toLowerCase());
		const hasAreaAnchor = fact.area && riddleLower.includes(fact.area.toLowerCase());
		if (!hasStreetAnchor && !hasAreaAnchor) {
			reasons.push('Missing required anchor fact: street or area');
		}
	} else if (resolvedTier === 'medium') {
		if (fact.rating != null) {
			const band = getRatingBand(fact.rating);
			const hasBandMin = riddle.includes(band.min);
			const hasBandMax = riddle.includes(band.max);
			if (!hasBandMin || !hasBandMax) {
				reasons.push(`Missing required anchor fact: rating band ${band.min} and ${band.max}`);
			}
		}
	} else if (resolvedTier === 'hard') {
		if (fact.rating != null) {
			const band = getRatingBand(fact.rating);
			if (!riddle.includes(band.min) || !riddle.includes(band.max)) {
				reasons.push(`Missing required anchor fact: rating band ${band.min} and ${band.max}`);
			}
		}
		if (fact.ratingCount != null) {
			const reviewBand = getReviewCountBand(fact.ratingCount);
			const numbersInBand = extractNumbers(reviewBand);
			const hasBandNumbers = numbersInBand.every((n) => riddle.includes(n));
			if (!hasBandNumbers) {
				reasons.push(`Missing required anchor fact: review count band ${reviewBand}`);
			}
		}
	}

	// Rule 5: Banned visual/sensory words
	for (const banned of BANNED_VISUAL_WORDS) {
		const regex = new RegExp(`\\b${banned}\\b`, 'i');
		if (regex.test(riddleLower)) {
			reasons.push(`Banned visual/sensory word used: "${banned}"`);
		}
	}

	return {
		ok: reasons.length === 0,
		reasons
	};
}
