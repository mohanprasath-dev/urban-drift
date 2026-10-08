import { loadEnvConfig } from '@next/env';
import fs from 'fs';
import path from 'path';
import { normalizeFactSheets } from '../src/lib/factsheet';
import { filterSafePlaces } from '../src/lib/safety';
import { generateClues, type DifficultyTier } from '../src/lib/clues';
import { verify } from '../src/lib/verifier';
import { writeClueRiddle } from '../src/mastra/agents/clue-writer';

loadEnvConfig(process.cwd());

async function runWriterGate(): Promise<void> {
	console.log('====================================================');
	console.log('GATE 2: Ollama Clue Writer & Timing Benchmark');
	console.log(`Ollama Model: ${process.env.OLLAMA_MODEL || 'llama3.2'}`);
	console.log(`Ollama Endpoint: ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`);
	console.log('====================================================\n');

	// Load cached Velachery results
	const cacheFile = path.join(process.cwd(), 'data', 'cache', '99ca526cc49bb2c4a273dc6f4e7d506e4ab33fc5.json');
	if (!fs.existsSync(cacheFile)) {
		throw new Error(`Cache file not found at ${cacheFile}. Run npm run gate:data first.`);
	}

	const rawData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
	const rawResults = rawData.local_results as Array<Record<string, unknown>>;
	const allPlaces = normalizeFactSheets(rawResults);
	const safePlaces = filterSafePlaces(allPlaces, 5.0);

	const tier: DifficultyTier = 'easy';
	const { clues, answerKey } = generateClues(safePlaces, tier);

	console.log(`Selected 5 places for ${tier.toUpperCase()} tier:`);
	clues.forEach((c) => console.log(`- ${c.n}. ${c.answer}: "${c.baseClue}"`));
	console.log('\n--- Rewriting clues via Ollama agent with Verifier loop ---\n');

	const startTime = Date.now();
	const maxRetries = 3;

	for (let i = 0; i < clues.length; i++) {
		const clue = clues[i];
		const fact = safePlaces.find((p) => p.id === clue.placeId) || safePlaces[i];
		const clueStartTime = Date.now();
		let attempts = 0;
		const failureReasons: string[] = [];
		let passed = false;

		while (attempts < maxRetries) {
			attempts++;
			try {
				const candidateRiddle = await writeClueRiddle(
					tier,
					clue.baseClue,
					fact,
					failureReasons
				);

				const verification = verify(candidateRiddle, clue, fact, tier);
				if (verification.ok) {
					clue.riddle = candidateRiddle;
					clue.source = 'model';
					clue.attempts = attempts;
					passed = true;
					break;
				} else {
					failureReasons.push(...verification.reasons);
				}
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : String(err);
				failureReasons.push(`Model error: ${msg}`);
			}
		}

		if (!passed) {
			clue.riddle = clue.baseClue;
			clue.source = 'fallback';
			clue.attempts = attempts;
			clue.verifierFailures = failureReasons;
		}

		const elapsedClue = ((Date.now() - clueStartTime) / 1000).toFixed(2);
		console.log(`Clue #${clue.n} [${clue.answer}]`);
		console.log(`  Source:   ${clue.source.toUpperCase()} (${clue.attempts} attempt${clue.attempts > 1 ? 's' : ''})`);
		console.log(`  Riddle:   "${clue.riddle}"`);
		console.log(`  Duration: ${elapsedClue}s`);
		if (clue.verifierFailures && clue.verifierFailures.length > 0) {
			console.log(`  Verifier notes: ${clue.verifierFailures.join('; ')}`);
		}
		console.log('');
	}

	const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(2);
	console.log('====================================================');
	console.log(`TOTAL WALL TIME: ${totalElapsed} seconds`);
	console.log('====================================================\n');

	// Planted-fact test
	console.log('--- Planted-Fact Verification Test ---');
	const testFact = { ...safePlaces[0], rating: 4.5 };
	const testClue = {
		n: 1,
		placeId: testFact.id,
		answer: testFact.name,
		baseClue: 'A shopping mall rated between 4.5 and 5.0.',
		riddle: 'A shopping mall rated between 4.5 and 5.0.',
		source: 'model' as const,
		attempts: 1,
		verifierFailures: []
	};

	// Corrupt rating to 2.1 to plant wrong fact
	const corruptedFact = { ...testFact, rating: 2.1 };
	const plantedVerification = verify(testClue.riddle, testClue, corruptedFact, 'medium');

	if (!plantedVerification.ok) {
		console.log('[PLANTED FACT TEST PASSED]: Verifier caught planted wrong rating!');
		console.log('Rejection reasons:', plantedVerification.reasons.join(', '));
	} else {
		console.error('[PLANTED FACT TEST FAILED]: Verifier failed to reject corrupted rating.');
	}

	console.log('\nGATE 2 evaluation:');
	const totalSeconds = parseFloat(totalElapsed);
	if (totalSeconds <= 45) {
		console.log(`[GATE 2 STATUS]: PASSED (Wall time ${totalSeconds}s <= 45s target)`);
	} else {
		console.log(`[GATE 2 STATUS]: WARNING (Wall time ${totalSeconds}s > 45s target)`);
	}
}

runWriterGate().catch((err) => {
	console.error('Gate writer fatal error:', err);
	process.exit(1);
});
