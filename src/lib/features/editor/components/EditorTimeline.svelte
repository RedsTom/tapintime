<script lang="ts">
	import type { BeatmapEditorState } from '../beatmapEditorState.svelte';
	import { getFingerColorForKey, isColorDark } from '$lib/fingerColors';
	import { _ } from '$lib/i18n';
	import { ZoomIn, ZoomOut } from '@lucide/svelte';

	let { editor }: { editor: BeatmapEditorState } = $props();

	let timelineContainer: HTMLDivElement | undefined = $state();

	// Échelle de vue : fenêtre visible en secondes selon le niveau de zoom
	const visibleWindowSec = $derived(Math.max(2, 30 / Math.max(1, editor.zoomLevel)));

	// Calcul du début de la fenêtre visible de manière à ce que la tête de lecture reste toujours visible
	const windowStartSec = $derived.by(() => {
		const half = visibleWindowSec / 2;
		let start = editor.currentTime - half;
		if (start < 0) start = 0;
		if (editor.duration > 0 && start + visibleWindowSec > editor.duration) {
			start = Math.max(0, editor.duration - visibleWindowSec);
		}
		return start;
	});

	const windowEndSec = $derived(windowStartSec + visibleWindowSec);

	// Optimisation : Filtrer uniquement les notes visibles dans la fenêtre actuelle pour un rendu ultra-rapide (O(1) au lieu de O(N))
	const visibleNotes = $derived.by(() => {
		const startMs = (windowStartSec - 0.5) * 1000;
		const endMs = (windowEndSec + 0.5) * 1000;
		const list: { note: (typeof editor.hitObjects)[0]; originalIndex: number }[] = [];

		for (let i = 0; i < editor.hitObjects.length; i++) {
			const n = editor.hitObjects[i];
			if (n.time >= startMs && n.time <= endMs) {
				list.push({ note: n, originalIndex: i });
			}
		}
		return list;
	});

	// Génération des graduations de mesure et de subdivisions (Grid ticks)
	const gridTicks = $derived.by(() => {
		const ticks: { timeSec: number; ratio: number; isMajor: boolean; label?: string }[] = [];
		if (visibleWindowSec <= 0) return ticks;

		const intervalMs = editor.getSnapIntervalMs();
		const beatMs = 60000 / Math.max(1, editor.bpm);
		const intervalSec = intervalMs / 1000;
		const offsetSec = (editor.audioOffset || 0) / 1000;

		const startTickIndex = Math.floor((windowStartSec - offsetSec) / intervalSec);
		const endTickIndex = Math.ceil((windowEndSec - offsetSec) / intervalSec);

		for (let i = startTickIndex; i <= endTickIndex; i++) {
			const timeSec = offsetSec + i * intervalSec;
			if (timeSec < 0) continue;

			const ratio = (timeSec - windowStartSec) / visibleWindowSec;
			if (ratio >= 0 && ratio <= 1) {
				const isMajor = Math.abs((timeSec - offsetSec) % (beatMs / 1000)) < 0.001;
				const beatNum = Math.round((timeSec - offsetSec) / (beatMs / 1000)) + 1;
				ticks.push({
					timeSec,
					ratio,
					isMajor,
					label: isMajor && beatNum > 0 ? `${beatNum}` : undefined
				});
			}
		}

		return ticks;
	});

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		const ms = Math.floor((seconds % 1) * 1000);
		return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
	}

	function handleTimelineClick(e: MouseEvent) {
		if (!timelineContainer) return;
		const rect = timelineContainer.getBoundingClientRect();
		const clickRatio = (e.clientX - rect.left) / rect.width;
		const targetSec = windowStartSec + clickRatio * visibleWindowSec;
		
		// Alignement magnétique au grid snap
		const snappedMs = editor.snapToGrid(Math.round(targetSec * 1000));
		editor.seekTo(snappedMs / 1000);
	}

	function handleWheel(e: WheelEvent) {
		if (e.ctrlKey || e.metaKey) {
			e.preventDefault();
			if (e.deltaY < 0) {
				editor.zoomLevel = Math.min(20, editor.zoomLevel + 1);
			} else {
				editor.zoomLevel = Math.max(1, editor.zoomLevel - 1);
			}
		} else {
			e.preventDefault();
			const scrollDeltaSec = (e.deltaY / 100) * (visibleWindowSec / 4);
			editor.seekTo(editor.currentTime + scrollDeltaSec);
		}
	}
</script>

<div class="bg-surface border-4 border-secondary p-5 rounded-xl shadow-[6px_6px_0px_#1a0033] flex flex-col gap-3 select-none">
	<!-- En-tête de la timeline avec boutons de zoom -->
	<div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-secondary pb-2">
		<div class="flex items-center gap-3">
			<h3 class="text-sm font-black uppercase text-primary tracking-wider">{$_('beatmap_editor.zoomable_timeline')}</h3>
			<span class="text-xs font-mono font-black text-accent bg-secondary/30 px-2 py-0.5 border border-secondary rounded">
				{formatTime(editor.currentTime)} / {formatTime(editor.duration || 0)}
			</span>
		</div>

		<!-- Contrôles de Zoom -->
		<div class="flex items-center gap-2">
			<span class="text-[10px] font-black uppercase text-text-dim">Zoom: {editor.zoomLevel}x</span>
			<button
				onclick={() => (editor.zoomLevel = Math.max(1, editor.zoomLevel - 1))}
				class="p-1 rounded border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 text-text cursor-pointer transition-all"
				title="Dézoomer"
			>
				<ZoomOut class="w-3.5 h-3.5" />
			</button>
			<input
				type="range"
				min="1"
				max="20"
				bind:value={editor.zoomLevel}
				class="w-20 accent-primary cursor-pointer"
			/>
			<button
				onclick={() => (editor.zoomLevel = Math.min(20, editor.zoomLevel + 1))}
				class="p-1 rounded border-2 border-secondary bg-secondary/20 hover:bg-secondary/40 text-text cursor-pointer transition-all"
				title="Zoomer"
			>
				<ZoomIn class="w-3.5 h-3.5" />
			</button>
		</div>
	</div>

	<!-- Zone interactive de timeline avec défilement à la molette -->
	<div
		bind:this={timelineContainer}
		onwheel={handleWheel}
		onclick={handleTimelineClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				handleTimelineClick(e as any);
			}
		}}
		role="button"
		tabindex="0"
		aria-label="Timeline"
		class="w-full h-24 bg-bg border-4 border-secondary rounded-lg relative overflow-hidden cursor-pointer select-none"
	>
		<!-- Graduations de la Grille (Beat Snap Ticks) -->
		{#each gridTicks as tick}
			<div
				class="absolute top-0 bottom-0 pointer-events-none transition-opacity
					{tick.isMajor ? 'w-0.5 bg-primary/40' : 'w-[1px] bg-secondary/60'}"
				style="left: {tick.ratio * 100}%"
			>
				{#if tick.label}
					<span class="absolute top-1 left-1 text-[9px] font-mono font-black text-primary/70 select-none">
						{tick.label}
					</span>
				{/if}
			</div>
		{/each}

		<!-- Marqueurs de Notes (Uniquement les notes visibles) -->
		{#each visibleNotes as { note, originalIndex } (originalIndex)}
			{@const noteTimeSec = note.time / 1000}
			{@const ratio = (noteTimeSec - windowStartSec) / visibleWindowSec}
			{@const isSelected = editor.selectedIndex === originalIndex}
			{@const fingerColor = getFingerColorForKey(note.char)}
			{@const lightText = isColorDark(fingerColor)}

			<button
				onclick={(e) => {
					e.stopPropagation();
					editor.selectedIndex = originalIndex;
					editor.seekTo(noteTimeSec);
				}}
				class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-lg border-3 font-mono font-black text-sm uppercase flex items-center justify-center transition-transform z-10 hover:scale-115 cursor-pointer shadow-[2px_2px_0px_#1a0033]
					{isSelected ? 'border-primary ring-4 ring-primary scale-125 z-30 shadow-[4px_4px_0px_#ff3366]' : 'border-secondary z-10'}"
				style="left: {ratio * 100}%; background-color: {fingerColor}; color: {lightText ? '#ffffff' : '#150029'};"
				title="Note '{note.char.toUpperCase()}' à {note.time}ms (Clic pour éditer)"
			>
				{note.char.toUpperCase()}
			</button>
		{/each}

		<!-- Curseur de lecture (Playhead Needle) -->
		{#if (editor.currentTime - windowStartSec) / visibleWindowSec >= 0 && (editor.currentTime - windowStartSec) / visibleWindowSec <= 1}
			{@const playheadRatio = (editor.currentTime - windowStartSec) / visibleWindowSec}
			<div
				class="absolute top-0 bottom-0 w-1 bg-accent z-40 shadow-[0_0_10px_#ff3366] pointer-events-none"
				style="left: {playheadRatio * 100}%"
			>
				<div class="w-3 h-3 bg-accent rotate-45 -translate-x-1 -translate-y-1 border border-secondary"></div>
			</div>
		{/if}
	</div>

	<!-- Légende des informations de vue -->
	<div class="flex items-center justify-between text-[10px] font-mono font-black text-text-dim uppercase">
		<span>{$_('beatmap_editor.visible_window', { values: { time: visibleWindowSec.toFixed(1), count: visibleNotes.length } })}</span>
		<span>BPM: {editor.bpm} | Snap: {editor.beatSnap} ({editor.getSnapIntervalMs().toFixed(1)}ms)</span>
	</div>
</div>
