<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { Play, Pause, Wrench, Trash2, Trophy, Music, Zap, Sparkles, Key, Lock } from '@lucide/svelte';
	import type { MapInfo } from '../types';
	import type { MapScore, RankGrade } from '../../progression/progression';

	let {
		selectedMap,
		selectedMapScore,
		isMenuAudioPaused,
		activeLayoutName = 'AZERTY',
		unlockedKeyList = ['f', 'j'],
		onStartGame,
		onToggleAudio,
		onEditMap,
		onDeleteMap
	}: {
		selectedMap: MapInfo;
		selectedMapScore?: MapScore;
		isMenuAudioPaused: boolean;
		activeLayoutName?: string;
		unlockedKeyList?: string[];
		onStartGame: () => void;
		onToggleAudio: () => void;
		onEditMap: (id: string) => void;
		onDeleteMap: (id: string) => void;
	} = $props();

	const gradeColors: Record<RankGrade, string> = {
		SS: '#ffc145',
		S: '#80D39B',
		A: '#5995ED',
		B: '#AB47BC',
		C: '#FF9800',
		D: '#f9564f'
	};

	const ALL_PROGRESSION_KEYS = [
		'f', 'j', 'd', 'k', 'g', 'h', 's', 'l', 'a', 'm', 'q', ';',
		'e', 'i', 'r', 'u', 't', 'y', 'c', 'v', 'b', 'n', 'w', 'x', 'z', 'o', 'p'
	];
</script>

<div class="flex flex-col gap-6 select-none">
	<!-- Carte Niveau Sélectionné -->
	<div
		class="p-6 rounded-xl border-4 border-primary bg-secondary/90 backdrop-blur-md shadow-neo flex flex-col gap-6"
	>
		<div class="flex flex-col gap-1 text-left">
			<span class="text-xs font-black uppercase tracking-widest flex items-center gap-1.5 text-accent">
				<Sparkles class="w-3.5 h-3.5" /> NIVEAU SÉLECTIONNÉ
			</span>
			<h1 class="text-3xl font-black uppercase tracking-wide truncate text-primary [text-shadow:_2px_2px_0px_#0a0510]">
				{selectedMap.title}
			</h1>
			<p class="text-base font-bold text-text-dim">
				{selectedMap.artist}
			</p>
		</div>

		<!-- Grille de badges métadonnées -->
		<div class="grid grid-cols-3 gap-3">
			<div class="p-3 rounded border-2 border-secondary bg-bg flex flex-col items-center justify-center text-center">
				<span class="text-[10px] font-black uppercase text-text-dim">BPM</span>
				<span class="text-lg font-black text-primary">{selectedMap.bpm}</span>
			</div>
			<div class="p-3 rounded border-2 border-secondary bg-bg flex flex-col items-center justify-center text-center">
				<span class="text-[10px] font-black uppercase text-text-dim">Notes</span>
				<span class="text-lg font-black text-primary">{selectedMap.noteCount}</span>
			</div>
			<div class="p-3 rounded border-2 border-secondary bg-bg flex flex-col items-center justify-center text-center">
				<span class="text-[10px] font-black uppercase text-text-dim">Difficulté</span>
				<span class="text-sm font-black text-accent uppercase">{selectedMap.difficulty}</span>
			</div>
		</div>

		<!-- Carte Record Personnel -->
		{#if selectedMapScore}
			<div class="p-4 rounded-lg border-2 border-primary bg-bg flex items-center justify-between text-left">
				<div class="flex flex-col">
					<span class="text-xs font-black uppercase flex items-center gap-1 text-text-dim">
						<Trophy class="w-3.5 h-3.5 text-primary" /> Record Personnel
					</span>
					<span class="text-2xl font-black text-primary">
						{selectedMapScore.score.toLocaleString()} PTS
					</span>
					<span class="text-xs font-bold text-text-dim">
						Précision : {selectedMapScore.accuracy.toFixed(1)}% • Combo : {selectedMapScore.maxCombo}x
					</span>
				</div>

				<div
					class="w-12 h-12 rounded-lg flex items-center justify-center font-black text-2xl border-2 border-primary shadow-[2px_2px_0px_#1a0033]"
					style="
						background-color: #1a0033;
						color: {gradeColors[selectedMapScore.grade]};
					"
				>
					{selectedMapScore.grade}
				</div>
			</div>
		{:else}
			<div class="p-4 rounded-lg border-2 border-dashed border-secondary/40 flex items-center justify-center text-xs font-bold uppercase text-text-dim">
				Non complété
			</div>
		{/if}

		<!-- Bouton Jouer & Actions -->
		<div class="flex flex-col gap-3 items-center">
			<Button variant="primary" size="large" onclick={onStartGame} className="w-full justify-center">
				<Play class="w-5 h-5 fill-current" /> JOUER [ENTER]
			</Button>

			<span class="text-[11px] font-bold uppercase tracking-wider text-text-dim">
				Layout actif : {activeLayoutName.toUpperCase()}
			</span>

			<div class="flex items-center justify-center gap-2 w-full pt-1">
				<Button variant="secondary" size="small" onclick={onToggleAudio}>
					{#if isMenuAudioPaused}
						<Play class="w-3.5 h-3.5" /> ÉCOUTER
					{:else}
						<Pause class="w-3.5 h-3.5" /> PAUSE AUDIO
					{/if}
				</Button>

				{#if selectedMap.id.startsWith('custom_')}
					<Button variant="secondary" size="small" onclick={() => onEditMap(selectedMap.id)} title="Éditer">
						<Wrench class="w-3.5 h-3.5" /> Éditer
					</Button>
					<Button variant="danger" size="small" onclick={() => onDeleteMap(selectedMap.id)} title="Supprimer">
						<Trash2 class="w-3.5 h-3.5" />
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Widget Touches Débloquées -->
	<div class="p-5 rounded-xl border-4 border-primary bg-secondary/90 backdrop-blur-md shadow-neo flex flex-col gap-3 text-left">
		<div class="flex items-center justify-between">
			<span class="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-primary">
				<Key class="w-4 h-4 text-primary" /> TOUCHES DÉBLOQUÉES ({unlockedKeyList.length})
			</span>
			<span class="text-[10px] font-bold uppercase text-text-dim">
				Début : Home Row Index (F, J)
			</span>
		</div>

		<div class="flex flex-wrap gap-1.5">
			{#each ALL_PROGRESSION_KEYS as keyChar}
				{@const isUnlocked = unlockedKeyList.includes(keyChar)}
				<div
					class="w-8 h-8 rounded border-2 flex items-center justify-center font-black text-xs uppercase transition-transform
						{isUnlocked ? 'bg-primary text-secondary border-accent opacity-100' : 'bg-bg text-text-dim border-secondary opacity-40'}"
				>
					{#if isUnlocked}
						{keyChar}
					{:else}
						<Lock class="w-3 h-3 text-text-dim" />
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
