import { haversineDistanceMeters } from './geo';
import type { FactSheet } from './factsheet';

export const DROPPED_CATEGORIES: string[] = [
	'hospital',
	'police',
	'government office',
	'school',
	'bank branch interior',
	'bar',
	'nightclub',
	'liquor store',
	'construction',
	'industrial',
	'funeral',
	'private residence',
	'apartment',
	'residential'
];

export const SAFETY_NOTE =
	'Public places only. Go in daylight. Watch traffic. Stay aware. Your safety comes first.';

// Determine if a category is permitted under safety guidelines
export function isCategoryAllowed(category: string): boolean {
	const normalized = category.toLowerCase().trim();
	if (!normalized) return false;

	return !DROPPED_CATEGORIES.some((dropped) =>
		normalized.includes(dropped)
	);
}

// Filter and sanitize places according to Data Contract safety criteria
export function filterSafePlaces(
	places: FactSheet[],
	radiusKm: number
): FactSheet[] {
	const validPlaces: FactSheet[] = [];

	for (const place of places) {
		// Rule 1: Keep only places with name, coordinates, and category
		if (!place.name || place.lat == null || place.lng == null || !place.category) {
			continue;
		}

		// Rule 2: Drop excluded categories
		if (!isCategoryAllowed(place.category)) {
			continue;
		}

		// Rule 3: Drop places exceeding search radius
		if (place.distanceKm > radiusKm) {
			continue;
		}

		// Rule 4: Drop duplicates with identical name within 50 meters
		const isDuplicate = validPlaces.some((existing) => {
			const sameName = existing.name.trim().toLowerCase() === place.name.trim().toLowerCase();
			if (!sameName) return false;
			const distMeters = haversineDistanceMeters(existing.lat, existing.lng, place.lat, place.lng);
			return distMeters <= 50;
		});

		if (isDuplicate) {
			continue;
		}

		validPlaces.push(place);
	}

	// Rule 5: Prefer places with rating and ratingCount present
	return validPlaces.sort((a, b) => {
		const aHasRating = a.rating != null && a.ratingCount != null ? 1 : 0;
		const bHasRating = b.rating != null && b.ratingCount != null ? 1 : 0;
		if (bHasRating !== aHasRating) {
			return bHasRating - aHasRating;
		}
		return a.distanceKm - b.distanceKm;
	});
}
