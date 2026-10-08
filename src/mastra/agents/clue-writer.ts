import { Agent } from '@mastra/core/agent';
import { createOllama } from 'ollama-ai-provider';
import { createGroq } from '@ai-sdk/groq';
import type { FactSheet } from '../../lib/factsheet';
import type { DifficultyTier } from '../../lib/clues';

function createModelInstance() {
	if (process.env.GROQ_API_KEY) {
		const groq = createGroq({
			apiKey: process.env.GROQ_API_KEY
		});
		const modelName = process.env.GROQ_MODEL || 'llama-3.2-3b-preview';
		return groq(modelName);
	}

	const baseUrl = process.env.OLLAMA_BASE_URL
		? `${process.env.OLLAMA_BASE_URL.replace(/\/+$/, '')}/api`
		: 'http://localhost:11434/api';
	const modelName = process.env.OLLAMA_MODEL || 'llama3.2';

	const ollama = createOllama({
		baseURL: baseUrl
	});
	return ollama(modelName, {
		numCtx: 2048
	});
}

// Clue Writer Mastra Agent configured per Data Contract
export const clueWriterAgent = new Agent({
	id: 'clue-writer',
	name: 'clue-writer',
	instructions:
		'You are a playful riddle writer for an outdoor walking scavenger hunt. Rewrite factual clue templates into concise riddles without adding new facts or revealing place names.',
	model: createModelInstance()
});

// Construct pure text prompt complying with Data Contract model prompt contract
export function buildWriterPrompt(
	tier: DifficultyTier,
	baseClue: string,
	fact: FactSheet,
	previousFailureReasons?: string[]
): string {
	const allowedFacts = [
		`Tier: ${tier}`,
		`Base clue: "${baseClue}"`,
		fact.street ? `Street: ${fact.street}` : null,
		fact.area ? `Area: ${fact.area}` : null,
		fact.category ? `Category: ${fact.category}` : null,
		fact.rating != null ? `Rating: ${fact.rating}` : null,
		fact.ratingCount != null ? `Review count: ${fact.ratingCount}` : null
	].filter(Boolean).join('\n');

	let requiredAnchor = '';
	if (tier === 'easy') {
		const loc = fact.street ? `on ${fact.street}` : `in ${fact.area}`;
		requiredAnchor = `- You MUST include the exact location phrase: "${loc}".`;
	} else if (tier === 'medium' && fact.rating != null) {
		const floor = Math.floor(fact.rating * 2) / 2;
		const ceil = floor + 0.5;
		requiredAnchor = `- You MUST include the exact rating phrase: "rated between ${floor.toFixed(1)} and ${ceil.toFixed(1)}".`;
	}

	let prompt = `Rewrite this clue in a playful riddle voice for a walking scavenger hunt.
Rules:
- Keep every fact from the base clue.
${requiredAnchor}
- Add no new facts, numbers, or details.
- Mention NO colors, NO visual features (awnings, signs, facades, paint, doors, windows), NO sensory claims (smell, crowd).
- Do NOT mention the place name.
- Between 8 and 30 words. ASCII characters only.
- Output ONLY the riddle text. No preamble, no explanation, no quotes.

Allowed facts:
${allowedFacts}`;

	if (previousFailureReasons && previousFailureReasons.length > 0) {
		prompt += `\n\nPrevious attempt failed verification for these reasons:
${previousFailureReasons.map((r) => `- ${r}`).join('\n')}
Fix these issues in your new output.`;
	}

	return prompt;
}

// Generate clue rewrite using clueWriterAgent with plain text output
export async function writeClueRiddle(
	tier: DifficultyTier,
	baseClue: string,
	fact: FactSheet,
	previousFailureReasons?: string[]
): Promise<string> {
	const prompt = buildWriterPrompt(tier, baseClue, fact, previousFailureReasons);
	const agentAny = clueWriterAgent as unknown as {
		generateLegacy?: (p: string) => Promise<{ text: string }>;
		generate: (p: string) => Promise<{ text: string }>;
	};

	// Handle both AI SDK v4 Ollama legacy method and standard generate()
	let response: { text: string };
	try {
		if (process.env.GROQ_API_KEY) {
			response = await agentAny.generate(prompt);
		} else if (typeof agentAny.generateLegacy === 'function') {
			response = await agentAny.generateLegacy(prompt);
		} else {
			response = await agentAny.generate(prompt);
		}
	} catch {
		if (typeof agentAny.generateLegacy === 'function') {
			response = await agentAny.generateLegacy(prompt);
		} else {
			response = await agentAny.generate(prompt);
		}
	}

	// Strip surrounding quotes and whitespace
	return response.text.trim().replace(/^["']|["']$/g, '');
}
