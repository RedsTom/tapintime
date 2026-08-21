<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { Play, Pause, Music, X } from '@lucide/svelte';
	import type { MapInfo } from '../types';
	import type { MapScore, RankGrade } from '../../progression/progression';

	let {
		selectedMap,
		selectedMapScore,
		isMenuAudioPaused,
		onStartGame,
		onToggleAudio,
		onDeselect
	}: {
		selectedMap: MapInfo;
		selectedMapScore?: MapScore;
		isMenuAudioPaused: boolean;
		onStartGame: () => void;
		onToggleAudio: () => void;
		onDeselect?: () => void;
	} = $props();

	const effectiveCoverBlob = $derived(selectedMap?.coverBlob ?? (selectedMap?.isVideo ? undefined : selectedMap?.bgBlob));
	let coverUrl = $state<string | null>(null);

	$effect(() => {
		if (effectiveCoverBlob) {
			const url = URL.createObjectURL(effectiveCoverBlob);
			coverUrl = url;
			return () => {
				URL.revokeObjectURL(url);
			};
		} else {
			coverUrl = null;
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

<div class="fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-md border-t-4 border-secondary px-4 md:px-8 py-3 shadow-[0_-6px_0px_#1a0033] flex items-center justify-between gap-4 select-none">
	<!-- Gauche: Informations de la map sélectionnée -->
	<div class="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
		{#if coverUrl}
			<img
				src={coverUrl}
				alt={selectedMap.title}
				class="w-12 h-12 rounded-xl border-2 border-secondary object-cover shrink-0 shadow-[2px_2px_0px_#1a0033]"
			/>
		{:else if selectedMapScore}
			<div
				class="w-12 h-12 rounded-xl border-2 border-secondary flex items-center justify-center font-black text-xl shrink-0 shadow-[2px_2px_0px_#1a0033]"
				style="background-color: {gradeColors[selectedMapScore.grade]}; color: #0a0510"
			>
				{selectedMapScore.grade}
			</div>
		{:else}
			<div class="w-12 h-12 rounded-xl border-2 border-secondary bg-secondary/30 text-primary flex items-center justify-center shrink-0">
				<Music class="w-6 h-6" />
			</div>
		{/if}

		<div class="flex flex-col text-left min-w-0">
			<div class="flex items-center gap-2">
				<h3 class="text-base md:text-lg font-black uppercase text-primary tracking-wider leading-none truncate">
					{selectedMap.title}
				</h3>
				<span class="px-2 py-0.5 text-[9px] font-black uppercase rounded border border-secondary bg-accent text-secondary shrink-0">
					{selectedMap.difficulty}
				</span>
			</div>
			<div class="text-xs font-bold text-text-dim uppercase truncate mt-1">
				{selectedMap.artist} • <span class="text-text">{selectedMap.noteCount} Notes</span> • {selectedMap.bpm} BPM
			</div>
		</div>
	</div>

	<!-- Centre: Record -->
	<div class="flex items-center justify-center gap-4 flex-1 shrink-0">
		{#if selectedMapScore}
			<div class="flex flex-col text-center">
				<span class="text-[10px] font-black uppercase text-text-dim">Record</span>
				<span class="text-sm font-black text-primary font-mono">{selectedMapScore.score.toLocaleString()} PTS</span>
			</div>
		{/if}
	</div>

	<!-- Droite: Boutons principaux JOUER & AUDIO + Bouton X tout à droite -->
	<div class="flex items-center justify-end gap-3 shrink-0">
		<Button variant="secondary" size="md" onclick={onToggleAudio} title="Écouter la prévisualisation audio">
			{#if isMenuAudioPaused}
				<Play class="w-4 h-4" /> <span class="hidden sm:inline">ÉCOUTER</span>
			{:else}
				<Pause class="w-4 h-4" /> <span class="hidden sm:inline">PAUSE</span>
			{/if}
		</Button>

		<Button variant="primary" size="large" onclick={onStartGame} className="px-8 py-3 flex items-center gap-2">
			<Play class="w-6 h-6 fill-current" />
			<span>JOUER</span>
			<kbd class="ml-1.5 px-2 py-0.5 text-xs bg-secondary text-primary border border-secondary rounded font-mono font-black uppercase shadow-sm">
				ENTRÉE ↵
			</kbd>
		</Button>

		{#if onDeselect}
			<button
				onclick={onDeselect}
				class="p-2 rounded-xl border-2 border-secondary bg-secondary/30 hover:bg-accent hover:border-secondary hover:text-secondary text-text-dim transition-all cursor-pointer shrink-0 ml-1 shadow-[2px_2px_0px_#1a0033]"
				title="Désélectionner le niveau"
			>
				<X class="w-5 h-5" />
			</button>
		{/if}
	</div>
</div>
