'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ClueItem {
	n: number;
	placeId?: string;
	answer: string;
	baseClue: string;
	riddle: string;
	source: 'model' | 'fallback';
	attempts: number;
}

interface CardPayload {
	clues: ClueItem[];
	answerKey: string[];
	meta?: {
		neighborhood?: string;
		tier?: string;
		radiusKm?: number;
		liveCalls?: number;
	};
}

// Fallback demo data for preview or direct navigation
const DEMO_CARD: CardPayload = {
	clues: [
		{
			n: 1,
			answer: 'Palladium',
			baseClue: 'A shopping mall on Velachery Main Rd.',
			riddle: 'On Velachery Main Rd, a hub of deals abounds where shoppers flock and treasures are found.',
			source: 'model',
			attempts: 1
		},
		{
			n: 2,
			answer: 'Taneira Showroom',
			baseClue: 'A saree shop on Throwpathy Amman Koil Street.',
			riddle: 'On Throwpathy Amman Koil Street, traditional fabrics and sarees are woven all around with customer praise.',
			source: 'model',
			attempts: 1
		},
		{
			n: 3,
			answer: 'FirstCry.com Store Chennai Velachery',
			baseClue: 'A baby store on Pandidurai Street.',
			riddle: 'On Pandidurai Street, a warm spot nurturing tiny lives with many happy reviews in store.',
			source: 'model',
			attempts: 2
		},
		{
			n: 4,
			answer: 'EasyBuy - Velachery',
			baseClue: 'A clothing store on 100 Feet Rd.',
			riddle: 'On 100 Feet Rd, find clothes for every age with great value for walking scouts.',
			source: 'model',
			attempts: 1
		},
		{
			n: 5,
			answer: 'Phoenix Marketcity',
			baseClue: 'A shopping mall on Velachery Main Rd.',
			riddle: 'A massive hub on Velachery Main Rd celebrated by over 100000 visitors.',
			source: 'model',
			attempts: 1
		}
	],
	answerKey: [
		'Palladium',
		'Taneira Showroom',
		'FirstCry.com Store Chennai Velachery',
		'EasyBuy - Velachery',
		'Phoenix Marketcity'
	],
	meta: {
		neighborhood: 'Velachery',
		tier: 'easy',
		radiusKm: 1.0
	}
};

export default function CardPage() {
	const [card, setCard] = useState<CardPayload | null>(null);
	const [today, setToday] = useState('');

	useEffect(() => {
		setToday(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }));
		if (typeof window !== 'undefined') {
			const stored = sessionStorage.getItem('urban_drift_card');
			if (stored) {
				try {
					setCard(JSON.parse(stored));
				} catch {
					setCard(DEMO_CARD);
				}
			} else {
				setCard(DEMO_CARD);
			}
		}
	}, []);

	if (!card) {
		return (
			<div className="min-h-screen bg-black text-white flex items-center justify-center font-mono">
				Loading card...
			</div>
		);
	}

	const neighborhood = card.meta?.neighborhood || 'Neighborhood';
	const tier = (card.meta?.tier || 'easy').toUpperCase();
	const radius = card.meta?.radiusKm ?? 1.0;

	return (
		<div className="min-h-screen bg-neutral-900 text-black py-6 md:py-10 flex flex-col items-center font-mono print:bg-white print:py-0 print:m-0">
			{/* Screen Controls Header (Hidden in Print) */}
			<div className="w-full max-w-[210mm] mb-6 flex justify-between items-center px-4 print:hidden">
				<Link
					href="/"
					className="text-xs uppercase tracking-wider text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
				>
					&larr; Back to Generator
				</Link>
				<button
					onClick={() => window.print()}
					className="bg-white text-black hover:bg-neutral-200 px-5 py-2.5 text-xs uppercase font-bold tracking-widest transition-colors shadow-lg cursor-pointer"
				>
					Print A4 Card (Ctrl + P)
				</button>
			</div>

			{/* Printable A4 Card Canvas */}
			<div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-8 md:p-12 border border-neutral-300 shadow-2xl print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none print:min-h-0 flex flex-col justify-between">
				<div>
					{/* Header */}
					<header className="border-b-2 border-black pb-4 mb-6">
						<div className="flex justify-between items-center text-[10px] tracking-widest text-neutral-600 uppercase mb-1">
							<span>Urban Drift // Screen-Free Scavenger Hunt</span>
							<span>Date: {today}</span>
						</div>
						<h1 className="text-2xl font-black uppercase tracking-tight text-black mb-1">
							{neighborhood} Hunt
						</h1>
						<div className="flex flex-wrap gap-x-6 text-[11px] font-semibold text-neutral-800 uppercase mt-1">
							<span>Difficulty: {tier}</span>
							<span>Radius: {radius} km</span>
							<span>Goal: 5 Clues</span>
						</div>
					</header>

					{/* Safety Reminder Box */}
					<div className="border border-black p-2.5 mb-6 text-[10px] leading-relaxed uppercase bg-neutral-50 print:bg-white font-medium">
						<strong>Safety First:</strong> Public places only. Go in daylight. Watch traffic. Stay aware. Your safety comes first. Never cross dangerous roads for a clue.
					</div>

					{/* Clues Section */}
					<section className="space-y-6">
						{card.clues.map((clue) => (
							<article key={clue.n} className="break-inside-avoid border-b border-dashed border-neutral-300 pb-4">
								<div className="flex items-baseline gap-3 mb-1.5">
									<span className="font-bold text-sm bg-black text-white px-1.5 py-0.5 rounded-none text-center min-w-[22px]">
										{clue.n}
									</span>
									<p className="text-xs font-medium text-black leading-relaxed">
										{clue.riddle}
									</p>
								</div>
								<div className="mt-2.5 flex items-center text-xs">
									<span className="text-[10px] text-neutral-500 uppercase font-semibold mr-2">Your Answer:</span>
									<span className="flex-1 border-b border-black inline-block h-4" />
								</div>
							</article>
						))}
					</section>
				</div>

				{/* Footer and Answer Key (Bottom of A4) */}
				<footer className="mt-8 pt-4 border-t-2 border-black break-inside-avoid">
					<div className="flex justify-between items-center mb-4">
						<span className="text-xs font-bold uppercase tracking-wider">
							Final Tally
						</span>
						<span className="text-xs font-bold uppercase tracking-widest border border-black px-3 py-1">
							Score: _____ / 5
						</span>
					</div>

					{/* Boxed Answer Key with Fold Guidance */}
					<div className="border border-dashed border-neutral-700 p-3 bg-neutral-50 print:bg-white">
						<div className="flex justify-between items-center text-[9px] uppercase tracking-widest text-neutral-600 mb-1.5">
							<span>Fold or cover during your walk</span>
							<span>Answer Key</span>
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[10px] font-semibold text-neutral-900">
							{card.answerKey.map((ans, idx) => (
								<div key={idx} className="truncate">
									<span className="text-neutral-500">{idx + 1}.</span> {ans}
								</div>
							))}
						</div>
					</div>

					<div className="mt-3 text-center text-[8px] text-neutral-500 uppercase tracking-widest">
						Generated via Urban Drift | Real Maps + Local AI + Deterministic Verifier | Walk Responsibly
					</div>
				</footer>
			</div>
		</div>
	);
}
