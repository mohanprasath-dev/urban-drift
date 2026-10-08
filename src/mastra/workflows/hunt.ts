import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import { fetchGoogleMaps } from '../../lib/serpapi';
import { normalizeFactSheets, type FactSheet } from '../../lib/factsheet';
import { filterSafePlaces } from '../../lib/safety';
import { generateClues, type Clue, type DifficultyTier } from '../../lib/clues';
import { verify } from '../../lib/verifier';
import { writeClueRiddle } from '../agents/clue-writer';
import { getLiveCallCount } from '../../lib/cache';

const HuntInputSchema = z.object({
	neighborhood: z.string(),
	tier: z.enum(['easy', 'medium', 'hard']),
	radiusKm: z.number().default(1.0)
});

// Step 1: fetchPlaces
const fetchPlacesStep = createStep({
	id: 'fetchPlaces',
	inputSchema: HuntInputSchema,
	outputSchema: z.object({
		rawResults: z.array(z.record(z.any())),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	execute: async ({ inputData }) => {
		const query = `shops near ${inputData.neighborhood} Chennai`;
		const data = await fetchGoogleMaps({ q: query });
		const rawResults = (data.local_results || []) as Array<Record<string, unknown>>;
		return {
			rawResults,
			neighborhood: inputData.neighborhood,
			tier: inputData.tier,
			radiusKm: inputData.radiusKm
		};
	}
});

// Step 2: buildFactSheets
const buildFactSheetsStep = createStep({
	id: 'buildFactSheets',
	inputSchema: z.object({
		rawResults: z.array(z.record(z.any())),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	outputSchema: z.object({
		factSheets: z.array(z.any()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	execute: async ({ inputData }) => {
		const sheets = normalizeFactSheets(inputData.rawResults);
		const safePlaces = filterSafePlaces(sheets, inputData.radiusKm);
		return {
			factSheets: safePlaces,
			neighborhood: inputData.neighborhood,
			tier: inputData.tier,
			radiusKm: inputData.radiusKm
		};
	}
});

// Step 3: selectClues
const selectCluesStep = createStep({
	id: 'selectClues',
	inputSchema: z.object({
		factSheets: z.array(z.any()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	outputSchema: z.object({
		clues: z.array(z.any()),
		answerKey: z.array(z.string()),
		factSheets: z.array(z.any()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	execute: async ({ inputData }) => {
		const { clues, answerKey } = generateClues(
			inputData.factSheets as FactSheet[],
			inputData.tier as DifficultyTier
		);
		return {
			clues,
			answerKey,
			factSheets: inputData.factSheets,
			neighborhood: inputData.neighborhood,
			tier: inputData.tier,
			radiusKm: inputData.radiusKm
		};
	}
});

// Step 4: writeClues
const writeCluesStep = createStep({
	id: 'writeClues',
	inputSchema: z.object({
		clues: z.array(z.any()),
		answerKey: z.array(z.string()),
		factSheets: z.array(z.any()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	outputSchema: z.object({
		writtenClues: z.array(z.any()),
		answerKey: z.array(z.string()),
		factSheets: z.array(z.any()),
		attemptsPerClue: z.record(z.number()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	execute: async ({ inputData }) => {
		const clues = inputData.clues as Clue[];
		const facts = inputData.factSheets as FactSheet[];
		const tier = inputData.tier as DifficultyTier;
		const writtenClues: Clue[] = [];
		const attemptsPerClue: Record<number, number> = {};

		for (const clue of clues) {
			const fact = facts.find((f) => f.id === clue.placeId) || facts[0];
			let attempts = 0;
			let passed = false;
			const failureReasons: string[] = [];

			while (attempts < 3) {
				attempts++;
				try {
					const riddle = await writeClueRiddle(tier, clue.baseClue, fact, failureReasons);
					const verification = verify(riddle, clue, fact, tier);
					if (verification.ok) {
						writtenClues.push({
							...clue,
							riddle,
							source: 'model',
							attempts,
							verifierFailures: []
						});
						passed = true;
						break;
					} else {
						failureReasons.push(...verification.reasons);
					}
				} catch (err: unknown) {
					const msg = err instanceof Error ? err.message : String(err);
					failureReasons.push(`Writer error: ${msg}`);
				}
			}

			attemptsPerClue[clue.n] = attempts;

			if (!passed) {
				writtenClues.push({
					...clue,
					riddle: clue.baseClue,
					source: 'fallback',
					attempts,
					verifierFailures: failureReasons
				});
			}
		}

		return {
			writtenClues,
			answerKey: inputData.answerKey,
			factSheets: inputData.factSheets,
			attemptsPerClue,
			neighborhood: inputData.neighborhood,
			tier: inputData.tier,
			radiusKm: inputData.radiusKm
		};
	}
});

// Step 5: verifyClues
const verifyCluesStep = createStep({
	id: 'verifyClues',
	inputSchema: z.object({
		writtenClues: z.array(z.any()),
		answerKey: z.array(z.string()),
		factSheets: z.array(z.any()),
		attemptsPerClue: z.record(z.number()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	outputSchema: z.object({
		verifiedClues: z.array(z.any()),
		answerKey: z.array(z.string()),
		attemptsPerClue: z.record(z.number()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	execute: async ({ inputData }) => {
		const clues = inputData.writtenClues as Clue[];
		const facts = inputData.factSheets as FactSheet[];
		const tier = inputData.tier as DifficultyTier;

		const verifiedClues: Clue[] = clues.map((clue) => {
			const fact = facts.find((f) => f.id === clue.placeId) || facts[0];
			const result = verify(clue.riddle, clue, fact, tier);
			if (result.ok) {
				return clue;
			}
			// Fall back if verifier detects any issues in final check
			return {
				...clue,
				riddle: clue.baseClue,
				source: 'fallback' as const,
				verifierFailures: result.reasons
			};
		});

		return {
			verifiedClues,
			answerKey: inputData.answerKey,
			attemptsPerClue: inputData.attemptsPerClue,
			neighborhood: inputData.neighborhood,
			tier: inputData.tier,
			radiusKm: inputData.radiusKm
		};
	}
});

// Step 6: assembleCard
const assembleCardStep = createStep({
	id: 'assembleCard',
	inputSchema: z.object({
		verifiedClues: z.array(z.any()),
		answerKey: z.array(z.string()),
		attemptsPerClue: z.record(z.number()),
		neighborhood: z.string(),
		tier: z.enum(['easy', 'medium', 'hard']),
		radiusKm: z.number()
	}),
	outputSchema: z.object({
		clues: z.array(z.any()),
		answerKey: z.array(z.string()),
		meta: z.object({
			neighborhood: z.string(),
			tier: z.string(),
			radiusKm: z.number(),
			liveCalls: z.number(),
			attemptsPerClue: z.record(z.number()),
			durationsPerStep: z.record(z.number()).optional()
		})
	}),
	execute: async ({ inputData }) => {
		return {
			clues: inputData.verifiedClues,
			answerKey: inputData.answerKey,
			meta: {
				neighborhood: inputData.neighborhood,
				tier: inputData.tier,
				radiusKm: inputData.radiusKm,
				liveCalls: getLiveCallCount(),
				attemptsPerClue: inputData.attemptsPerClue
			}
		};
	}
});

// Compose 6-step deterministic sequential Mastra workflow
export const huntWorkflow = createWorkflow({
	id: 'hunt',
	inputSchema: HuntInputSchema,
	outputSchema: z.object({
		clues: z.array(z.any()),
		answerKey: z.array(z.string()),
		meta: z.object({
			neighborhood: z.string(),
			tier: z.string(),
			radiusKm: z.number(),
			liveCalls: z.number(),
			attemptsPerClue: z.record(z.number()),
			durationsPerStep: z.record(z.number()).optional()
		})
	})
})
	.then(fetchPlacesStep)
	.then(buildFactSheetsStep)
	.then(selectCluesStep)
	.then(writeCluesStep)
	.then(verifyCluesStep)
	.then(assembleCardStep)
	.commit();
