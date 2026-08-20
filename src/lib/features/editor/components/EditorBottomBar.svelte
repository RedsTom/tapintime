<script lang="ts">
	import { Play, Pause, PlaySquare } from '@lucide/svelte';
	import type { BeatmapEditorState, BeatSnapFraction } from '../beatmapEditorState.svelte';

	let { editor, onTestMap }: { editor: BeatmapEditorState; onTestMap: () => void } = $props();

	const SNAP_OPTIONS: BeatSnapFraction[] = ['1/1', '1/2', '1/4', '1/8', '1/16'];
	const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1.0];

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const ms = Math.floor((seconds % 1) * 1000);
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
	}
</script>

<div class="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t-4 border-secondary px-6 py-3 select-none shadow-[0_-4px_16px_rgba(0,0,0,0.6)]">
	<div class="w-full max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
		<!-- Section Temps & Lecture (Largeur fixe pour zéro bougé de layout) -->
		<div class="flex items-center gap-4 min-w-[240px] shrink-0">
			<button
				onclick={() => editor.togglePlay()}
				class="w-11 h-11 border-4 border-secondary bg-primary text-secondary rounded-lg shadow-[3px_3px_0px_#1a0033] hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer transition-all flex items-center justify-center shrink-0"
				title="Lecture / Pause (Espace)"
			>
				{#if editor.isPlaying}
					<Pause class="w-5 h-5 fill-secondary" />
				{:else}
					<Play class="w-5 h-5 fill-secondary" />
				{/if}
			</button>

			<div class="flex flex-col text-left w-36 tabular-nums shrink-0 select-none">
				<span class="text-xl md:text-2xl font-mono font-black text-primary tracking-wider leading-none">
					{formatTime(editor.currentTime)}
				</span>
				<span class="text-[10px] font-mono font-black text-text-dim uppercase mt-0.5">
					Total: {formatTime(editor.duration || 0)}
				</span>
			</div>
		</div>

		<!-- Sélecteur de Beat Snap (Largeurs fixes) -->
		<div class="flex items-center gap-1.5 bg-secondary/20 p-1.5 border-2 border-secondary rounded-lg shrink-0">
			<span class="text-[10px] font-black uppercase text-text-dim px-1">Snap:</span>
			{#each SNAP_OPTIONS as snap}
				<button
					onclick={() => (editor.beatSnap = snap)}
					class="w-11 py-1 rounded font-mono font-black text-xs uppercase transition-all cursor-pointer border text-center
						{editor.beatSnap === snap ? 'bg-primary text-secondary border-secondary shadow-[2px_2px_0px_#1a0033]' : 'bg-surface text-text border-transparent hover:border-secondary/40'}"
				>
					{snap}
				</button>
			{/each}
		</div>

		<!-- Sélecteur de Vitesse (Largeurs fixes) -->
		<div class="flex items-center gap-1.5 bg-secondary/20 p-1.5 border-2 border-secondary rounded-lg shrink-0">
			<span class="text-[10px] font-black uppercase text-text-dim px-1">Vitesse:</span>
			{#each SPEED_OPTIONS as speed}
				<button
					onclick={() => editor.setPlaybackRate(speed)}
					class="w-12 py-1 rounded font-mono font-black text-xs uppercase transition-all cursor-pointer border text-center
						{editor.playbackRate === speed ? 'bg-accent text-secondary border-secondary shadow-[2px_2px_0px_#1a0033]' : 'bg-surface text-text border-transparent hover:border-secondary/40'}"
				>
					{speed * 100}%
				</button>
			{/each}
		</div>

		<!-- Bouton "TESTER LA MAP" -->
		<button
			onclick={onTestMap}
			class="border-4 border-secondary bg-primary text-secondary px-6 py-2.5 rounded-lg font-black uppercase text-xs md:text-sm tracking-wider shadow-[4px_4px_0px_#ff3366] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer transition-all flex items-center gap-2 shrink-0"
		>
			<PlaySquare class="w-5 h-5 fill-secondary" /> TESTER LA MAP (F5 / T)
		</button>
	</div>
</div>
