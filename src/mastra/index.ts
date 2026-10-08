import { Mastra } from '@mastra/core';
import { huntWorkflow } from './workflows/hunt';
import { clueWriterAgent } from './agents/clue-writer';

// Central Mastra instance registering workflows and agents
export const mastra = new Mastra({
	agents: {
		clueWriter: clueWriterAgent
	},
	workflows: {
		hunt: huntWorkflow
	}
});
