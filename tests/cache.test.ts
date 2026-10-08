import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getCached, setCached, recordLiveCall, getLiveCallCount, getParamsHash } from '../src/lib/cache';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const COUNTER_FILE = path.join(CACHE_DIR, '_counter.json');

describe('src/lib/cache', () => {
	const testParams = { engine: 'google_maps', q: 'test query' };
	const testHash = getParamsHash(testParams);
	const testCacheFile = path.join(CACHE_DIR, `${testHash}.json`);

	beforeEach(() => {
		if (fs.existsSync(testCacheFile)) {
			fs.unlinkSync(testCacheFile);
		}
	});

	afterEach(() => {
		if (fs.existsSync(testCacheFile)) {
			fs.unlinkSync(testCacheFile);
		}
	});

	it('computes deterministic sha1 hash regardless of key order', () => {
		const hash1 = getParamsHash({ a: 1, b: 2 });
		const hash2 = getParamsHash({ b: 2, a: 1 });
		expect(hash1).toBe(hash2);
	});

	it('returns null on cache miss', () => {
		const result = getCached(testParams);
		expect(result).toBeNull();
	});

	it('writes and reads cached content', () => {
		const dummyData = { local_results: [{ title: 'Shop A' }] };
		setCached(testParams, dummyData);

		const cached = getCached<typeof dummyData>(testParams);
		expect(cached).not.toBeNull();
		expect(cached?.local_results[0].title).toBe('Shop A');
	});

	it('increments and tracks live call counter', () => {
		const before = getLiveCallCount();
		const incremented = recordLiveCall();
		expect(incremented).toBe(before + 1);
		expect(getLiveCallCount()).toBe(before + 1);
	});
});
