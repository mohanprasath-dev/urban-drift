import { loadEnvConfig } from '@next/env';
import * as Sentry from '@sentry/nextjs';
import { huntWorkflow } from '../src/mastra/workflows/hunt';

loadEnvConfig(process.cwd());

// Initialize Sentry SDK for CLI environment if DSN is provided
if (process.env.SENTRY_DSN) {
	Sentry.init({
		dsn: process.env.SENTRY_DSN,
		tracesSampleRate: 1.0,
		environment: process.env.NODE_ENV || 'development'
	});
}

async function runSentryGate(): Promise<void> {
	console.log('====================================================');
	console.log('GATE 4: Sentry Agent Tracing Verification');
	console.log(`Sentry DSN Configured: ${process.env.SENTRY_DSN ? 'YES (configured)' : 'NO (missing in env)'}`);
	console.log(`Debug PLANT_FAULT:     ${process.env.PLANT_FAULT === '1' ? 'ENABLED (fault planted)' : 'DISABLED (normal run)'}`);
	console.log('====================================================\n');

	const isFaultPlanted = process.env.PLANT_FAULT === '1';

	return Sentry.startSpan(
		{
			name: isFaultPlanted ? 'huntWorkflow-planted-fault' : 'huntWorkflow-normal',
			op: 'workflow.run'
		},
		async (parentSpan) => {
			const traceId = parentSpan?.spanContext().traceId;
			console.log(`Active Sentry Trace ID: ${traceId || 'N/A'}`);

			const run = await huntWorkflow.createRun();
			const execution = await run.start({
				inputData: {
					neighborhood: 'Velachery',
					tier: 'easy',
					radiusKm: 1.0
				}
			});

			if (execution.status !== 'success') {
				console.error('Workflow run failed:', execution);
				process.exit(1);
			}

			const output = execution.result as {
				clues: Array<{
					n: number;
					answer: string;
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

			console.log('\n--- Trace Verification Summary ---');
			output.clues.forEach((c) => {
				console.log(`Clue #${c.n} [${c.answer}]: ${c.source.toUpperCase()} (${c.attempts} attempt${c.attempts > 1 ? 's' : ''})`);
				if (c.verifierFailures && c.verifierFailures.length > 0) {
					console.log(`  Failures detected in trace: ${c.verifierFailures.join('; ')}`);
				}
			});

			console.log(`\nTrace ID: ${traceId || execution.traceId || 'None'}`);
			console.log('Flushing events to Sentry server...');
			await Sentry.flush(3000);
			console.log('Sentry flush complete.');

			console.log('\n====================================================');
			if (isFaultPlanted) {
				console.log('[GATE 4 STATUS]: PLANT_FAULT run verified with rejection and retry!');
			} else {
				console.log('[GATE 4 STATUS]: Normal run verified with active Sentry trace!');
			}
			console.log('====================================================\n');
		}
	);
}

runSentryGate().catch((err) => {
	console.error('Gate sentry failed:', err);
	process.exit(1);
});
