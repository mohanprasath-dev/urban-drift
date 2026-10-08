import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'data', 'cache');
const COUNTER_FILE = path.join(CACHE_DIR, '_counter.json');

// Ensure cache directory exists before read/write operations
function ensureCacheDir(): void {
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
	}
}

// Compute deterministic sha1 hash from request parameters
export function getParamsHash(params: Record<string, unknown> | string): string {
	const serialized = typeof params === 'string'
		? params
		: JSON.stringify(params, Object.keys(params).sort());
	return crypto.createHash('sha1').update(serialized).digest('hex');
}

export function getCached<T>(params: Record<string, unknown> | string): T | null {
	ensureCacheDir();
	const hash = getParamsHash(params);
	const filePath = path.join(CACHE_DIR, `${hash}.json`);
	const demoFilePath = path.join(process.cwd(), 'data', 'demo', `${hash}.json`);
	const isDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

	// In DEMO_MODE, read from data/demo directory
	if (isDemoMode && fs.existsSync(demoFilePath)) {
		try {
			const content = fs.readFileSync(demoFilePath, 'utf-8');
			console.log(`[DEMO CACHE HIT] ${hash}`);
			return JSON.parse(content) as T;
		} catch (err) {
			console.warn(`[DEMO CACHE WARN] Failed to read demo cached file for ${hash}:`, err);
		}
	}

	if (fs.existsSync(filePath)) {
		try {
			const content = fs.readFileSync(filePath, 'utf-8');
			console.log(`[CACHE HIT] ${hash}`);
			return JSON.parse(content) as T;
		} catch (err) {
			console.warn(`[CACHE WARN] Failed to read cached file for ${hash}:`, err);
			return null;
		}
	}

	console.log(`[CACHE MISS] ${hash}`);
	return null;
}

export function setCached<T>(params: Record<string, unknown> | string, data: T): void {
	ensureCacheDir();
	const hash = getParamsHash(params);
	const filePath = path.join(CACHE_DIR, `${hash}.json`);
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function recordLiveCall(): number {
	ensureCacheDir();
	let counter = { liveCalls: 0 };
	if (fs.existsSync(COUNTER_FILE)) {
		try {
			counter = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
		} catch {
			counter = { liveCalls: 0 };
		}
	}
	counter.liveCalls = (counter.liveCalls || 0) + 1;
	fs.writeFileSync(COUNTER_FILE, JSON.stringify(counter, null, 2), 'utf-8');
	return counter.liveCalls;
}

export function getLiveCallCount(): number {
	if (fs.existsSync(COUNTER_FILE)) {
		try {
			const counter = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
			return counter.liveCalls || 0;
		} catch {
			return 0;
		}
	}
	return 0;
}
