'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const PROGRESS_MESSAGES = [
	'1/4: Fetching verified locations from SerpApi...',
	'2/4: Applying safety filters and building FactSheets...',
	'3/4: Writing riddles with verifier-gated inspection...',
	'4/4: Assembling your print-ready scavenger card...'
];

const TIER_OPTIONS = [
	{
		id: 'easy',
		name: 'Seed',
		difficulty: 'Easy',
		description: 'Category + Street cues',
		detail: 'Solvable by category and street cues.'
	},
	{
		id: 'medium',
		name: 'Sprout',
		difficulty: 'Medium',
		description: 'Category + Rating band',
		detail: 'Requires identifying category with star-rating ranges.'
	},
	{
		id: 'hard',
		name: 'Tree',
		difficulty: 'Hard',
		description: 'Rating & Reviews only',
		detail: 'No category revealed; solved purely by rating and review counts.'
	}
] as const;

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
		<main className="min-h-screen bg-[#F6F1E7] text-[#1F2A1F] px-4 py-8 sm:px-6 sm:py-12 md:py-16 flex flex-col items-center justify-center font-sans selection:bg-[#2D4A22] selection:text-[#F6F1E7] relative overflow-hidden">
			{/* Topographic Contour Lines SVG (Behind the form, draws once under 1.5s, honors prefers-reduced-motion) */}
			<div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
				<svg
					className="w-full h-full"
					viewBox="0 0 1000 800"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
					preserveAspectRatio="xMidYMid slice"
					aria-hidden="true"
				>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M-50,120 C180,80 320,240 540,160 C720,100 850,220 1050,140"
						stroke="#1F2A1F"
						strokeOpacity="0.08"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M-50,220 C160,180 280,340 500,280 C680,230 820,340 1050,260"
						stroke="#1F2A1F"
						strokeOpacity="0.08"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M-50,340 C140,300 250,460 480,410 C660,370 790,480 1050,390"
						stroke="#1F2A1F"
						strokeOpacity="0.09"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M-50,460 C120,430 220,580 450,540 C640,500 760,620 1050,530"
						stroke="#1F2A1F"
						strokeOpacity="0.08"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M-50,580 C100,560 190,700 420,670 C620,640 730,750 1050,660"
						stroke="#1F2A1F"
						strokeOpacity="0.08"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M150,650 C180,590 280,580 330,640 C370,700 310,770 230,770 C170,770 130,700 150,650 Z"
						stroke="#1F2A1F"
						strokeOpacity="0.07"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M180,660 C200,620 260,610 290,650 C320,690 280,740 230,740 C190,740 170,690 180,660 Z"
						stroke="#1F2A1F"
						strokeOpacity="0.08"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M680,220 C730,160 840,160 890,230 C940,300 870,380 790,370 C720,360 650,280 680,220 Z"
						stroke="#1F2A1F"
						strokeOpacity="0.07"
						strokeWidth="1.5"
					/>
					<path
						className="animate-topo-draw"
						pathLength="1000"
						d="M710,235 C740,195 810,195 850,240 C890,290 840,345 780,340 C730,335 690,275 710,235 Z"
						stroke="#1F2A1F"
						strokeOpacity="0.08"
						strokeWidth="1.5"
					/>
				</svg>
			</div>

			{/* Main Card */}
			<div className="relative z-10 w-full max-w-xl border border-[#1F2A1F]/15 p-6 sm:p-8 md:p-12 bg-[#F6F1E7]/90 backdrop-blur-sm shadow-[0_12px_40px_rgba(31,42,31,0.06)] rounded-xl">
				{/* Header */}
				<header className="mb-8 sm:mb-10 border-b border-[#1F2A1F]/15 pb-6 sm:pb-8">
					<div className="flex items-center justify-between mb-4 gap-2">
						<span className="text-[11px] uppercase tracking-widest font-semibold text-[#1F2A1F]/70">
							DEV Hacktoberfest 2026
						</span>
						<span className="text-[11px] font-semibold border border-[#2D4A22]/40 bg-[#2D4A22]/10 text-[#2D4A22] px-2.5 py-0.5 rounded-full">
							Touch Grass
						</span>
					</div>
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-[#1F2A1F] mb-3">
						URBAN DRIFT
					</h1>
					<p className="text-sm sm:text-base text-[#1F2A1F]/80 leading-relaxed font-sans">
						Screen-free neighborhood scavenger hunt. Enter your area, print one A4 sheet, close your laptop, and explore outdoors on foot.
					</p>
				</header>

				{/* Error Notification */}
				{error && (
					<div
						className="mb-8 p-4 border border-[#9E2A2B]/40 bg-[#FDF0EE] text-[#7A1E1E] text-xs leading-relaxed rounded-lg"
						role="alert"
					>
						<div className="font-bold uppercase tracking-wider mb-1 text-[#5C1515]">Generation Error</div>
						<div>{error}</div>
					</div>
				)}

				{/* Progress Indicator */}
				{loading ? (
					<div className="py-10 text-center space-y-6" aria-live="polite">
						{/* Restyled Progress Stepper */}
						<div className="flex justify-between items-center max-w-md mx-auto relative px-2">
							{/* Background Track Line */}
							<div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-[#1F2A1F]/15 -z-0" />
							{/* Filled Progress Line */}
							<div
								className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-[#2D4A22] transition-all duration-500 ease-out -z-0"
								style={{ width: `${(progressStep / (PROGRESS_MESSAGES.length - 1)) * 88}%` }}
							/>

							{PROGRESS_MESSAGES.map((_, idx) => {
								const isDone = idx < progressStep;
								const isCurrent = idx === progressStep;
								return (
									<div
										key={idx}
										className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
											isDone
												? 'bg-[#2D4A22] text-[#F6F1E7]'
												: isCurrent
												? 'bg-[#F6F1E7] border-2 border-[#2D4A22] text-[#2D4A22] ring-4 ring-[#2D4A22]/20'
												: 'bg-[#F6F1E7] border border-[#1F2A1F]/20 text-[#1F2A1F]/40'
										}`}
									>
										{isDone ? (
											<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
												<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
											</svg>
										) : (
											idx + 1
										)}
									</div>
								);
							})}
						</div>

						{/* Current Step Status */}
						<div className="space-y-2 pt-2">
							<div className="text-sm font-semibold tracking-wide text-[#1F2A1F]">
								{PROGRESS_MESSAGES[progressStep]}
							</div>
							<p className="text-xs text-[#1F2A1F]/70">
								Open-source Llama 3.2 via Groq API with deterministic code verification...
							</p>
						</div>
					</div>
				) : (
					/* Input Form */
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label
								htmlFor="neighborhood"
								className="block text-xs uppercase tracking-wider text-[#1F2A1F]/90 mb-2 font-semibold"
							>
								Target Neighborhood / Locality
							</label>
							<input
								id="neighborhood"
								type="text"
								value={neighborhood}
								onChange={(e) => setNeighborhood(e.target.value)}
								placeholder="e.g. Velachery, Adyar, Mylapore"
								required
								className="w-full bg-[#FAF7F0] border border-[#1F2A1F]/25 px-4 py-3 text-sm text-[#1F2A1F] placeholder-[#1F2A1F]/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D4A22] focus:border-[#2D4A22] transition-colors"
							/>
						</div>

						<div>
							<label
								htmlFor="tier"
								className="block text-xs uppercase tracking-wider text-[#1F2A1F]/90 mb-2 font-semibold"
							>
								Difficulty Tier
							</label>

							{/* Interactive Tier Cards with Seed / Sprout / Tree and Easy / Medium / Hard */}
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-2" role="radiogroup" aria-label="Difficulty Tier">
								{TIER_OPTIONS.map((t) => {
									const isSelected = tier === t.id;
									return (
										<button
											key={t.id}
											type="button"
											role="radio"
											aria-checked={isSelected}
											onClick={() => setTier(t.id)}
											className={`p-3 text-left rounded-lg border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2D4A22] ${
												isSelected
													? 'border-[#2D4A22] bg-[#2D4A22]/10 text-[#1F2A1F] ring-1 ring-[#2D4A22]'
													: 'border-[#1F2A1F]/20 bg-[#FAF7F0] text-[#1F2A1F]/70 hover:border-[#1F2A1F]/40'
											}`}
										>
											<div className="flex items-center justify-between mb-1">
												<span className="font-serif font-bold text-base text-[#1F2A1F]">
													{t.name}
												</span>
												<span
													className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
														isSelected
															? 'bg-[#2D4A22] text-[#F6F1E7]'
															: 'bg-[#1F2A1F]/10 text-[#1F2A1F]/70'
													}`}
												>
													{t.difficulty}
												</span>
											</div>
											<p className="text-[11px] leading-tight text-[#1F2A1F]/70">
												{t.description}
											</p>
										</button>
									);
								})}
							</div>

							{/* Accessible Select synced with tier state */}
							<select
								id="tier"
								value={tier}
								onChange={(e) => setTier(e.target.value as 'easy' | 'medium' | 'hard')}
								className="sr-only"
								aria-label="Difficulty Tier selection"
							>
								<option value="easy">Seed (Easy - Category + Street Name)</option>
								<option value="medium">Sprout (Medium - Category + Rating Band)</option>
								<option value="hard">Tree (Hard - Rating + Review Count Band only)</option>
							</select>

							<p className="text-[11px] text-[#1F2A1F]/70 mt-1.5">
								{tier === 'easy' && 'Solvable by category and street cues.'}
								{tier === 'medium' && 'Requires identifying category with star-rating ranges.'}
								{tier === 'hard' && 'No category revealed; solved purely by rating and review counts.'}
							</p>
						</div>

						<div>
							<div className="flex justify-between items-center mb-2">
								<label
									htmlFor="radius"
									className="text-xs uppercase tracking-wider text-[#1F2A1F]/90 font-semibold"
								>
									Walking Radius
								</label>
								<span className="text-xs text-[#1F2A1F] font-bold px-2 py-0.5 bg-[#FAF7F0] border border-[#1F2A1F]/20 rounded">
									{radiusKm.toFixed(1)} km
								</span>
							</div>
							<input
								id="radius"
								type="range"
								min="0.5"
								max="1.5"
								step="0.1"
								value={radiusKm}
								onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
								className="w-full accent-[#2D4A22] bg-[#1F2A1F]/20 h-1.5 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2D4A22]"
							/>
							<div className="flex justify-between text-[11px] text-[#1F2A1F]/70 mt-1.5">
								<span>0.5 km (Stroll)</span>
								<span>1.0 km (Moderate)</span>
								<span>1.5 km (Exploration)</span>
							</div>
						</div>

						<div className="pt-4 border-t border-[#1F2A1F]/15">
							<button
								type="submit"
								className="w-full bg-[#2D4A22] hover:bg-[#243B1B] text-[#F6F1E7] py-3.5 px-6 text-xs uppercase tracking-widest font-bold rounded-lg transition-colors cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D4A22] focus:ring-offset-2 focus:ring-offset-[#F6F1E7]"
							>
								Generate Scavenger Hunt Card
							</button>
						</div>
					</form>
				)}

				{/* Footer Safety Notice */}
				<footer className="mt-8 pt-6 border-t border-[#1F2A1F]/15 text-center text-xs text-[#1F2A1F]/70">
					Public spaces only. Daytime walk. Zero screen usage outdoors.
				</footer>
			</div>
		</main>
	);
}
