import { Mastra } from '@mastra/core';
import { Observability } from '@mastra/observability';
import { SentryExporter } from '@mastra/sentry';
import { huntWorkflow } from './workflows/hunt';
import { clueWriterAgent } from './agents/clue-writer';

const exporters = [];

if (process.env.SENTRY_DSN) {
	exporters.push(
		new SentryExporter({
			dsn: process.env.SENTRY_DSN,
			tracesSampleRate: 1.0
		})
	);
}

// Central Mastra instance with Sentry observability exporter
export const mastra = new Mastra({
	observability: new Observability({
		configs: {
			default: {
				serviceName: 'urban-drift',
				exporters
			}
		}
	}),
	agents: {
		clueWriter: clueWriterAgent
	},
	workflows: {
		hunt: huntWorkflow
	}
});

