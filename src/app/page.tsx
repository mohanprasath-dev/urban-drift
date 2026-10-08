'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PROGRESS_MESSAGES = [
	'1/4: Fetching verified locations from SerpApi...',
	'2/4: Applying safety filters and building FactSheets...',
	'3/4: Ollama writing riddles with verifier inspection...',
	'4/4: Assembling your print-ready scavenger card...'
];

export default function HomePage() {
	const router = useRouter();
	const [neighborhood, setNeighborhood] = useState('Velachery');
	const [tier, setTier] = useState<'easy' | 'medium' | 'hard'>('easy');
	const [radiusKm, setRadiusKm] = useState(1.0);
	const [loading, setLoading] = useState(false);
	const [progressStep, setProgressStep] = useState(0);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let timer: NodeJS.Timeout;
		if (loading) {
			setProgressStep(0);
			timer = setInterval(() => {
				setProgressStep((prev) => (prev < PROGRESS_MESSAGES.length - 1 ? prev + 1 : prev));
			}, 3000);
		}
		return () => clearInterval(timer);
	}, [loading]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					neighborhood,
					tier,
					radiusKm
				})
			});

			const data = await res.json();

			if (!res.ok || data.error) {
				throw new Error(data.error || 'Failed to generate scavenger hunt.');
			}

			// Store result in client session storage and redirect to card view
			if (typeof window !== 'undefined') {
				sessionStorage.setItem('urban_drift_card', JSON.stringify(data));
			}
			router.push('/card');
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setError(msg);
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="min-h-screen bg-black text-white px-6 py-12 md:py-20 flex flex-col items-center justify-center font-mono selection:bg-white selection:text-black">
			<div className="w-full max-w-xl border border-neutral-800 p-8 md:p-12 bg-neutral-950 shadow-2xl">
				{/* Header */}
				<header className="mb-10 border-b border-neutral-800 pb-8">
					<div className="flex items-center justify-between mb-3">
						<span className="text-xs uppercase tracking-widest text-neutral-400">DEV Hacktoberfest 2026</span>
						<span className="text-xs border border-neutral-700 px-2 py-0.5 text-neutral-300">Touch Grass</span>
					</div>
					<h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-3">
						URBAN DRIFT
					</h1>
					<p className="text-sm text-neutral-400 leading-relaxed">
						Screen-free neighborhood scavenger hunt. Enter your area, print one A4 sheet, close your laptop, and explore outdoors on foot.
					</p>
				</header>

				{/* Error Notification */}
				{error && (
					<div className="mb-8 p-4 border border-red-800 bg-red-950/40 text-red-300 text-xs leading-relaxed" role="alert">
						<div className="font-bold uppercase tracking-wider mb-1 text-red-200">Generation Error</div>
						<div>{error}</div>
					</div>
				)}

				{/* Progress Indicator */}
				{loading ? (
					<div className="py-12 text-center space-y-4">
						<div className="inline-block animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full mb-2" />
						<div className="text-sm font-semibold tracking-wide text-neutral-200">
							{PROGRESS_MESSAGES[progressStep]}
						</div>
						<p className="text-xs text-neutral-500">
							Local Ollama model is verifying facts. Under 30 seconds...
						</p>
					</div>
				) : (
					/* Input Form */
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label htmlFor="neighborhood" className="block text-xs uppercase tracking-wider text-neutral-300 mb-2 font-semibold">
								Target Neighborhood / Locality
							</label>
							<input
								id="neighborhood"
								type="text"
								value={neighborhood}
								onChange={(e) => setNeighborhood(e.target.value)}
								placeholder="e.g. Velachery, Adyar, Mylapore"
								required
								className="w-full bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white transition-colors"
							/>
						</div>

						<div>
							<label htmlFor="tier" className="block text-xs uppercase tracking-wider text-neutral-300 mb-2 font-semibold">
								Difficulty Tier
							</label>
							<select
								id="tier"
								value={tier}
								onChange={(e) => setTier(e.target.value as 'easy' | 'medium' | 'hard')}
								className="w-full bg-neutral-900 border border-neutral-700 px-4 py-3 text-sm text-white focus:outline-none focus:border-white transition-colors"
							>
								<option value="easy">Easy (Category + Street Name)</option>
								<option value="medium">Medium (Category + Rating Band)</option>
								<option value="hard">Hard (Rating + Review Count Band only)</option>
							</select>
							<p className="text-[11px] text-neutral-500 mt-1">
								{tier === 'easy' && 'Solvable by category and street cues.'}
								{tier === 'medium' && 'Requires identifying category with star-rating ranges.'}
								{tier === 'hard' && 'No category revealed; solved purely by rating and review counts.'}
							</p>
						</div>

						<div>
							<div className="flex justify-between items-center mb-2">
								<label htmlFor="radius" className="text-xs uppercase tracking-wider text-neutral-300 font-semibold">
									Walking Radius
								</label>
								<span className="text-xs text-neutral-200 font-bold">{radiusKm.toFixed(1)} km</span>
							</div>
							<input
								id="radius"
								type="range"
								min="0.5"
								max="1.5"
								step="0.1"
								value={radiusKm}
								onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
								className="w-full accent-white bg-neutral-800 cursor-pointer"
							/>
							<div className="flex justify-between text-[10px] text-neutral-600 mt-1">
								<span>0.5 km (Stroll)</span>
								<span>1.0 km (Moderate)</span>
								<span>1.5 km (Exploration)</span>
							</div>
						</div>

						<div className="pt-4 border-t border-neutral-800">
							<button
								type="submit"
								className="w-full bg-white text-black hover:bg-neutral-200 py-3.5 px-6 text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer"
							>
								Generate Scavenger Hunt Card
							</button>
						</div>
					</form>
				)}

				{/* Footer Safety Notice */}
				<footer className="mt-8 pt-6 border-t border-neutral-900 text-center text-[11px] text-neutral-500">
					Public spaces only. Daytime walk. Zero screen usage outdoors.
				</footer>
			</div>
		</main>
	);
}
