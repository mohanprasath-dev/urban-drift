import { loadEnvConfig } from '@next/env';
import { fetchGoogleMaps } from '../src/lib/serpapi';
import { getLiveCallCount } from '../src/lib/cache';

// Load local environment variables from .env.local
loadEnvConfig(process.cwd());

async function runDataGate(): Promise<void> {
	const args = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
	const neighborhoods = args.length > 0 ? args : ['Velachery', 'Adyar', 'Mylapore'];

	console.log('====================================================');
	console.log('GATE 1: SerpApi Data Coverage Report');
	console.log(`Target Neighborhoods: ${neighborhoods.join(', ')}`);
	const initialLiveCalls = getLiveCallCount();
	console.log(`Initial Live Calls Counter: ${initialLiveCalls}`);
	console.log('====================================================\n');

	for (const neighborhood of neighborhoods) {
		const query = `shops near ${neighborhood} Chennai`;
		console.log(`\n--- Neighborhood: ${neighborhood} ---`);
		console.log(`Query: "${query}"`);

		try {
			const data = await fetchGoogleMaps({ q: query });
			const results = (data.local_results || []) as Array<Record<string, unknown>>;
			const total = results.length;

			console.log(`Total Results Returned: ${total}`);

			if (total === 0) {
				console.warn(`WARNING: Zero results returned for ${neighborhood}`);
				continue;
			}

			// Field presence counters
			let titleCount = 0;
			let ratingCount = 0;
			let reviewsCount = 0;
			let typeCount = 0;
			let addressCount = 0;
			let gpsCount = 0;
			let hoursOrOpenStateCount = 0;
			let hasReviewTextCount = 0;
			let usableCount = 0;

			results.forEach((item) => {
				const hasTitle = Boolean(item.title);
				const hasRating = typeof item.rating === 'number';
				const hasReviews = item.reviews !== undefined && item.reviews !== null;
				const hasType = Boolean(item.type || item.types);
				const hasAddress = Boolean(item.address);
				const hasGps = Boolean(item.gps_coordinates && typeof item.gps_coordinates === 'object');
				const hasHours = Boolean(item.hours || item.open_state);

				if (hasTitle) titleCount++;
				if (hasRating) ratingCount++;
				if (hasReviews) reviewsCount++;
				if (hasType) typeCount++;
				if (hasAddress) addressCount++;
				if (hasGps) gpsCount++;
				if (hasHours) hoursOrOpenStateCount++;

				// Check for any review text snippets
				const reviewTextPresent = Boolean(
					item.snippet ||
					item.reviews_text ||
					item.review ||
					item.user_reviews ||
					(Array.isArray(item.reviews_list) && item.reviews_list.length > 0)
				);
				if (reviewTextPresent) hasReviewTextCount++;

				// Usable criteria: name, coordinates, category, rating
				if (hasTitle && hasGps && hasType && hasRating) {
					usableCount++;
				}
			});

			const pct = (count: number) => `${count}/${total} (${((count / total) * 100).toFixed(1)}%)`;

			console.log('\nField Coverage:');
			console.log(`- title:              ${pct(titleCount)}`);
			console.log(`- rating:             ${pct(ratingCount)}`);
			console.log(`- reviews:            ${pct(reviewsCount)}`);
			console.log(`- type/category:      ${pct(typeCount)}`);
			console.log(`- address:            ${pct(addressCount)}`);
			console.log(`- gps_coordinates:    ${pct(gpsCount)}`);
			console.log(`- hours/open_state:   ${pct(hoursOrOpenStateCount)}`);
			console.log(`- contains review text: ${pct(hasReviewTextCount)}`);
			console.log(`- Usable for Hunt (name + coords + type + rating): ${pct(usableCount)}`);

			// Print real top-level keys of first result
			const firstKeys = Object.keys(results[0] || {});
			console.log('\nReal Top-Level Keys of First Result:');
			console.log(JSON.stringify(firstKeys));

			// Gate 1 check
			if (usableCount < 8) {
				console.log(`\n[GATE 1 STATUS]: WARNING: Fewer than 8 usable places (${usableCount}) in ${neighborhood}.`);
			} else {
				console.log(`\n[GATE 1 STATUS]: PASSED (${usableCount} usable places >= 8)`);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`Error querying ${neighborhood}:`, message);
		}
	}

	const finalLiveCalls = getLiveCallCount();
	const diff = finalLiveCalls - initialLiveCalls;
	console.log('\n====================================================');
	console.log(`Live Calls Made in this Run: ${diff}`);
	console.log(`Total Cumulative Live Calls: ${finalLiveCalls}`);
	console.log('====================================================\n');
}

runDataGate();
