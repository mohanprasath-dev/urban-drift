import { getCached, setCached, recordLiveCall } from './cache';

export interface SerpApiMapsParams {
	q: string;
	ll?: string;
	type?: string;
	hl?: string;
}

export interface SerpApiMapsResponse {
	search_metadata?: Record<string, unknown>;
	search_parameters?: Record<string, unknown>;
	local_results?: Array<Record<string, unknown>>;
	place_results?: Record<string, unknown>;
	error?: string;
	[key: string]: unknown;
}

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';

// Query SerpApi google_maps engine with disk caching
export async function fetchGoogleMaps(params: SerpApiMapsParams): Promise<SerpApiMapsResponse> {
	const normalizedParams: Record<string, string> = {
		engine: 'google_maps',
		q: params.q,
		type: params.type || 'search',
		hl: params.hl || 'en'
	};

	if (params.ll) {
		normalizedParams.ll = params.ll;
	}

	// Key cache only by query parameters, never include the secret API key
	const cached = getCached<SerpApiMapsResponse>(normalizedParams);
	if (cached) {
		return cached;
	}

	const isDemoMode = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
	if (isDemoMode) {
		// In DEMO_MODE, strictly make zero live network calls; fallback to first available demo fixture
		const fs = await import('fs');
		const path = await import('path');
		const demoDir = path.join(process.cwd(), 'data', 'demo');
		const demoFiles = fs.readdirSync(demoDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
		if (demoFiles.length > 0) {
			const fallbackFile = path.join(demoDir, demoFiles[0]);
			console.log(`[DEMO MODE] Using offline demo fixture ${demoFiles[0]}`);
			return JSON.parse(fs.readFileSync(fallbackFile, 'utf-8')) as SerpApiMapsResponse;
		}
		throw new Error('[DEMO MODE] No matching demo dataset found in data/demo. Live calls are blocked in DEMO_MODE.');
	}

	const apiKey = process.env.SERPAPI_KEY;
	if (!apiKey) {
		throw new Error('[NEEDS INPUT: SERPAPI_KEY environment variable is missing]');
	}

	const searchUrl = new URL(SERPAPI_ENDPOINT);
	Object.entries(normalizedParams).forEach(([key, val]) => {
		searchUrl.searchParams.set(key, val);
	});
	searchUrl.searchParams.set('api_key', apiKey);

	recordLiveCall();

	const response = await fetch(searchUrl.toString(), {
		method: 'GET',
		headers: {
			'Accept': 'application/json'
		}
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`SerpApi request failed with status ${response.status}: ${text}`);
	}

	const data = (await response.json()) as SerpApiMapsResponse;

	if (data.error) {
		throw new Error(`SerpApi returned error: ${data.error}`);
	}

	setCached(normalizedParams, data);
	return data;
}
