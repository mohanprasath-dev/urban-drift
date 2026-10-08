import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeFactSheet, normalizeFactSheets, type FactSheet } from '../src/lib/factsheet';
import { filterSafePlaces, isCategoryAllowed, DROPPED_CATEGORIES } from '../src/lib/safety';
import { haversineDistanceKm, haversineDistanceMeters } from '../src/lib/geo';

describe('src/lib/geo', () => {
	it('calculates accurate haversine distance in km and meters', () => {
		// Chennai Central (13.0827, 80.2707) to Egmore (13.0784, 80.2606) ~ 1.19 km
		const km = haversineDistanceKm(13.0827, 80.2707, 13.0784, 80.2606);
		const meters = haversineDistanceMeters(13.0827, 80.2707, 13.0784, 80.2606);
		expect(km).toBeGreaterThan(1.0);
		expect(km).toBeLessThan(1.5);
		expect(meters).toBeCloseTo(km * 1000, -1);
	});
});

describe('src/lib/factsheet & safety with real cached fixture', () => {
	const cachePath = path.join(
		process.cwd(),
		'data',
		'cache',
		'99ca526cc49bb2c4a273dc6f4e7d506e4ab33fc5.json'
	);
	const rawData = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
	const rawResults = rawData.local_results as Array<Record<string, unknown>>;

	it('produces FactSheet[] from real cached response', () => {
		const center = { lat: 12.9815, lng: 80.218 };
		const sheets = normalizeFactSheets(rawResults, center);

		expect(sheets.length).toBeGreaterThan(0);
		expect(sheets[0]).toHaveProperty('id');
		expect(sheets[0]).toHaveProperty('name');
		expect(sheets[0]).toHaveProperty('category');
		expect(sheets[0]).toHaveProperty('lat');
		expect(sheets[0]).toHaveProperty('lng');
		expect(typeof sheets[0].distanceKm).toBe('number');
	});

	it('leaves missing fields as null without inventing data', () => {
		const rawWithoutRating = {
			title: 'Unrated Shop',
			type: 'Book store',
			address: 'Velachery Main Rd, Chennai',
			gps_coordinates: { latitude: 12.98, longitude: 80.22 }
		};

		const sheet = normalizeFactSheet(rawWithoutRating);
		expect(sheet).not.toBeNull();
		expect(sheet?.rating).toBeNull();
		expect(sheet?.ratingCount).toBeNull();
		expect(sheet?.hours).toBeNull();
	});

	it('drops categories in the excluded list', () => {
		expect(isCategoryAllowed('Shopping mall')).toBe(true);
		expect(isCategoryAllowed('Hospital')).toBe(false);
		expect(isCategoryAllowed('Police station')).toBe(false);
		expect(isCategoryAllowed('Cocktail bar')).toBe(false);

		const fakeHospital: FactSheet = {
			id: 'hosp-1',
			name: 'City Care Hospital',
			category: 'general hospital',
			rating: 4.8,
			ratingCount: 500,
			street: 'Velachery Rd',
			area: 'Velachery',
			lat: 12.981,
			lng: 80.218,
			distanceKm: 0.2,
			hours: 'Open 24 hours'
		};

		const filtered = filterSafePlaces([fakeHospital], 1.5);
		expect(filtered).toHaveLength(0);
	});

	it('drops duplicate places with same name within 50 meters', () => {
		const placeA: FactSheet = {
			id: 'dup-1',
			name: 'Coffee Day',
			category: 'cafe',
			rating: 4.2,
			ratingCount: 150,
			street: 'Main Rd',
			area: 'Velachery',
			lat: 12.98000,
			lng: 80.21800,
			distanceKm: 0.3,
			hours: 'Open'
		};

		// 15 meters apart with identical name
		const placeB: FactSheet = {
			id: 'dup-2',
			name: 'Coffee Day',
			category: 'cafe',
			rating: 4.2,
			ratingCount: 150,
			street: 'Main Rd',
			area: 'Velachery',
			lat: 12.98010,
			lng: 80.21810,
			distanceKm: 0.31,
			hours: 'Open'
		};

		const filtered = filterSafePlaces([placeA, placeB], 1.5);
		expect(filtered).toHaveLength(1);
	});

	it('drops places outside the specified radius', () => {
		const nearby: FactSheet = {
			id: 'near-1',
			name: 'Local Bakery',
			category: 'bakery',
			rating: 4.5,
			ratingCount: 200,
			street: '1st Cross',
			area: 'Velachery',
			lat: 12.981,
			lng: 80.218,
			distanceKm: 0.8,
			hours: 'Open'
		};

		const faraway: FactSheet = {
			id: 'far-1',
			name: 'Distant Mart',
			category: 'supermarket',
			rating: 4.3,
			ratingCount: 300,
			street: 'Expressway',
			area: 'Tambaram',
			lat: 12.92,
			lng: 80.12,
			distanceKm: 3.5,
			hours: 'Open'
		};

		const filtered = filterSafePlaces([nearby, faraway], 1.0);
		expect(filtered).toHaveLength(1);
		expect(filtered[0].id).toBe('near-1');
	});
});
