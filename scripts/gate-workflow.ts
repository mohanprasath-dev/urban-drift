import { loadEnvConfig } from '@next/env';
import { huntWorkflow } from '../src/mastra/workflows/hunt';

loadEnvConfig(process.cwd());

async function runWorkflowGate(): Promise<void> {
	const args = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
	const neighborhood = args[0] || 'Velachery';
	const tier = (args[1] || 'easy') as 'easy' | 'medium' | 'hard';
	const radiusKm = args[2] ? parseFloat(args[2]) : 1.0;

	console.log('====================================================');
	console.log('GATE 3: Mastra End-to-End Workflow Runner');
	console.log(`Target Neighborhood: ${neighborhood}`);
	console.log(`Tier:                ${tier.toUpperCase()}`);
	console.log(`Walking Radius:      ${radiusKm} km`);
	console.log('====================================================\n');

	const overallStart = Date.now();
	console.log('Starting Mastra workflow run...');

	const run = await huntWorkflow.createRun();
	const execution = await run.start({
		inputData: {
			neighborhood,
			tier,
			radiusKm
		}
	});

	const overallDuration = ((Date.now() - overallStart) / 1000).toFixed(2);

	if (execution.status !== 'success') {
		console.error('Workflow failed execution:', execution);
		process.exit(1);
	}

	console.log('\n--- Step Durations & Execution Path ---');
	const steps = execution.steps as Record<string, { startedAt?: number; endedAt?: number; status?: string }>;
	const stepPath = execution.stepExecutionPath || Object.keys(steps).filter((k) => k !== 'input');

	for (const stepName of stepPath) {
		const step = steps[stepName];
		if (step && step.startedAt && step.endedAt) {
			const durationMs = step.endedAt - step.startedAt;
			console.log(`- Step "${stepName}": ${durationMs} ms (${step.status})`);
		} else {
			console.log(`- Step "${stepName}": completed`);
		}
	}

	const output = execution.result as {
		clues: Array<{
			n: number;
			answer: string;
			baseClue: string;
			riddle: string;
			source: string;
			attempts: number;
			verifierFailures?: string[];
		}>;
		answerKey: string[];
		meta: {
			liveCalls: number;
			attemptsPerClue: Record<number, number>;
		};
	};

	console.log('\n--- Final Clues Generated (5 Clues) ---');
	output.clues.forEach((c) => {
		console.log(`\n[Clue #${c.n}] (${c.source.toUpperCase()}, ${c.attempts} attempt${c.attempts > 1 ? 's' : ''})`);
		console.log(`  Riddle: "${c.riddle}"`);
		console.log(`  Answer: ${c.answer}`);
	});

	console.log('\n--- Answer Key ---');
	console.log(output.answerKey.map((ans, idx) => `${idx + 1}. ${ans}`).join('\n'));

	console.log('\n--- Metadata ---');
	console.log(`Live Calls Made: ${output.meta.liveCalls}`);
	console.log('Attempts Per Clue:', JSON.stringify(output.meta.attemptsPerClue));
	console.log(`Total Workflow Wall Time: ${overallDuration}s`);

	console.log('\n====================================================');
	console.log('[GATE 3 STATUS]: PASSED (Workflow executed end to end)');
	console.log('====================================================\n');
}

runWorkflowGate().catch((err) => {
	console.error('Fatal workflow error:', err);
	process.exit(1);
});
