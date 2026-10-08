import { haversineDistanceKm } from './geo';
import { getParamsHash } from './cache';

export interface FactSheet {
	id: string;            // place_id or hash
	name: string;          // title
	category: string;      // from type, lowercased
	rating: number | null;
	ratingCount: number | null;
	street: string | null; // parsed from address, may be null
	area: string | null;   // locality from address, may be null
	lat: number;
	lng: number;
	distanceKm: number;    // from search center
	hours: string | null;
}

// Street-identifying regex keywords
const STREET_REGEX = /\b(rd|road|st|street|salai|lane|ave|avenue|cross|highway|boulevard)\b/i;

// Words indicating city, state, country, or postal codes to avoid as locality
const NON_AREA_KEYWORDS = /\b(chennai|tamil nadu|india|\d{6})\b/i;

// Parse street from comma-separated address when unambiguous
export function parseStreet(address: string | null | undefined): string | null {
	if (!address) return null;
	const parts = address.split(',').map((p) => p.trim());

	for (const part of parts) {
		if (STREET_REGEX.test(part)) {
			// Strip common location prefixes if present
			const cleaned = part.replace(/^(near|opp|opposite|behind|beside)\s+/i, '').trim();
			if (cleaned.length > 2) {
				return cleaned;
			}
		}
	}
	return null;
}

// Parse locality or area from comma-separated address when unambiguous
export function parseArea(address: string | null | undefined, extractedStreet?: string | null): string | null {
	if (!address) return null;
	const parts = address.split(',').map((p) => p.trim());

	// Check for named neighborhood patterns (e.g., *Nagar, *Colony, *Puram)
	const areaPattern = /\b([A-Za-z\s]+(nagar|colony|puram|layout|enclave|pakkam))\b/i;
	for (const part of parts) {
		if (part === extractedStreet) continue;
		const match = part.match(areaPattern);
		if (match) {
			return match[1].trim();
		}
	}

	// Look backwards from the city identifier (e.g. preceding 'Chennai')
	const cityIndex = parts.findIndex((p) => /\bchennai\b/i.test(p));
	if (cityIndex > 0) {
		const candidate = parts[cityIndex - 1];
		if (candidate !== extractedStreet && !NON_AREA_KEYWORDS.test(candidate) && candidate.length > 2) {
			return candidate;
		}
	}

	return null;
}

export interface GeoPoint {
	lat: number;
	lng: number;
}

// Normalize raw SerpApi result item into validated FactSheet
export function normalizeFactSheet(
	raw: Record<string, unknown>,
	center?: GeoPoint
): FactSheet | null {
	const name = typeof raw.title === 'string' ? raw.title.trim() : null;
	if (!name) return null;

	const gps = raw.gps_coordinates as { latitude?: number; longitude?: number } | undefined;
	const lat = typeof gps?.latitude === 'number' ? gps.latitude : null;
	const lng = typeof gps?.longitude === 'number' ? gps.longitude : null;

	if (lat == null || lng == null) {
		return null;
	}

	// Raw type may be in 'type' or array 'types'
	let category = '';
	if (typeof raw.type === 'string') {
		category = raw.type.trim().toLowerCase();
	} else if (Array.isArray(raw.types) && typeof raw.types[0] === 'string') {
		category = raw.types[0].trim().toLowerCase();
	}

	const rating = typeof raw.rating === 'number' ? raw.rating : null;
	const ratingCount = typeof raw.reviews === 'number' ? raw.reviews : null;

	const rawAddress = typeof raw.address === 'string' ? raw.address : null;
	const street = parseStreet(rawAddress);
	const area = parseArea(rawAddress, street);

	const hours = typeof raw.hours === 'string'
		? raw.hours
		: typeof raw.open_state === 'string'
			? raw.open_state
			: null;

	const id = typeof raw.place_id === 'string'
		? raw.place_id
		: typeof raw.data_id === 'string'
			? raw.data_id
			: getParamsHash(`${name}-${lat}-${lng}`);

	const distanceKm = center
		? haversineDistanceKm(center.lat, center.lng, lat, lng)
		: 0;

	return {
		id,
		name,
		category,
		rating,
		ratingCount,
		street,
		area,
		lat,
		lng,
		distanceKm,
		hours
	};
}

export function normalizeFactSheets(
	results: Array<Record<string, unknown>>,
	center?: GeoPoint
): FactSheet[] {
	const normalized: FactSheet[] = [];

	// If center not provided, default center to first item with valid coordinates
	let computedCenter = center;
	if (!computedCenter) {
		const firstWithGps = results.find(
			(r) => (r.gps_coordinates as { latitude?: number; longitude?: number })?.latitude != null
		);
		if (firstWithGps) {
			const gps = firstWithGps.gps_coordinates as { latitude: number; longitude: number };
			computedCenter = { lat: gps.latitude, lng: gps.longitude };
		}
	}

	for (const raw of results) {
		const sheet = normalizeFactSheet(raw, computedCenter);
		if (sheet) {
			normalized.push(sheet);
		}
	}

	return normalized;
}
