<script lang="ts">
	import { onMount } from 'svelte';
	import { Sparkles, Zap, ArrowLeft, RotateCcw, Trophy, Award } from '@lucide/svelte';
	import type { RankGrade } from '../../progression/progression';
	import { playUnlockFanfareSound } from '$lib/audio';

	let {
		finished,
		calculatingResults,
		earnedGrade,
		earnedXp,
		newlyUnlockedKeys = [],
		title,
		score,
		accuracy,
		finalStats,
		onRestart
	}: {
		finished: boolean;
		calculatingResults: boolean;
		earnedGrade: RankGrade;
		earnedXp: number;
		newlyUnlockedKeys?: string[];
		title: string;
		score: number;
		accuracy: number;
		finalStats: { perfect: number; great: number; good: number; miss: number };
		onRestart: () => void;
	} = $props();

	$effect(() => {
		if (finished && !calculatingResults && newlyUnlockedKeys.length > 0) {
			playUnlockFanfareSound();
		}
	});

	const gradeColors: Record<RankGrade, string> = {
		SS: '#ffc145',
		S: '#80D39B',
		A: '#5995ED',
		B: '#AB47BC',
		C: '#FF9800',
		D: '#f9564f'
	};
</script>

{#if finished}
	<div class="fixed inset-0 bg-bg/85 backdrop-blur-md z-40"></div>

	{#if calculatingResults}
		<div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface border-4 border-secondary p-8 rounded-xl shadow-neo text-center">
			<div class="flex flex-col items-center gap-3">
				<div class="w-10 h-10 rounded-full border-4 border-t-primary border-secondary animate-spin"></div>
				<div class="font-black uppercase tracking-wider text-text-dim text-sm">Calcul des résultats...</div>
			</div>
		</div>
	{:else}
		<div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-surface border-4 border-secondary p-6 md:p-8 rounded-xl shadow-neo w-[92%] max-w-lg text-center select-none flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
			<span class="text-lg md:text-xl font-black uppercase tracking-wider text-accent flex items-center justify-center gap-2">
				<Sparkles class="w-5 h-5" /> PARTIE TERMINÉE
			</span>

			<!-- Animation de Déblocage de Paliers / Nouvelles Touches (Succès) -->
			{#if newlyUnlockedKeys.length > 0}
				<div class="bg-primary/20 border-4 border-primary p-4 rounded-xl shadow-[5px_5px_0px_#ff3366] flex flex-col items-center gap-2 animate-bounce my-1 select-none">
					<div class="flex items-center gap-2 text-primary font-black uppercase text-sm md:text-base tracking-wider">
						<Trophy class="w-5 h-5 fill-primary text-primary" /> NOUVELLES TOUCHES DÉBLOQUÉES !
					</div>
					<div class="flex items-center justify-center gap-3 mt-1">
						{#each newlyUnlockedKeys as key}
							<div class="w-12 h-12 bg-primary text-secondary border-4 border-secondary rounded-xl flex items-center justify-center font-mono font-black text-2xl uppercase shadow-[3px_3px_0px_#1a0033]">
								{key}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="flex flex-col gap-4 text-left">
				<!-- Badge de grade -->
				<div
					class="w-24 h-24 rounded-full border-8 border-secondary flex items-center justify-center font-black text-5xl md:text-6xl mx-auto shadow-neo transition-transform hover:scale-105 select-none"
					style="background-color: {gradeColors[earnedGrade] || '#f7edf0'}; color: #150029;"
				>
					{earnedGrade}
				</div>

				<h2 class="text-xl md:text-2xl font-black uppercase tracking-wider text-primary text-center">
					{title}
				</h2>

				<!-- Score et précision -->
				<div class="flex justify-center items-center gap-8 py-3 border-y-4 border-secondary my-1">
					<div class="flex flex-col items-center">
						<span class="text-2xl md:text-3xl font-mono font-black text-text">
							{score.toLocaleString()}
						</span>
						<span class="text-[9px] font-black uppercase text-text-dim mt-0.5">Score Total</span>
					</div>
					<div class="h-10 w-1 bg-secondary rounded"></div>
					<div class="flex flex-col items-center">
						<span class="text-2xl md:text-3xl font-mono font-black text-accent">
							{accuracy.toFixed(1)}%
						</span>
						<span class="text-[9px] font-black uppercase text-text-dim mt-0.5">Précision</span>
					</div>
				</div>

				<!-- Grille de statistiques -->
				<div class="grid grid-cols-4 gap-2 text-center">
					<div class="border-2 border-secondary bg-secondary/15 p-2 rounded-lg flex flex-col items-center justify-center">
						<span class="text-base md:text-lg font-black text-perfect">{finalStats.perfect}</span>
						<span class="text-[9px] font-bold uppercase text-text-dim tracking-wider">Perfect</span>
					</div>
					<div class="border-2 border-secondary bg-secondary/15 p-2 rounded-lg flex flex-col items-center justify-center">
						<span class="text-base md:text-lg font-black text-great">{finalStats.great}</span>
						<span class="text-[9px] font-bold uppercase text-text-dim tracking-wider">Great</span>
					</div>
					<div class="border-2 border-secondary bg-secondary/15 p-2 rounded-lg flex flex-col items-center justify-center">
						<span class="text-base md:text-lg font-black text-good">{finalStats.good}</span>
						<span class="text-[9px] font-bold uppercase text-text-dim tracking-wider">Good</span>
					</div>
					<div class="border-2 border-secondary bg-secondary/15 p-2 rounded-lg flex flex-col items-center justify-center">
						<span class="text-base md:text-lg font-black text-miss">{finalStats.miss}</span>
						<span class="text-[9px] font-bold uppercase text-text-dim tracking-wider">Miss</span>
					</div>
				</div>

				<!-- Gain d'XP -->
				<div class="w-full bg-secondary/35 border-2 border-secondary p-3 rounded-lg flex items-center justify-center gap-2 font-black text-sm uppercase text-primary">
					<Zap class="w-4 h-4" /> + {earnedXp} XP Gagnés !
				</div>

				<!-- Boutons d'action -->
				<div class="flex flex-col sm:flex-row gap-4 mt-3">
					<div class="relative flex-1 select-none">
						<div class="absolute inset-0 bg-secondary border-4 border-secondary rounded-lg translate-x-[4px] translate-y-[4px]"></div>
						<a
							href="/"
							class="relative w-full border-4 border-secondary px-4 py-3 bg-secondary text-white rounded-lg flex items-center justify-center gap-2 font-black uppercase text-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px] text-center"
						>
							<ArrowLeft class="w-4 h-4" /> NIVEAUX
						</a>
					</div>

					<div class="relative flex-1 select-none">
						<div class="absolute inset-0 bg-secondary border-4 border-secondary rounded-lg translate-x-[4px] translate-y-[4px]"></div>
						<button
							onclick={onRestart}
							class="relative w-full border-4 border-secondary px-4 py-3 bg-primary text-secondary rounded-lg flex items-center justify-center gap-2 font-black uppercase text-sm transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
						>
							<RotateCcw class="w-4 h-4" /> REJOUER
							<kbd class="px-1 py-0.5 text-[9px] bg-secondary text-primary border border-secondary rounded font-mono font-black">ENTER</kbd>
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
{/if}
