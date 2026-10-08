import { NextRequest, NextResponse } from 'next/server';
import { huntWorkflow } from '@/mastra/workflows/hunt';

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim() : '';
		const tier = ['easy', 'medium', 'hard'].includes(body.tier) ? body.tier : 'easy';
		const radiusKm = typeof body.radiusKm === 'number' && body.radiusKm > 0 ? body.radiusKm : 1.0;

		if (!neighborhood) {
			return NextResponse.json(
				{ error: 'Neighborhood is required. Please enter a neighborhood name.' },
				{ status: 400 }
			);
		}

		const run = await huntWorkflow.createRun();
		const execution = await run.start({
			inputData: {
				neighborhood,
				tier,
				radiusKm
			}
		});

		if (execution.status !== 'success' || !execution.result) {
			return NextResponse.json(
				{ error: 'Workflow execution failed. Please check server logs.' },
				{ status: 500 }
			);
		}

		const result = execution.result as {
			clues: Array<unknown>;
			answerKey: string[];
			meta: Record<string, unknown>;
		};

		if (!result.clues || result.clues.length === 0) {
			return NextResponse.json(
				{ error: `No safe public places found within ${radiusKm} km in "${neighborhood}". Try increasing the walking radius or trying another neighborhood.` },
				{ status: 404 }
			);
		}

		return NextResponse.json(result);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);

		// Handle specific known error scenarios with user-friendly messages
		if (message.includes('ECONNREFUSED') || message.includes('Failed to fetch') || message.includes('fetch failed')) {
			return NextResponse.json(
				{ error: 'Cannot connect to Ollama. Ensure Ollama is running locally on port 11434 (run "ollama serve").' },
				{ status: 503 }
			);
		}

		if (message.includes('SERPAPI_KEY') || message.includes('SerpApi')) {
			return NextResponse.json(
				{ error: `SerpApi Error: ${message}` },
				{ status: 502 }
			);
		}

		return NextResponse.json(
			{ error: `Unexpected error during generation: ${message}` },
			{ status: 500 }
		);
	}
}
